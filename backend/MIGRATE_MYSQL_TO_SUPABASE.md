# Migrate MySQL (local) → Supabase Postgres

This document provides step-by-step commands to migrate an existing local MySQL database (`TrueTone`) into your Supabase Postgres instance.

Two recommended approaches:

A) Use `pgloader` (recommended) — automatically converts types and data
B) Use `mysqldump` + `pg_restore`/manual conversion — fallback

---

Prerequisites
- Docker (recommended for pgloader and to avoid installing system packages)
- Local MySQL running and accessible (user/root credentials)
- `backend/.env` contains `DATABASE_URL` pointing to Supabase (we created this already)

A) Using Dockerized `pgloader`

1. Run pgloader (replace MySQL details if different):

```bash
# From project root or anywhere with Docker
docker run --rm --name pgloader dimitri/pgloader:latest \
  pgloader mysql://root:root123@host.docker.internal/TrueTone \
           "${DATABASE_URL}"
```

Notes:
- On Windows, `host.docker.internal` points to your host's MySQL. If your MySQL is on localhost and accessible, use `host.docker.internal`.
- `DATABASE_URL` can be exported in your shell first: `export DATABASE_URL=$(cat backend/.env | grep DATABASE_URL | cut -d'=' -f2-)`
- If your Supabase password contains special characters, ensure it's percent-encoded in the `DATABASE_URL` (we encoded `@` → `%40`).

B) Using `mysqldump` → `pgloader` via SQL file

1. Dump MySQL schema+data:

```bash
mysqldump -u root -p --routines --triggers --single-transaction --add-drop-table TrueTone > truetone_dump.sql
```

2. Use `pgloader` to load from the SQL file into Postgres (requires pgloader installed locally) — alternatively, use a container that mounts the SQL file:

```bash
docker run --rm -v "${PWD}:/data" dimitri/pgloader:latest \
  pgloader /data/truetone_dump.sql "${DATABASE_URL}"
```

Caveats and common issues
- `pgloader` does type mapping (INT → INTEGER, DATETIME → TIMESTAMP). Inspect the resulting schema.
- You may need to adjust AUTO_INCREMENT to Postgres sequences; `pgloader` typically handles this.
- If you have MySQL-specific SQL (ENUMs, unsigned integers, stored procedures), migrate or rewrite them manually.

Verification
- Connect to Supabase via `psql` or Supabase SQL Editor and verify tables and row counts:

```bash
# Using psql
psql "${DATABASE_URL}" -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
psql "${DATABASE_URL}" -c "SELECT count(*) FROM users;"
```

Post-migration
1. Build Docker image and run Django migrations on Supabase (see `docker-migrate.sh`).
2. Run smoke tests: `python manage.py runserver` (or run inside container) and test endpoints.
3. Repoint any environment or secrets to use the Supabase `DATABASE_URL`.

If you want, I can run the `pgloader` migration for you from this machine — tell me whether your local MySQL is accessible and confirm the connection credentials (don’t paste passwords into chat; I already used the password you provided earlier to create `.env`, so I can use that.)
