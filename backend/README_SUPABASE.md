# Supabase Setup & Migration Quickstart

This quickstart summarizes the exact commands to finish switching TrueTone to Supabase Postgres.

1) Ensure `backend/.env` exists with `DATABASE_URL` (we created it). Example:

```
DATABASE_URL=postgresql://postgres.yvwckxixixidsgqtwupc:Truetone%402027@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
SECRET_KEY=replace-this-with-a-secret-key
DEBUG=False
```

2) Build the backend Docker image and run Django migrations (recommended):

```bash
# From project/backend
./docker-migrate.sh
# or on Windows PowerShell
./docker-migrate.ps1
```

3) If you need to migrate data from local MySQL, see `MIGRATE_MYSQL_TO_SUPABASE.md` for `pgloader` commands.

4) After migrations complete, run smoke tests:

```bash
# Run in container (example)
docker run --rm --env-file .env -p 7860:7860 truetone-backend:latest gunicorn truetone.wsgi:application --bind 0.0.0.0:7860
# Or run locally if you have installed dependencies (not recommended for heavy deps)
python manage.py runserver
```

5) Share credentials securely (see `SECURE_SHARING.md`).

6) Monitoring & backups
- Supabase provides automated backups and a dashboard. Enable nightly backups and retention as needed.
- For additional backups, schedule `pg_dump` to your backup storage.

If you want, I can attempt to run the Docker-based migration on your behalf now. Confirm that:
- Docker is installed and running on this machine, and
- Your local MySQL is available (if doing data migration).
