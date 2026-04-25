# Cithai Frontend

This is the Next.js frontend for Cithai. It provides a polished music dashboard on top of the Django backend in the repo root.

## Features
- Responsive music-library dashboard inspired by premium streaming products
- Google login powered by Auth.js
- Song generation composer backed by the Django `/api/generate/` endpoint
- Live generation queue polling
- In-browser audio playback for completed tracks
- Same-origin Next.js API routes that proxy requests to Django
- Automatic Django user provisioning from the signed-in Google account

## Getting Started
Start the Django backend first from the repo root:

```bash
python manage.py runserver
```

Then in this `frontend/` folder:

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before signing in, create a Google OAuth client and set the callback URL to:

```text
http://localhost:3000/api/auth/callback/google
```

Then fill in these auth variables in `.env`:

```bash
AUTH_URL=http://localhost:3000
AUTH_SECRET=replace-this-with-a-long-random-secret
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

## Environment
- `DJANGO_API_BASE`: base URL for the Django app, default `http://127.0.0.1:8000`
- `AUTH_URL`: public URL of the Next.js frontend
- `AUTH_SECRET`: Auth.js session secret
- `AUTH_GOOGLE_ID`: Google OAuth client ID
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` come from a Google Cloud Console OAuth client.
- `AUTH_SECRET` can be any long random string.

## Access Model
- The dashboard redirects unauthenticated visitors to `/login`.
- Every signed-in Google account is synced to the Django `User` model by email.
- The authenticated user can generate songs only into their own library.
- Browse shows other users' songs only when those songs are marked as shared.
- Real Suno generation depends on the backend having `GENERATOR_STRATEGY=suno` and a valid `SUNO_API_TOKEN`. Mock mode uses the local `public/audio/mock.mp3` file.

## Quality Checks
```bash
npm run lint
npm run build
```
