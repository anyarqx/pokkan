# Pokkan Rails API

Rails owns Discord identity login, account sessions, Kit persistence and audit
events. The browser owns Discord webhook delivery.

Use the root `env/dev.env.example` or `env/prod.env.example` templates for private
configuration. OAuth uses `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and
`REDIRECT_AUTH_URL`, requesting `identify guilds`. Server installation checks
require `DISCORD_BOT_TOKEN`. Renewable user grants are encrypted in the
database; neither user nor bot tokens are sent to the browser.
Production also requires `SECRET_KEY_BASE` with at least 64 characters.

The canonical baseline creates accounts, UUID-keyed Kits and audit events.
Compose uses MySQL; tests and Square Cloud also support SQLite. Initialize an
empty database with `bin/rails db:prepare`.

Kit routes are `/api/v1/kits` and `/api/v1/kits/:id`. Every normal access requires
personal ownership or verified guild membership; server edits require the creator
or an administrator. PUT accepts `{ kit: { name, arguments, message, placeholders,
revision } }`. Omit `revision` on creation and optionally include `guild_id` for a
server Kit. Ownership cannot change on update. Stale or missing update revisions
return 409. Use `/api/v1/csrf` for mutations, including anonymous sharing.

Sharing has separate routes and authorization:

- `GET/POST /api/v1/kits/:kit_id/shares`, `PATCH/DELETE .../:id` and
  `POST .../:id/regenerate` require the owner, creator or authorized guild admin.
  Settings are `{ share: { permission: "view" | "edit", audience: "anyone" |
"members", lifetime_hours?: 0 | 1 | 24 | 168 | 720 } }`. Zero means no expiry;
  omitting the lifetime preserves the current expiry. Members requires a server.
- `GET/PUT /api/v1/shared_kits/:id` requires the access link's
  `Authorization: Bearer <token>`. PUT uses the Kit payload above and its revision.
  Members-only links additionally verify the session account's current membership
  and bot installation. Public server links verify installation, without exposing
  guild metadata or granting access to ordinary Kit/account routes.
- `POST /api/v1/temporary_kits` takes `{ kit: { name, arguments, message,
placeholders }, lifetime_hours?: 1 | 24 | 168, permission?: "view" | "edit" }`.
  Defaults are 24 hours and view. It creates an independent, ownerless Kit and
  returns a separate management token. `GET/PUT/DELETE .../:id` requires that
  management token, as do the equivalent nested `/shares` management routes.

Only creation and regeneration return raw link tokens; the database stores
SHA-256 hashes. Responses are private/no-store. Public browser links put secrets
in the fragment, never API paths, query strings or OAuth return destinations.
Access links grant no delete, ownership, sharing-management or guild-data rights.
Temporary copies use the same Kit validation and size bounds. Creation is limited
to ten per hour/IP and a global soft capacity of 1,000 copies. Links are limited
to twenty active links per Kit; route-specific rate limits return `Retry-After`.
Run `bin/rails kits:prune_shares` for expired-copy/link maintenance.

OAuth starts at
`/auth/discord`, and `/api/v1/auth/session` reports or ends the session.
`/api/v1/contexts` reports the current personal/server selection and confirmed
installation states. `/auth/discord/install` starts a guild-bound bot install.

`/api/v1/health` checks the process; `/api/v1/ready` also checks the database.
See the root [architecture](../../docs/architecture.md) and
[operations](../../docs/operations.md) for the full current contract.
