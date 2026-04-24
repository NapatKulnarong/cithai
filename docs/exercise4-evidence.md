# Exercise 4 Demonstration Evidence

This file records concrete evidence for the Strategy Pattern deliverables in Exercise 4.

## 1. Mock Strategy Evidence

Command used:

```bash
GENERATOR_STRATEGY=mock python3 manage.py shell <<'PY'
import json
from songs.models import User
from songs.services.generation_service import start_generation

user, _ = User.objects.get_or_create(
    email="exercise4-mock@example.com",
    defaults={"name": "Exercise 4 Mock"},
)
job, song = start_generation({
    "user_id": user.id,
    "title": "Mock Demo",
    "mood": "HAPPY",
    "genre": "POP",
    "occasion": "BIRTHDAY",
    "voice_type": "FEMALE",
})
print(json.dumps({
    "job": {
        "provider": job.provider,
        "status": job.status,
        "task_id": job.task_id,
        "audio_url": job.audio_url,
    },
    "song": {
        "title": song.title,
        "status": song.status,
        "audio_file_path": song.audio_file_path,
    },
}, indent=2))
PY
```

Captured output:

```json
{
  "job": {
    "provider": "mock",
    "status": "COMPLETE",
    "task_id": null,
    "audio_url": "https://example.com/mock.mp3"
  },
  "song": {
    "title": "Mock Demo",
    "status": "COMPLETE",
    "audio_file_path": "https://example.com/mock.mp3"
  }
}
```

This demonstrates that the mock strategy runs offline, deterministically, and produces a predictable audio URL.

## 2. Suno Strategy Evidence

The command below exercises the Suno strategy end to end while mocking the HTTP layer. This proves the strategy code creates and stores a `taskId`, then retrieves status/details through the polling path without requiring a committed secret in the repository.

Command used:

```bash
GENERATOR_STRATEGY=suno \
SUNO_API_TOKEN=test-token \
SUNO_API_BASE=https://api.suno.test \
python3 manage.py shell <<'PY'
import json
from unittest.mock import Mock, patch
from songs.models import User
from songs.services.generation_service import start_generation, poll_generation

user, _ = User.objects.get_or_create(
    email="exercise4-suno@example.com",
    defaults={"name": "Exercise 4 Suno"},
)

post_response = Mock(status_code=200)
post_response.json.return_value = {"data": {"taskId": "task-demo-123"}}
get_response = Mock(status_code=200)
get_response.json.return_value = {
    "data": [
        {
            "status": "SUCCESS",
            "clips": [{"audio_url": "https://cdn.example.com/demo-song.mp3"}],
        }
    ]
}

with patch("songs.generation.suno.requests.post", return_value=post_response), \
     patch("songs.generation.suno.requests.get", return_value=get_response):
    job, song = start_generation({
        "user_id": user.id,
        "title": "Suno Demo",
        "mood": "HAPPY",
        "genre": "POP",
        "occasion": "BIRTHDAY",
        "voice_type": "FEMALE",
        "custom_lyrics": "Demo lyrics for Suno strategy",
    })
    polled_job, polled_song = poll_generation(job.id)

print(json.dumps({
    "start": {
        "provider": job.provider,
        "status": job.status,
        "task_id": job.task_id,
    },
    "poll": {
        "provider": polled_job.provider,
        "status": polled_job.status,
        "task_id": polled_job.task_id,
        "audio_url": polled_job.audio_url,
    },
    "song": {
        "title": polled_song.title,
        "status": polled_song.status,
        "audio_file_path": polled_song.audio_file_path,
    },
}, indent=2))
PY
```

Captured output:

```json
{
  "start": {
    "provider": "suno",
    "status": "PROCESSING",
    "task_id": "task-demo-123"
  },
  "poll": {
    "provider": "suno",
    "status": "COMPLETE",
    "task_id": "task-demo-123",
    "audio_url": "https://cdn.example.com/demo-song.mp3"
  },
  "song": {
    "title": "Suno Demo",
    "status": "COMPLETE",
    "audio_file_path": "https://cdn.example.com/demo-song.mp3"
  }
}
```

This demonstrates the required Suno behavior:

- generation starts through the Suno strategy
- the returned `taskId` is stored on `GenerationJob`
- polling uses the stored provider and `taskId`
- status/details are retrieved and persisted back onto the song/job

## 3. Live Suno Rerun

To rerun the same flow against the real Suno API, replace the token and remove the mocked HTTP layer by using the JSON API directly:

```bash
export GENERATOR_STRATEGY=suno
export SUNO_API_TOKEN=your_real_token_here

curl -X POST http://localhost:8000/api/generate/ \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"title":"Live Suno Demo","mood":"HAPPY","genre":"POP","occasion":"BIRTHDAY","voice_type":"FEMALE"}'

curl http://localhost:8000/api/generate/<job_id>/
```

The first call should return a `task_id`; the second call should return the refreshed status/details for that task.

## 4. Automated Verification

Command used:

```bash
python3 manage.py test songs.tests
```

Captured output:

```text
Creating test database for alias 'default'...
................
----------------------------------------------------------------------
Ran 16 tests in 0.043s

OK
Destroying test database for alias 'default'...
Found 16 test(s).
System check identified no issues (0 silenced).
```

The test suite covers:

- factory selection for `mock` and `suno`
- deterministic mock generation
- Suno task creation and polling behavior
- missing-token and missing-`task_id` error handling
- service-layer persistence
- regression coverage ensuring polling uses the job's stored provider
