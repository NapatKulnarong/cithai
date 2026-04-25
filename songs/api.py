import json
import secrets

from django.conf import settings
from django.http import JsonResponse, HttpResponseNotAllowed
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt

from .models import Song, User, MusicGenerationRequest, GenerationJob, GenerationStatus, ShareLink
from .services.generation_service import start_generation, poll_generation


def serialize_song(song: Song) -> dict:
    return {
        "id": song.id,
        "title": song.title,
        "custom_lyrics": song.custom_lyrics,
        "duration": float(song.duration) if song.duration is not None else None,
        "is_shared": song.is_shared,
        "is_public": song.is_public,
        "creation_date": song.creation_date.isoformat(),
        "audio_file_path": song.audio_file_path,
        "status": song.status,
        "mood": song.mood,
        "genre": song.genre,
        "occasion": song.occasion,
        "voice_type": song.voice_type,
        "user_id": song.user_id,
        "generation_request_id": song.generation_request_id,
        "generation_job_id": song.generation_job_id,
    }
    
def serialize_job(job: GenerationJob) -> dict:
    return {
        "id": job.id,
        "provider": job.provider,
        "task_id": job.task_id,
        "status": job.status,
        "audio_url": job.audio_url,
        "error_message": job.error_message,
        "request_id": job.request_id,
        "raw_response": job.raw_response,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def serialize_share_link(share_link: ShareLink) -> dict:
    return {
        "token": share_link.token,
        "is_active": share_link.is_active,
        "created_at": share_link.created_at.isoformat(),
        "share_path": f"/share/{share_link.token}",
        "song": serialize_song(share_link.song),
    }


def serialize_backend() -> dict:
    return {
        "baseUrl": getattr(settings, "APP_BASE_URL", "http://127.0.0.1:8000"),
        "strategy": getattr(settings, "GENERATOR_STRATEGY", "mock"),
    }

def parse_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


@csrf_exempt
def song_list_create(request):
    if request.method == "GET":
        songs = Song.objects.all().order_by("-creation_date")
        data = [serialize_song(s) for s in songs]
        return JsonResponse(data, safe=False)

    if request.method == "POST":
        payload = parse_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        try:
            user = User.objects.get(pk=payload.get("user_id"))
        except (User.DoesNotExist, TypeError, ValueError):
            return JsonResponse({"error": "user_id is required and must exist"}, status=400)

        generation_request = None
        gen_req_id = payload.get("generation_request_id")
        if gen_req_id is not None:
            try:
                generation_request = MusicGenerationRequest.objects.get(pk=gen_req_id)
            except MusicGenerationRequest.DoesNotExist:
                return JsonResponse({"error": "generation_request_id does not exist"}, status=400)

        song = Song(
            user=user,
            generation_request=generation_request,
            title=payload.get("title") or "",
            custom_lyrics=payload.get("custom_lyrics"),
            duration=payload.get("duration"),
            is_shared=payload.get("is_shared", False),
            audio_file_path=payload.get("audio_file_path"),
            status=payload.get("status", Song._meta.get_field("status").default),
            mood=payload.get("mood"),
            genre=payload.get("genre"),
            occasion=payload.get("occasion"),
            voice_type=payload.get("voice_type"),
        )

        try:
            song.full_clean()
            song.save()
        except Exception as exc:  # broad but surfaces validation errors cleanly
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(serialize_song(song), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
def bootstrap(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    return JsonResponse({"backend": serialize_backend()})


@csrf_exempt
def song_detail(request, pk: int):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Song not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(serialize_song(song))

    if request.method in ("PUT", "PATCH"):
        payload = parse_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        for field in [
            "title",
            "custom_lyrics",
            "duration",
            "is_shared",
            "is_public",
            "audio_file_path",
            "status",
            "mood",
            "genre",
            "occasion",
            "voice_type",
        ]:
            if field in payload:
                setattr(song, field, payload[field])

        if "user_id" in payload:
            try:
                song.user = User.objects.get(pk=payload["user_id"])
            except (User.DoesNotExist, TypeError, ValueError):
                return JsonResponse({"error": "user_id must exist"}, status=400)

        if "generation_request_id" in payload:
            gen_req_val = payload["generation_request_id"]
            if gen_req_val is None:
                song.generation_request = None
            else:
                try:
                    song.generation_request = MusicGenerationRequest.objects.get(pk=gen_req_val)
                except MusicGenerationRequest.DoesNotExist:
                    return JsonResponse({"error": "generation_request_id does not exist"}, status=400)

        try:
            song.full_clean()
            song.save()
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(serialize_song(song))

    if request.method == "DELETE":
        song.delete()
        return JsonResponse({"status": "deleted"})

    return HttpResponseNotAllowed(["GET", "PUT", "PATCH", "DELETE"])


# ── Users (minimal) ───────────────────────────────────────────────────────────


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


@csrf_exempt
def user_list_create(request):
    if request.method == "GET":
        users = User.objects.all().order_by("id")
        return JsonResponse([serialize_user(u) for u in users], safe=False)

    if request.method == "POST":
        payload = parse_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        user = User(name=payload.get("name", ""), email=payload.get("email", ""))
        try:
            user.full_clean()
            user.save()
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(serialize_user(user), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
def user_detail(request, pk: int):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(serialize_user(user))

    if request.method in ("PUT", "PATCH"):
        payload = parse_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if "name" in payload:
            user.name = payload["name"]
        if "email" in payload:
            user.email = payload["email"]

        try:
            user.full_clean()
            user.save()
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(serialize_user(user))

    if request.method == "DELETE":
        user.delete()
        return JsonResponse({"status": "deleted"})

    return HttpResponseNotAllowed(["GET", "PUT", "PATCH", "DELETE"])

@csrf_exempt
def generate_start(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    payload = parse_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    try:
        job, song = start_generation(payload)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse({"job": serialize_job(job), "song": serialize_song(song)}, status=201)


@csrf_exempt
def generation_job_list(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    jobs = GenerationJob.objects.all().order_by("-created_at")
    return JsonResponse([serialize_job(job) for job in jobs], safe=False)


@csrf_exempt
def generate_poll(request, pk: int):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    try:
        job, song = poll_generation(pk)
    except GenerationJob.DoesNotExist:
        return JsonResponse({"error": "Generation job not found"}, status=404)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse({"job": serialize_job(job), "song": serialize_song(song)})


@csrf_exempt
def song_share(request, pk: int):
    try:
        song = Song.objects.get(pk=pk)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Song not found"}, status=404)

    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = parse_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    try:
        viewer = User.objects.get(pk=payload.get("viewer_id"))
    except (User.DoesNotExist, TypeError, ValueError):
        return JsonResponse({"error": "viewer_id is required and must exist"}, status=400)

    can_share = song.user_id == viewer.id or song.is_shared
    if not can_share:
        return JsonResponse({"error": "You do not have access to share this song."}, status=403)

    if song.status != GenerationStatus.COMPLETE or not song.audio_file_path:
        return JsonResponse({"error": "Only completed songs with audio can be shared."}, status=400)

    with transaction.atomic():
        if song.user_id == viewer.id and not song.is_shared:
            song.is_shared = True
            song.save(update_fields=["is_shared"])

        share_link, created = ShareLink.objects.get_or_create(
            song=song,
            defaults={"token": secrets.token_urlsafe(24)},
        )

        if not share_link.is_active:
            share_link.is_active = True
            share_link.save(update_fields=["is_active"])

    return JsonResponse(serialize_share_link(share_link), status=201 if created else 200)


def share_link_detail(request, token: str):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    try:
        share_link = ShareLink.objects.select_related("song").get(token=token, is_active=True)
    except ShareLink.DoesNotExist:
        return JsonResponse({"error": "Share link not found"}, status=404)

    return JsonResponse(serialize_share_link(share_link))


def _extract_callback_task_id(payload: dict) -> str | None:
    data = payload.get("data")
    if isinstance(data, dict):
        return data.get("task_id") or data.get("taskId")
    return None


def _extract_callback_audio_url(payload: dict) -> str | None:
    data = payload.get("data")
    if not isinstance(data, dict):
        return None

    tracks = data.get("data")
    if not isinstance(tracks, list):
        return None

    for track in tracks:
        if isinstance(track, dict) and track.get("audio_url"):
            return track["audio_url"]

    return None


def _status_from_callback(payload: dict) -> tuple[str, str | None]:
    code = payload.get("code")
    msg = payload.get("msg")
    data = payload.get("data")
    callback_type = data.get("callbackType") if isinstance(data, dict) else None

    if callback_type in {"text", "first"}:
        return GenerationStatus.PROCESSING, None

    if code == 200 and callback_type == "complete":
        return GenerationStatus.COMPLETE, None

    if code == 200 and callback_type not in {"error"}:
        return GenerationStatus.PROCESSING, None

    return GenerationStatus.FAILED, msg or "Suno callback reported failure"


@csrf_exempt
def suno_callback(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = parse_body(request)
    if payload is None:
        return JsonResponse({"status": "ignored"}, status=200)

    task_id = _extract_callback_task_id(payload)
    if not task_id:
        return JsonResponse({"status": "ignored"}, status=200)

    try:
        job = GenerationJob.objects.select_related("song").get(task_id=task_id)
    except GenerationJob.DoesNotExist:
        return JsonResponse({"status": "unknown-task"}, status=200)

    status, error_message = _status_from_callback(payload)
    audio_url = _extract_callback_audio_url(payload)

    with transaction.atomic():
        job.status = status
        job.audio_url = audio_url or job.audio_url
        job.error_message = error_message
        job.raw_response = payload
        job.save()

        if job.song:
            job.song.status = status
            job.song.audio_file_path = audio_url or job.song.audio_file_path
            job.song.save()

    return JsonResponse({"status": "received"})
