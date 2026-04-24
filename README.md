# Cithai — Domain Layer + Strategy Pattern (Exercise 4)

Cithai is an AI Music Generation Platform that gives users an intuitive interface to create custom songs from structured prompts (title, occasion, genre, voice type, mood, optional lyrics). Inputs are processed to generate unique compositions, and users manage their catalog via a personal library. This repo now covers both the Exercise 3 domain/back-end layer and the Exercise 4 Strategy Pattern implementation for interchangeable song generation providers (`mock` and `suno`).

Key benefits:
- Enable users to create personalized music without musical expertise.
- Provide instant music generation for various occasions and moods.
- Offer a simple, accessible interface for creative expression.
- Maintain user privacy with private-by-default song libraries.
- Support content moderation to prevent offensive content generation.
- Handle high traffic volumes (target: 1000+ requests per minute).

## Project Info
- Repo: https://github.com/NapatKulnarong/cithai.git
- Django: 5.2.8 (see `requirements.txt`)

## Install
Set up the backend, frontend, and local secrets separately.

Backend:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

Frontend:
```bash
cd frontend
cp .env.local.example .env.local
npm install
```

Required secrets and external services:
- `SUNO_API_TOKEN`: required only for Suno mode. Put it in your shell, Docker env, or a local `.env` file. Do not commit it.
- `AUTH_SECRET`: required for NextAuth session encryption.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: required for Google login.
- `AUTH_URL`: public frontend URL, usually `http://localhost:3000`.
- `DJANGO_API_BASE`: Django base URL, usually `http://127.0.0.1:8000`.
- Google OAuth callback URL: `http://localhost:3000/api/auth/callback/google`.

## Run
Pick one generator mode and start both apps.

Mock mode:
Backend terminal:
```bash
export GENERATOR_STRATEGY=mock
python manage.py runserver
```
Frontend terminal:
```bash
cd frontend
npm run dev
```
Mock mode does not need a Suno token.

Suno mode:
Backend terminal:
```bash
export GENERATOR_STRATEGY=suno
export SUNO_API_TOKEN=your_real_suno_token
python manage.py runserver
```
Frontend terminal:
```bash
cd frontend
npm run dev
```
If you use Docker Compose, choose the mode with `GENERATOR_STRATEGY`:
```bash
GENERATOR_STRATEGY=mock docker compose up --build
GENERATOR_STRATEGY=suno SUNO_API_TOKEN=your_real_suno_token docker compose up --build
```

## Exercise 4 Deliverables
- Strategy interface: `songs/generation/base.py`
- Mock strategy: `songs/generation/mock.py`
- Suno strategy: `songs/generation/suno.py`
- Centralized selection mechanism: `songs/generation/factory.py` via `GENERATOR_STRATEGY=mock|suno`
- Application service using the active strategy: `songs/services/generation_service.py`
- JSON endpoints for starting and polling generation: `/api/generate/` and `/api/generate/<job_id>/`
- Demonstration evidence: [`docs/exercise4-evidence.md`](./docs/exercise4-evidence.md)

## Quick Start (Docker — recommended)
```bash
export GENERATOR_STRATEGY=mock
docker compose up --build
docker compose exec web python manage.py createsuperuser
```
Visit http://localhost:8000/admin

## Quick Start (Local)
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Frontend (Next.js)
The repo now includes a dedicated Next.js frontend in [`frontend/`](./frontend) with a full music dashboard, generator form, queue polling, and audio player.

Run it in a second terminal after Django is up:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend proxies requests to Django through Next route handlers, using `DJANGO_API_BASE` from `frontend/.env.local`.
Google login is now required before the dashboard can be used. Configure `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`, and register `http://localhost:3000/api/auth/callback/google` as the Google OAuth callback URL. For real song generation, also provide `SUNO_API_TOKEN` to the Django process or Docker Compose environment.

## Useful Docker Commands
- Start: `docker compose up --build` (add `-d` to detach)
- Stop: `docker compose down`
- Logs: `docker compose logs -f web`
- Shell: `docker compose exec web sh`
- Rebuild: `docker compose up --build`

## Common manage.py (Docker)
- Migrate: `docker compose exec web python manage.py migrate`
- Make migrations: `docker compose exec web python manage.py makemigrations`
- Superuser: `docker compose exec web python manage.py createsuperuser`

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `DJANGO_SECRET_KEY` | dev-secret-key-change-in-production | Django secret |
| `DEBUG` | True | Debug mode |
| `GENERATOR_STRATEGY` | `mock` | Active song-generation strategy: `mock` or `suno` |
| `SUNO_API_TOKEN` | empty | Suno bearer token. Keep this in shell env or Docker env only. Never commit it. |
| `SUNO_API_BASE` | `https://api.sunoapi.org` | Suno API base URL |
| `SUNO_MODEL` | `V3_5` | Model name sent to the generate endpoint |
| `SUNO_CALLBACK_URL` | empty | Optional callback URL. Polling works without it. |

SQLite is the default. If you switch to Postgres, add the usual `POSTGRES_*` envs and update `DATABASES` in `cithai/settings.py`.

## Troubleshooting
- Reset local DB: `rm db.sqlite3 && python manage.py migrate`
- Reset Docker volumes: `docker compose down -v && docker compose up --build`
- Static collection: `docker compose exec web python manage.py collectstatic --noinput`

## API (JSON, minimal) — CRUD examples
Replace IDs with your own. Responses shown are typical success payloads.

**Users**
- Create (C):
  ```bash
  curl -X POST http://localhost:8000/api/users/ \
    -H "Content-Type: application/json" \
    -d '{"name":"Demo User","email":"demo@example.com"}'
  ```
  → `{"id":1,"name":"Demo User","email":"demo@example.com"}`
