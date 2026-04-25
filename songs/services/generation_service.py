from django.db import transaction
from songs.models import (
    User,
    MusicGenerationRequest,
    Song,
    GenerationJob,
    GenerationStatus,
)
from songs.generation.factory import get_generator


def start_generation(payload: dict):
    user = User.objects.get(pk=payload["user_id"])
    with transaction.atomic():
        req = MusicGenerationRequest(
            user=user,
            title=payload.get("title", ""),
            custom_lyrics=payload.get("custom_lyrics"),
            mood=payload["mood"],
            genre=payload["genre"],
            occasion=payload["occasion"],
            voice_type=payload["voice_type"],
            is_retry=payload.get("is_retry", False),
        )
        req.full_clean()
        req.save()
        generator = get_generator()
        result = generator.start(req)
        job = GenerationJob(
            request=req,
            provider=generator.provider_name,
            task_id=result.task_id,
            status=result.status,
            audio_url=result.audio_url,
            raw_response=result.raw,
            error_message=result.error,
        )
        job.full_clean()
        job.save()
        song = Song(
            user=user,
            generation_request=req,
            generation_job=job,
            title=req.title,
            custom_lyrics=req.custom_lyrics,
            mood=req.mood,
            genre=req.genre,
            occasion=req.occasion,
            voice_type=req.voice_type,
            status=result.status,
            audio_file_path=result.audio_url,
            is_public=payload.get("is_public", False),
        )
        song.full_clean()
        song.save()
    return job, song


def poll_generation(job_id: int):
    job = GenerationJob.objects.select_related("request", "song", "request__user").get(pk=job_id)
    generator = get_generator(job.provider)
    result = generator.poll(job)
    with transaction.atomic():
        job.status = result.status
        job.audio_url = result.audio_url or job.audio_url
        job.raw_response = result.raw
        job.error_message = result.error
        job.save()
        if job.song:
            job.song.status = result.status
            job.song.audio_file_path = result.audio_url or job.song.audio_file_path
            job.song.save()
    return job, job.song
