# Cithai — Domain Layer (Exercise 3)

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
