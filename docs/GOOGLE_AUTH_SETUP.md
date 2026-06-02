# Google Sign-In Setup

Compound uses Google OAuth 2.0 (authorization code flow). Email/password login continues to work alongside Google.

## 1. Create OAuth credentials (Google Cloud Console)

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Use project **compound-learning-389172** (or your own).
3. **Configure OAuth consent screen** (if not done):
   - User type: **External** (or Internal for Workspace-only)
   - App name: **Compound**
   - User support email: your email
   - Authorized domains: `run.app` (for production), your custom domain if any
   - Scopes: `email`, `profile`, `openid` (added automatically by the app)
4. **Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Compound local` (create a second client for prod if you prefer)

### Authorized redirect URIs

Add **both** (exact match required):

| Environment | Redirect URI |
|-------------|----------------|
| Local | `http://localhost:8000/api/auth/google/callback` |
| Production | `https://compound-api-778177955406.asia-south1.run.app/api/auth/google/callback` |

5. Copy **Client ID** and **Client secret**.

## 2. Local backend `.env`

In `backend/.env`:

```env
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
JWT_SECRET=your-local-jwt-secret
APP_PASSWORD=optional-shared-password
```

Restart the API after changing env vars.

## 3. Verify locally

1. Start backend + frontend (`docker compose up` or local uvicorn + `npm run dev`).
2. Open http://localhost:3000/login — you should see **Continue with Google**.
3. Or check: `curl http://localhost:8000/api/auth/google/status` → `{"enabled":true}`.

## 4. Production (Cloud Run)

Add GitHub repository secrets:

| Secret | Value |
|--------|--------|
| `GOOGLE_CLIENT_ID` | Client ID |
| `GOOGLE_CLIENT_SECRET` | Client secret |

The deploy workflow sets:

- `GOOGLE_REDIRECT_URI` → from `GOOGLE_REDIRECT_URI` GitHub secret (must match Google Console **exactly**)
- `FRONTEND_URL` → Cloud Run web URL (same step that updates CORS)

Default production redirect URI (if secret unset):

`https://compound-api-778177955406.asia-south1.run.app/api/auth/google/callback`

Run migration on deploy (Alembic `0004_google_oauth` adds `users.google_sub`).

## 5. How it works

1. User clicks **Continue with Google** → browser goes to `/api/auth/google`.
2. Google consent → callback `/api/auth/google/callback`.
3. API creates/links user by Google `sub` + email, issues JWT.
4. Redirect to `{FRONTEND_URL}/login/callback?token=...&next=/`.
5. Frontend stores token and sends user to Today.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Button not shown | `GOOGLE_CLIENT_ID` / secret / redirect URI missing on API |
| `redirect_uri_mismatch` | Redirect URI in Google Console must match `GOOGLE_REDIRECT_URI` exactly |
| 401 after login | Ensure `JWT_SECRET` matches on **both** `compound-api` and `compound-web` |
| Email already registered | Same email with password → Google links to that account on first Google sign-in |
