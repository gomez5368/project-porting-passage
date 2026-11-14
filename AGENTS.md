<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- App data (vehicles, fill-ups) lives in browser localStorage via src/context/CarDataContext.tsx under key spotreba-app-state-v1 — kept from the original Bolt app so no backend is needed.
- Vehicle photos are resized and JPEG-compressed in the browser, stored as optional inline data in vehicle state and validated in JSON backups so photos remain portable without a backend.
- Browser-only WASM (sql.js for .db3 backup import) is served from public/wasm and loaded by URL — importing .wasm from src breaks the server bundle.
- JSON backup validation and serialization live in a browser-safe shared module; restores replace the complete state only after validation and confirmation to avoid partial or orphaned data.
- Fill-up creation and editing share one form; updates preserve record and vehicle IDs so derived statistics automatically follow the current history.
- Optional post-fill tank percentages override the legacy full-tank flag in calculations and exports; legacy records without percentages retain their original meaning.
- App source lives only in src/ (TanStack Start); old Bolt/Expo or Next.js files uploaded to the repo root are not part of the app and break package.json/tsconfig, so they must not be merged in.
- Per-vehicle deadlines and oil-change settings are an optional reminders list on the app state (one entry per vehicle); status thresholds live in one browser-safe module so the page, overview banner and tests share them.
- Offline mode uses vite-plugin-pwa (generateSW, /sw.js) registered only from src/lib/registerSW.ts, which refuses previews/dev; navigations are NetworkFirst so new versions always load online.
