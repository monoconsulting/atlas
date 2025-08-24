
# taskmasterweb (local Tailwind build)

Tailwind kompileras **vid build** och servas från `/static/tailwind.css` (ingen CDN behövs).

## Start
1) Kopiera `.env.example` → `.env` och sätt `PROJECT_ROOT` och ev. `HOST_PORT` / `PROJECT_NAME`.
2) `docker compose up -d --build`
3) Öppna `http://localhost:8099`
