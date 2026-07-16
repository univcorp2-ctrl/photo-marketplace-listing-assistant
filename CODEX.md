# CODEX.md

## Project rules

- Personal Mercari and personal Yahoo! Auctions remain draft/export-only unless an official seller API and explicit authorization are added.
- Never add browser login automation, cookie extraction, CAPTCHA bypass, or credential storage.
- Mercari Shops writes default to `UNOPENED` in UI and tests.
- Secrets belong in Cloudflare Secrets or local environment variables, never source control.
- Any marketplace adapter must link its official API terms in `docs/setup.md`.
- Run `npm run typecheck`, `npm test`, and `npm run build` before merging.
