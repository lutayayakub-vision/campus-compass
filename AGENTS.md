<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and
> the user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in the
> editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Base44 dev environment

## Stack
TanStack Start (SSR via nitro) + Vite + React 19, Tailwind v4, Leaflet/OpenStreetMap,
Supabase (auth + data). Package manager: **bun** (`bun.lock`, `bunfig.toml`).

## Running
```sh
docker compose -f docker-compose.base44.yml up -d
```
- Single `web` service on `oven/bun:1`, repo bind-mounted at `/app`, deps in a named
  `node_modules` volume. Runs `bun install && bun run dev` (Vite dev server, live reload).
- Host port `3000` → container `5173`.
- Healthcheck: `bun -e "fetch('http://localhost:5173/')..."`.

## Environment / secrets
- Supabase URL + publishable (anon) key are committed in `.env` (`VITE_SUPABASE_*` for
  the client, `SUPABASE_*` for SSR). Vite loads `.env` automatically — no extra wiring.
- The remote Supabase project (`jhftettubtlagfjyavfi.supabase.co`) holds the schema;
  `supabase/migrations/*.sql` are the source of truth for it. No local DB needed.
- The server-side service-role client (`src/integrations/supabase/client.server.ts`) is
  defined but **not used at runtime**, so `SUPABASE_SERVICE_ROLE_KEY` is not required to boot.
  If server functions start using it, add the key via Base44 secrets (not in the repo).

## Preview host
Vite must accept the Base44 preview's external hostname, which changes when the
environment is recreated. `vite.config.ts` sets `server.allowedHosts: true` for this —
do not remove it or the preview returns 403.

## Verify it works
```sh
curl -sf -H "Host: 3000-${BASE44_PUBLIC_HOST_SUFFIX}" http://localhost:3000/   # 200 + SSR HTML
curl -sf -H "Host: 3000-${BASE44_PUBLIC_HOST_SUFFIX}" http://localhost:3000/src/routes/index.tsx  # unhashed source module
```
Frontend edits hot-reload; `vite.config.ts`/compose/env changes trigger a Vite restart.
