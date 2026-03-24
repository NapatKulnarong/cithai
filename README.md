# Cithai — Domain Layer (Exercise 3)

## Project Info
- Repo: https://github.com/NapatKulnarong/cithai.git
- Django: 5.2.8 (see `requirements.txt`)

## Quick Start (Docker — recommended)
```bash
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
