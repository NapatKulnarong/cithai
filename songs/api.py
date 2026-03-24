import json

from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt

from .models import Song, User, MusicGenerationRequest


def serialize_song(song: Song) -> dict:
    return {
        "id": song.id,
        "title": song.title,
        "custom_lyrics": song.custom_lyrics,
        "duration": float(song.duration) if song.duration is not None else None,
        "is_shared": song.is_shared,
        "creation_date": song.creation_date.isoformat(),
        "audio_file_path": song.audio_file_path,
        "status": song.status,
        "mood": song.mood,
        "genre": song.genre,
        "occasion": song.occasion,
        "voice_type": song.voice_type,
        "user_id": song.user_id,
        "generation_request_id": song.generation_request_id,
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