- Read list (R):
  ```bash
  curl http://localhost:8000/api/users/
  ```
  → `[{"id":1,"name":"Demo User","email":"demo@example.com"}]`
- Update (U):
  ```bash
  curl -X PATCH http://localhost:8000/api/users/1/ \
    -H "Content-Type: application/json" \
    -d '{"name":"Demo User Updated"}'
  ```
  → `{"id":1,"name":"Demo User Updated","email":"demo@example.com"}`
- Delete (D):
  ```bash
  curl -X DELETE http://localhost:8000/api/users/1/
  ```
  → `{"status":"deleted"}`

**Songs**
- Create (C):
  ```bash
  curl -X POST http://localhost:8000/api/songs/ \
    -H "Content-Type: application/json" \
    -d '{"title":"Demo","mood":"HAPPY","genre":"POP","occasion":"BIRTHDAY","voice_type":"FEMALE","status":"PENDING","user_id":1,"duration":3.50}'
  ```
  → `{"id":1,"title":"Demo",...,"user_id":1}`
- Read list (R):
  ```bash
  curl http://localhost:8000/api/songs/
  ```
  → `[{"id":1,"title":"Demo",...}]`
- Update (U):
  ```bash
  curl -X PATCH http://localhost:8000/api/songs/1/ \
    -H "Content-Type: application/json" \
    -d '{"status":"COMPLETE","is_shared":true}'
  ```
  → `{"id":1,"title":"Demo",...,"status":"COMPLETE","is_shared":true}`
- Delete (D):
  ```bash
  curl -X DELETE http://localhost:8000/api/songs/1/
  ```
  → `{"status":"deleted"}`

## Domain Model Mapping (to Exercise 2)
- `User`: end user of the platform (email, name).
- `MusicGenerationRequest`: structured request input; links to `User`; stores mood/genre/occasion/voice_type, lyrics, retry flag.
- `Song`: core artifact; owned by `User`; optionally linked 1-1 to `MusicGenerationRequest`; status, metadata, audio path; limit of 20 songs per user enforced in `clean()`.
- `ShareLink`: token for sharing a `Song`; 1-1 composition with `Song`, auto timestamps.

## CRUD Evidence
- Django Admin enabled for all entities (`/admin`): create, list, edit, delete Users, Requests, Songs, ShareLinks.
- Data persists to `db.sqlite3` (or container volume) via ORM migrations (`songs/migrations/0001_initial.py`).
- To verify: log into admin with a superuser and perform add/edit/delete on each model; Song creation enforces 20-per-user limit.
- API CRUD: see “API (JSON, minimal)” above; curl examples cover create/list/update/delete for Users and Songs.
- Demo video: https://youtu.be/6MgYV5yJXKM

## Strategy Modes
The Strategy Pattern is implemented behind `get_generator()` so the rest of the codebase does not branch on provider-specific logic. The service layer always stores the real active provider on `GenerationJob`, and polling resolves the strategy from the stored job provider rather than the current process environment.

### Mock Mode
Use this for offline development and deterministic tests.

```bash
export GENERATOR_STRATEGY=mock
```

```bash
curl -X POST http://localhost:8000/api/generate/ \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"title":"Demo","mood":"HAPPY","genre":"POP","occasion":"BIRTHDAY","voice_type":"FEMALE"}'
```

Captured local response:
```json
{
  "job": {
    "provider": "mock",
    "status": "COMPLETE",
    "task_id": null,
    "audio_url": "https://example.com/mock.mp3"
  },
  "song": {
    "title": "Demo",
    "status": "COMPLETE",
    "audio_file_path": "https://example.com/mock.mp3"
  }
}
```

### Suno Mode
Use this to create a real generation task through `https://api.sunoapi.org/api/v1/generate` and poll it through `https://api.sunoapi.org/api/v1/generate/record-info`.

```bash
export GENERATOR_STRATEGY=suno
export SUNO_API_TOKEN=your_real_token_here
curl -X POST http://localhost:8000/api/generate/ \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"title":"Demo","mood":"HAPPY","genre":"POP","occasion":"BIRTHDAY","voice_type":"FEMALE"}'
```

Captured start response shape:
```json
{
  "job": {
    "provider": "suno",
    "status": "PROCESSING",
    "task_id": "task-123456"
  },
  "song": {
    "title": "Demo",
    "status": "PROCESSING"
  }
}
```

Poll for status/details:
```bash
curl http://localhost:8000/api/generate/<job_id>/
```

Captured poll response shape after completion:
```json
{
  "job": {
    "provider": "suno",
    "status": "COMPLETE",
    "task_id": "task-123456",
    "audio_url": "https://cdn.example.com/song.mp3"
  },
  "song": {
    "title": "Demo",
    "status": "COMPLETE",
    "audio_file_path": "https://cdn.example.com/song.mp3"
  }
}
```

Place the Suno API key in a shell export, local `.env` loaded by your own tooling, or the `docker-compose.yml` environment section. Do not commit the real key.

If you use Docker in this repo, set `GENERATOR_STRATEGY=mock` for local testing or `GENERATOR_STRATEGY=suno` plus `SUNO_API_TOKEN` for real generation:

```bash
GENERATOR_STRATEGY=mock docker compose up --build
GENERATOR_STRATEGY=suno SUNO_API_TOKEN=your_real_suno_token docker compose up --build
```

## Demonstration Evidence
Concrete Exercise 4 transcripts are in [`docs/exercise4-evidence.md`](./docs/exercise4-evidence.md).

- Mock mode evidence: real local shell run against the deterministic mock strategy.
- Suno mode evidence: reproducible shell run that exercises the Suno strategy start/poll flow with mocked HTTP responses, plus instructions to rerun the same flow with a real token.
- Automated verification: `python3 manage.py test songs.tests`
