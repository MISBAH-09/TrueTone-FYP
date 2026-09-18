# Securely sharing DB credentials with teammates

Do not commit secrets to Git. Recommended approaches:

1. Use Supabase project access
   - Invite teammates to the Supabase project (Dashboard → Project → Settings → Team)
   - Use Supabase Roles/Policies and give limited access where appropriate.

2. Secrets manager
   - Store `DATABASE_URL` in a central secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
   - Give team members access via their company IAM accounts.

3. Share a `.env` securely (temporary)
   - Use an encrypted channel (1Password, LastPass, Signal, or company vault) to share the `.env` file.
   - Rotate credentials after sharing.

4. CI/CD secrets
   - Store `DATABASE_URL` and other secrets in your CI provider (GitHub Actions `Secrets`, GitLab CI Variables).
   - Inject them at deploy time; never print them in logs.

Example: Add to GitHub Actions as `SUPABASE_DATABASE_URL` and use in workflow like:

```yaml
- name: Run migrations
  run: docker run --rm --env DATABASE_URL="${{ secrets.SUPABASE_DATABASE_URL }}" truetone-backend:latest python manage.py migrate
```
