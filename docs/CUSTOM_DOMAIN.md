# Custom domain for Compound (GCP Cloud Run)

Project: `compound-learning-389172` · Region: `asia-south1`

Default URLs (until you map a domain):

- **Web:** `https://compound-web-y2mihra7pa-el.a.run.app`
- **API:** `https://compound-api-y2mihra7pa-el.a.run.app`

## Recommended domain patterns

Pick a registrar (Google Domains / Squarespace, Cloudflare, Namecheap, etc.) and buy a domain you control. Good options:

| Pattern | Example | Notes |
|--------|---------|--------|
| Product subdomain | `app.getcompound.com` + `api.getcompound.com` | Clear, professional |
| Dev-style | `learn.compound.dev` + `api.compound.dev` | If you own `compound.dev` |
| Short brand | `compound.app` (single domain, path-based API) | Requires proxy or same host |

Use **two hostnames** (app + api) so OAuth, CORS, and the Next.js `NEXT_PUBLIC_API_URL` stay simple.

## 1. Buy and verify the domain in GCP

1. Open [Google Cloud Console → Cloud Run → Domain mappings](https://console.cloud.google.com/run/domains?project=compound-learning-389172).
2. Click **Add mapping** and follow prompts to verify domain ownership (DNS TXT record at your registrar).
3. Repeat verification if you use a second apex or subdomain on another registrar.

## 2. Map hostnames to Cloud Run services

After verification, create two mappings in `asia-south1`:

```bash
gcloud beta run domain-mappings create \
  --service=compound-web \
  --domain=app.example.com \
  --region=asia-south1 \
  --project=compound-learning-389172

gcloud beta run domain-mappings create \
  --service=compound-api \
  --domain=api.example.com \
  --region=asia-south1 \
  --project=compound-learning-389172
```

Replace `app.example.com` / `api.example.com` with your chosen hostnames.

GCP will show **DNS records** (usually CNAME targets like `ghs.googlehosted.com` or A/AAAA for some setups). Add them at your DNS provider. Propagation can take up to 48 hours; often much faster.

Check mappings:

```bash
gcloud beta run domain-mappings list --region=asia-south1 --project=compound-learning-389172
```

## 3. Google OAuth (Sign in with Google)

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=compound-learning-389172), edit your OAuth 2.0 Client:

1. **Authorized JavaScript origins:** `https://app.example.com` (your web hostname).
2. **Authorized redirect URIs:** `https://api.example.com/api/auth/google/callback` (must match `GOOGLE_REDIRECT_URI` on the API service).

Keep the existing `*.run.app` redirect URIs until the custom domain works, then remove them if you want to lock down to production hostnames only.

## 4. GitHub Actions secrets

In the repo **Settings → Secrets and variables → Actions**, set:

| Secret | Example | Purpose |
|--------|---------|---------|
| `FRONTEND_URL` | `https://app.example.com` | Post-login redirects, CORS web origin |
| `BACKEND_URL` | `https://api.example.com` | OAuth redirect base, frontend API URL at build time |

If `BACKEND_URL` is unset, deploy uses the current Cloud Run API URL. If `FRONTEND_URL` is unset, deploy uses the Cloud Run web URL after frontend deploy.

Existing secrets (`GCP_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.) stay unchanged.

## 5. Redeploy

Push to `main` or re-run the **Deploy Compound Platform** workflow. The workflow will:

1. Deploy the API with `GOOGLE_REDIRECT_URI=${BACKEND_URL}/api/auth/google/callback`.
2. Build the frontend with `NEXT_PUBLIC_API_URL=${BACKEND_URL}/api`.
3. Update `CORS_ORIGINS` and `FRONTEND_URL` on the API to match `FRONTEND_URL` (or the Run web URL).

## 6. Smoke test

```bash
# API health (requires identity token if service is IAM-protected)
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://api.example.com/health

curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://api.example.com/api/auth/google/status
```

Open `https://app.example.com` in the browser, sign in with Google, and confirm redirect lands on your app hostname.

## Troubleshooting

- **401 on API from browser:** Ensure `CORS_ORIGINS` includes exactly your web origin (scheme + host, no trailing slash).
- **OAuth redirect mismatch:** Redirect URI in Google Console must byte-match `GOOGLE_REDIRECT_URI` on Cloud Run (`gcloud run services describe compound-api --format='yaml(spec.template.spec.containers[0].env)'`).
- **SSL pending:** Domain mapping stays “Certificate provisioning” until DNS is correct worldwide.
