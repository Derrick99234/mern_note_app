# MERN Note App + Writer

## Secrets / Environment Files
- Do not commit `.env` files. This repo ignores them via `.gitignore` rules.
- Use these templates:
  - `Backend/.env.example`
  - `Frontend/.env.example`

## Local Development
1. Backend: copy `Backend/.env.example` to `Backend/.env` and fill values.
2. Frontend: copy `Frontend/.env.example` to `Frontend/.env` if you want a custom API URL.

## Deployment Safety
- Production deployments should set environment variables in the hosting provider dashboard (never via committed `.env` files).
- Frontend API base URL is controlled by `VITE_API_BASE_URL` and defaults to `http://localhost:8000` if unset.
