from __future__ import annotations

import requests
from requests import RequestException
from django.conf import settings
from songs.models import GenerationStatus, MusicGenerationRequest, GenerationJob
from .base import SongGenerator, GenerationResult


def _status_map(suno_status: str) -> str:
    suno_status = (suno_status or "").upper()
    if suno_status in {"SUCCESS"}:
        return GenerationStatus.COMPLETE
    if suno_status in {"PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"}:
        return GenerationStatus.PROCESSING
    return GenerationStatus.FAILED


def _parse_json_response(response: requests.Response) -> dict:
    try:
        payload = response.json()
    except ValueError:
        return {"error": "Invalid JSON from Suno", "text": response.text}
    return payload if isinstance(payload, dict) else {"data": payload}


def _extract_task_id(payload: dict) -> str | None:
    response_data = payload.get("data")
    if isinstance(response_data, dict):
        return response_data.get("taskId") or response_data.get("task_id")
    return payload.get("taskId")


def _extract_record(payload: dict) -> dict:
    data = payload.get("data")
    if isinstance(data, list):
        return data[0] if data and isinstance(data[0], dict) else {}
    if not isinstance(data, dict):
        return {}

    response = data.get("response")
    if isinstance(response, dict):
        response_data = response.get("data")
        if isinstance(response_data, list):
            if response_data and isinstance(response_data[0], dict):
                return {**data, **response_data[0]}
        elif isinstance(response_data, dict):
            return {**data, **response_data}

        suno_data = response.get("sunoData")
        if isinstance(suno_data, list) and suno_data and isinstance(suno_data[0], dict):
            return {**data, **suno_data[0]}

    return data


def _extract_audio_url(record: dict) -> str | None:
    if record.get("audio_url"):
        return record["audio_url"]
    if record.get("audioUrl"):
        return record["audioUrl"]

    clips = record.get("clips")
    if isinstance(clips, list):
        for clip in clips:
            if isinstance(clip, dict) and clip.get("audio_url"):
                return clip["audio_url"]
            if isinstance(clip, dict) and clip.get("audioUrl"):
                return clip["audioUrl"]

    response = record.get("response")
    if isinstance(response, dict):
        if response.get("audio_url"):
            return response["audio_url"]
        if response.get("audioUrl"):
            return response["audioUrl"]

        response_data = response.get("data")
        if isinstance(response_data, list):
            for item in response_data:
                if isinstance(item, dict) and item.get("audio_url"):
                    return item["audio_url"]
                if isinstance(item, dict) and item.get("audioUrl"):
                    return item["audioUrl"]

        suno_data = response.get("sunoData")
        if isinstance(suno_data, list):
            for item in suno_data:
                if isinstance(item, dict) and item.get("audio_url"):
                    return item["audio_url"]
                if isinstance(item, dict) and item.get("audioUrl"):
                    return item["audioUrl"]

    return None


def _extract_status(record: dict) -> str | None:
    return record.get("status") or record.get("successFlag")


def _extract_error_message(record: dict) -> str | None:
    return record.get("errorMessage") or record.get("error_message")


class SunoSongGenerator(SongGenerator):
    provider_name = "suno"

    def __init__(self):
        token = getattr(settings, "SUNO_API_TOKEN", None)
        if not token:
            raise ValueError("SUNO_API_TOKEN is required for Suno strategy")
        self.base = getattr(settings, "SUNO_API_BASE", "https://api.sunoapi.org")
        self.model = getattr(settings, "SUNO_MODEL", "V3_5")
        callback_url = getattr(settings, "SUNO_CALLBACK_URL", "")
        if not callback_url:
            app_base_url = getattr(settings, "APP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
            callback_url = f"{app_base_url}/api/suno/callback/"
        self.callback_url = callback_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _build_prompt(self, request: MusicGenerationRequest) -> str:
        if request.custom_lyrics:
            return request.custom_lyrics
        return (
            f"{request.genre} {request.mood} song for {request.occasion} "
            f"with a {request.voice_type.lower()} performance"
        )

    def start(self, request: MusicGenerationRequest) -> GenerationResult:
        url = f"{self.base}/api/v1/generate"
        payload = {
            "title": request.title,
            "prompt": self._build_prompt(request),
            "model": self.model,
            "mv": "chirp-v3-5",
            "customMode": False,
            "instrumental": False,
            "callBackUrl": self.callback_url,
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=15)
        except RequestException as exc:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                raw={"provider": self.provider_name},
                error=str(exc),
            )

        data = _parse_json_response(response)

        if response.status_code >= 400 or data.get("code") not in (None, 0, 200):
            msg = data.get("msg") or data.get("error") or "Generation failed"
            return GenerationResult(
                status=GenerationStatus.FAILED,
                raw=data,
                error=msg,
            )

        task_id = _extract_task_id(data)
        if not task_id:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                raw=data,
                error="taskId missing in response",
            )

        return GenerationResult(
            status=GenerationStatus.PROCESSING,
            task_id=task_id,
            audio_url=None,
            raw=data,
        )

    def poll(self, job: GenerationJob) -> GenerationResult:
        if not job.task_id:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                task_id=None,
                raw={"provider": self.provider_name},
                error="Cannot poll Suno job without task_id",
            )

        url = f"{self.base}/api/v1/generate/record-info"
        params = {"taskId": job.task_id}
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=15)
        except RequestException as exc:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                task_id=job.task_id,
                raw={"provider": self.provider_name},
                error=str(exc),
            )

        data = _parse_json_response(response)
        if response.status_code >= 400 or data.get("code") not in (None, 0, 200):
            msg = data.get("msg") or data.get("error") or "Polling failed"
            return GenerationResult(
                status=GenerationStatus.FAILED,
                task_id=job.task_id,
                raw=data,
                error=msg,
            )

        record = _extract_record(data)
        suno_status = _extract_status(record)
        status = _status_map(suno_status)
        audio_url = _extract_audio_url(record)
        error_message = _extract_error_message(record)
        return GenerationResult(
            status=status,
            task_id=job.task_id,
            audio_url=audio_url,
            raw=data,
            error=None if status != GenerationStatus.FAILED else error_message or f"Unexpected Suno status: {suno_status or 'UNKNOWN'}",
        )
