# Current architecture

Pokkan creates Discord message Kits in the browser. Authentication is optional
for editing, previewing, import/export and webhook delivery; it enables saved
personal Kits and authorized server-owned Kits.

```text
DiscordAccount ── Kits (creator; personal owner when guild_id is null)
                   ├── id (UUID)
                   ├── name, guild_id, lock_version
                   ├── arguments
                   ├── placeholders
                   └── message (Discord payload)

Browser ── Rails: OAuth/session, personal/server Kits, filtered guild metadata, CSRF
Browser ── Discord: execute webhook
```

## Browser

React owns editing, undo/redo, validation, preview and JSON normalization. The
message payload's `IS_COMPONENTS_V2` flag determines its format. Legacy remains
Discord's terminology. The existing read-only preview boundary is also used by
the landing and Kits sending view. Enabled Link Buttons and masked Markdown links use
native anchors in read-only previews; editable text never navigates. Safe message
URLs become links without rewriting their destinations. Ordinary buttons
have native press feedback with CSS darkening; no application interaction runs.
The [Discord rendering boundary](discord-rendering.md) documents text capabilities,
visual ordering, direct controls and the limits of the preview comparison.

A Kit is `{ id, name, arguments, placeholders, message }`. Arguments are typed
definitions retained as data. Placeholders provide editing suggestions and
example previews, independently of arguments; built-in examples do not imply
access to live Discord context.

Placeholder tokens use one brace pair, for example `{user.name}`. Loading older
Kit data normalizes double-brace tokens once; unknown component subtrees remain
opaque. This does not change translation interpolation or introduce expressions.

Local drafts use browser storage scoped to the account or guest. Guest drafts
move into the account on login. Saved Kits load from Rails. Local edits win while
a save is in flight, and account changes reject stale load/save responses.
Persistence merges only a tab's changed drafts into shared browser storage.
Per-tab session recovery retains conflicting unsaved edits across reloads rather
than silently replacing them with another tab's draft. Server revision checks
remain the authority when saving; this is not collaborative editing.

Kit export adds `schema: "pokkan-kit"` and `version: 1` to the Kit object. Import
creates a new UUID; applying Kit JSON to an open editor retains its existing ID.
Discord JSON import normalizes supported fields and discards response metadata,
while preserving unknown component objects in the Kit tree. It retains attachment
descriptors and useful attachment media URLs. Unknown components are omitted only
at the outbound Discord JSON boundary.
Outbound Discord JSON includes only sendable fields. Attachments, embeds, polls,
message references and Components V2 media remain part of the message model.

Kits combines creation, import and sending. `?send` opens the sending view;
`?kit=<id>` opens it with a Kit selected. Choosing or clearing a Kit updates that
URL. The shared preview shows the selected Kit. Sending validates the
sendable Discord message separately from its current webhook-transport support,
then constructs an Execute Webhook request in the browser. The URL must be
HTTPS on an exact supported Discord hostname,
with a valid webhook path and supported query parameters. Sending omits cookies,
blocks redirects, suppresses referrers and uses a timeout. `wait=true` requests
Discord confirmation and `with_components=true` includes supported components.
Unsupported transport fields, interactive controls and multipart attachments
produce explicit errors. Missing `allowed_mentions` defaults to `{ parse: [] }`;
explicit mention allowances are retained and validated.

A successful webhook URL is remembered for 30 days in browser local storage,
separated by authenticated account or guest. Clearing the input removes it.
It is not a cookie and is never included in page requests, Kit data, API bodies,
OAuth return URLs or Rails sessions. The app expires the previous webhook cookies
without copying credentials whose account identity cannot be established.

## Rails

