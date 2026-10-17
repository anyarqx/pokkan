# Pokkan repository guide

## Scope

- `web/front` owns the browser editor, preview, import/export and direct Discord webhook delivery.
- `web/back` owns account identity, sessions, Kit persistence and security audit events.

## Working rules

- Keep OAuth credentials, webhook URLs and deployment tokens out of source code, fixtures, logs and documentation.
- Webhook capability URLs stay in the browser, separate from Kit data and Rails requests.
- Kits have one UUID, a name, arguments, placeholders and a Discord message payload.
- Preserve user changes outside the requested scope. Use `apply_patch` for source and documentation edits.
- Validate frontend changes with `npm run check`, `npm test`, `npm run build` and `npm run check:bundle` in `web/front`.
- Validate Rails changes with `bin/rails test` in the backend environment, RuboCop and Brakeman.
- For runtime changes, build and start Compose, inspect status/logs and verify API readiness and frontend responses.
