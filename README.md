# Deploy and Host LobeHub (Lobe Chat) on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/lobe-chat?utm_medium=integration&utm_source=button&utm_campaign=lobe-chat)

This template deploys the server edition of [LobeHub](https://lobehub.com) (formerly Lobe Chat): a multi-user AI workspace with chat, agents, file uploads, knowledge bases and image generation, talking to any model provider you configure. Everything it needs is provisioned for you: a ParadeDB Postgres with the `pgvector` and `pg_search` extensions LobeHub requires, and a Railway Storage Bucket for uploads. Open your domain, create the first account, and start chatting.

## About Hosting Lobe Chat

Three resources: the `lobehub` service (official `lobehub/lobehub` image, pinned), a `postgres` service (ParadeDB, pinned) with a volume, and a `storage` bucket. A small launcher in front of the stock image waits for Postgres, generates the RS256 `JWKS_KEY` LobeHub needs and keeps it on a volume so tokens survive redeploys, and sets the CORS rule on the bucket so browser uploads via presigned URLs work out of the box. Login is LobeHub's built-in email + password (Better Auth); SSO providers can be added with the usual `AUTH_*` variables.

## Common Use Cases

- A private ChatGPT-style workspace for a team, with shared agents and per-user history
- Bring-your-own-key access to OpenAI, Anthropic, Google, DeepSeek, Ollama and 40+ other providers from one UI
- Chat with documents: upload files into a knowledge base and query them with RAG
- A self-hosted backend for the LobeHub desktop and mobile apps

## Dependencies for Lobe Chat Hosting

- Postgres with `pgvector` + `pg_search` (ParadeDB image, included)
- S3-compatible object storage (Railway bucket, included)

### Deployment Dependencies

- [LobeHub self-hosting docs](https://lobehub.com/docs/self-hosting/start)
- [Environment variables reference](https://lobehub.com/docs/self-hosting/environment-variables)
- [Railway Storage Buckets](https://docs.railway.com/storage-buckets)

### Implementation Details

**First use:** open your Railway domain and click "Sign up". The first account is yours; anyone with the URL can register too, so set `AUTH_ALLOWED_EMAILS` (your email or your company domain) before sharing the link. Then add a model provider key in Settings → AI Providers, or set `OPENAI_API_KEY` (or any provider's variable) on the service so every user shares it.

**Uploads and knowledge base** use the bucket directly from the browser with presigned URLs; the launcher writes the CORS rule for your domain on each boot. If you attach a custom domain, `APP_URL` follows `RAILWAY_PUBLIC_DOMAIN` automatically and the CORS rule is updated on the next deploy.

Notes and limits:

- Keep `KEY_VAULTS_SECRET` and `AUTH_SECRET` stable: the first encrypts the API keys users store, the second signs sessions.
- `JWKS_KEY` is generated on first boot into the `/data` volume. Set the variable explicitly if you want to bring your own.
- Give the `lobehub` service at least 1 GB of RAM; Postgres is happy with 512 MB for small teams.
- Full-text search uses `pg_search` inside Postgres; no Elasticsearch needed. Redis and SearXNG are optional upstream extras and not included; add `REDIS_URL` / `SEARXNG_URL` if you deploy them.

## Why Deploy Lobe Chat on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Lobe Chat on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