Rails requests Discord OAuth `identify guilds`, exchanges the code and reads the
basic profile and user's current guild list. It retains encrypted renewable
user tokens server-side for discovery and verifies bot installation with a
private bot token. Login uses expiring, one-use state, validates the frontend
return origin and rotates the session. The OAuth state's digest is consumed
atomically from the existing cache, so replaying an earlier cookie cannot reuse
it. A restart requires starting that in-progress login again. An encrypted HttpOnly cookie carries an
unguessable login token whose hash and 14-day expiry are registered in the database.
Logout removes only that login, so replaying its old cookie cannot authenticate
and independent logins remain active. Cookies predating this registry require a
fresh login; account data and Discord authorizations are preserved.
Cookie-authenticated mutations retain Rails CSRF protection and explicit CORS
origins. Personal ownership or verified guild membership applies to every Kit
read. Server mutations require the creator or owner/Administrator/Manage Guild
authority. The target Kit, not the selected browser context, determines access.
Server Kits survive their creator leaving. Optimistic revisions reject stale
writes with 409; local drafts keep their original revision until explicitly saved
or discarded. Refreshing a saved record never rebases a dirty draft silently.

Versioned guild snapshots persist metadata atomically with refresh leases and
retry state. Reads verify membership and filter channels using member roles and
overwrites. Snapshots are not authorization. Logout ends the current session
without revoking the account-wide Discord authorization.

The Kit model validates UUID/name, bounded JSON data, argument definitions and
placeholder structure. Detailed Discord protocol validation lives in the browser.
The baseline plus the server-context migration create `discord_accounts`,
`discord_authorizations`, `kits` and `audit_events`. Kit IDs are 36-character UUID primary keys on both MySQL and
SQLite. Access links have separate UUIDs and hashed bearer tokens in `kit_shares`;
they grant view/edit permission without changing ownership. Members-only links
still verify current guild access. Public server links reuse installation results
for at most 30 seconds, coalesce concurrent checks and honor Discord retry deadlines.
Installation callbacks invalidate the affected guild's result. Public links
return only Kit content, never guild catalogs or creator/account information.

Anonymous sharing creates an independent Kit with no account or guild owner,
an expiry and a hashed management capability. Its access links use the same
permission checks as saved Kits. The existing editor handles shared resources
through their explicit endpoints, with revision checks and separate tab-scoped
draft recovery scoped to account identity (or guest). A shared resource enters ordinary Kit storage only through an
explicit import. Secrets stay in URL fragments and tab recovery storage, outside
Kit exports and OAuth return destinations.

Audits record login/logout, Kit create/update/delete and authenticated sharing changes, account ownership,
request ID and target ID. Message and credential data are filtered from logs and
excluded from audits. Audit retention is 180 days.

## Routes

- `/:locale/kits`: create, import or send; the workspace sidebar lists Kits.
- `/:locale/kits?send` and `?kit=<id>`: open sending, optionally with a Kit selected.
- `/:locale/kits?example=<legacy|components-v2|poll>`: open a built-in landing example as a local draft, then replace the URL with its ordinary editor route.
- `/:locale/kits/:id`: edit.
- `/:locale/shared/:id#<token>`: shared view/edit; `#manage=<token>` opens a temporary copy with management access. These routes are noindex.
- `GET /api/v1/kits?context_id=personal|<guild_id>`: authorized owner list.
- `GET /api/v1/kits/:id`: resolve the actual authorized Kit, independent of selection.
- `PUT /api/v1/kits/:id`: create/update `{ kit: { name, arguments, placeholders, message, revision? } }`; creation may specify `guild_id`, updates require `revision` and cannot change ownership.
- `DELETE /api/v1/kits/:id`: delete.
- Sharing API contracts and bearer authorization are listed in the [Rails README](../web/back/README.md).
- `GET /auth/discord`, `GET /auth/discord/callback`: identity login.
- `GET`, `DELETE /api/v1/auth/session`: session and logout.
- `GET /api/v1/csrf`: mutation token.
- `GET /api/v1/health`, `GET /api/v1/ready`: liveness and database readiness.

## Runtime

Compose uses MySQL 8.4, Rails/Puma and Vite. Rails gems are installed in its
Docker development stage. Vite proxies API paths to the Compose backend. The
static production frontend and Rails deploy independently. Square Cloud uses a
single SQLite database and one Puma process; production startup enforces those
constraints. The repository has no requirement for a shared cache at this scale.

## Protocol references

- [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2)
- [Discord components](https://docs.discord.com/developers/components/overview)
- [Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook)
- [Discord messages and attachments](https://docs.discord.com/developers/resources/message)
- [Browser cookies](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie)
