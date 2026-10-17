# Operations

## Runtime and configuration

The static frontend is deployed to `https://pokkan.net`; Rails runs at
`https://pokkan.squareweb.app`. Square Cloud uses a single SQLite database at
`storage/pokkan_the_bot_production.sqlite3` and one Puma process. Keep
`WEB_CONCURRENCY` unset for this configuration.

Configure private `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`,
`REDIRECT_AUTH_URL` and a `SECRET_KEY_BASE` of at least 64 characters. Frontend
origins are explicitly allowlisted. OAuth application secrets stay server-side;
`VITE_API_ORIGIN` is public configuration. Webhook credentials belong only to the
browser. Do not configure them on Rails.

`DISCORD_EMOJI_GUILD_ID` optionally identifies the guild supplying Pokkan's built-in
emoji collection. The bot must belong to it. Only available emoji without role
restrictions are exposed; the public catalog is cached for 15 minutes. Member
guilds and server Kits require owner, Administrator or Manage Guild authority, but
do not require bot installation. Channel, role and guild
emoji discovery still require bot access and user-specific permission checks.

Fresh databases use the checked-in migrations. Before deploying, initialize
an empty database with `bin/rails db:prepare`; existing Pokkan databases apply
all pending migrations, including the sharing tables and nullable account owner
for temporary copies. Existing personal/server Kit IDs and ownership are retained.
Do not run the baseline over an unrelated schema.

The collection-index migrations replace single-column Kit indexes with indexes
covering personal/server filtering and update ordering, and remove the audit
account-only index already covered by its account/time index. They are reversible
and do not rewrite message data. The 15-Kit saved-collection limit applies only to
new creations, so existing larger collections remain editable.

This release adds server-side login revocation. Existing cookies require one
fresh Discord login after deployment; accounts, grants and Kits are preserved.

## Reports and resource restrictions

`POST /api/v1/reports` requires a signed-in account and CSRF protection. Limits
are five submissions/hour/account and ten/hour/network address, with a soft cap
of 2,000 pending reports. The response contains only a reference, not stored
details. Optional email and report contents must not enter routine logs.

Use `bin/rails reports:pending` to list references and
`bin/rails 'reports:show[reference]'` in a private terminal to review a report.
With `OPERATOR` identifying the reviewer and `REASON` giving a non-sensitive
explanation, run `reports:restrict[reference]`, `reports:restore[reference]` or
`reports:close[reference]`. Restrictions disable every public link for the Kit,
including regenerated links, while preserving ordinary authorized access and
unrelated resources. Managers see the reason and can submit an appeal. Review
new reports regularly and communicate outcomes through the supplied reply
address or verified support conversation; there is no automated review or email
delivery service. Never request bearer tokens or webhook credentials.

For privacy requests, verify identity proportionately and review which records
belong to the requester versus a server. Do not blindly destroy an account:
creator attribution does not make a server Kit the creator's personal property.
Apply a reviewed export, correction or deletion and retain only required records.
`reports:prune` removes reports after 180 days or 90 days after closure, whichever
comes first; application startup also runs it.

The public notice uses the existing public creator credit and support channel.
Formal operator identity, jurisdiction, EU applicability/representation and
provider transfer safeguards still require operator/legal confirmation. The
notice is not a certification of GDPR, LGPD or DSA compliance. Signed-in reports
have an external support fallback for people unable to authenticate.

## Backup and restore

The daily `.github/workflows/backup.yml` workflow creates a Square application
snapshot and keeps an encrypted GitHub artifact for 30 days. It downloads that
artifact again, decrypts it and checks SQLite integrity. Configure
`SQUARE_APP_ID`, `SQUARE_API_TOKEN` and `BACKUP_ENCRYPTION_KEY` privately. Target
RPO is 24 hours; target RTO is one hour. Enable failed-workflow notifications.

Create an operator snapshot with `./scripts/backup.sh`. Use `--download` from a
private temporary directory for an independent copy. Never commit snapshots,
database files, encryption keys or credentials.

For a restore drill:

1. Download and decrypt the chosen artifact with OpenSSL using the private key.
2. Extract the SQLite database into an isolated temporary directory.
3. Require `PRAGMA integrity_check` to return `ok`.
4. Point an isolated Rails runtime at the copy with `DB_ADAPTER=sqlite3` and
   `SQLITE_DATABASE`; verify account/Kit counts and `/api/v1/ready`.
5. Only then perform an explicitly authorized production restore. Keep the
   pre-restore snapshot until verification completes.

Record the previous Worker version and Pages production deployment before a
release, alongside the Square snapshot. Roll back static assets to those known
versions if necessary. A backend code rollback must preserve `storage` and the
private environment, and requires a schema compatibility check first. Never
restore the entire production database automatically: that could erase Kits or
restriction decisions created after the snapshot.

## Release checks

Run the checks in the root README before deployment. `scripts/pack.sh` packages
Rails and `scripts/deploy.sh` sends it to Square Cloud. Frontend releases use
`scripts/deploy-front.sh` or `.github/workflows/deploy-front.yml`, with a private
Cloudflare deployment token scoped to the target application.

After deployment check HTTPS, health/readiness, allowed-origin CORS, CSRF,
anonymous sessions and the OAuth authorization redirect. Completing login needs
an interactive Discord account. Verify the frontend and direct refresh of Kit
URLs, and confirm that production API requests target the configured API origin.
Exercise webhook delivery with an explicitly chosen webhook; mock network calls
when checking locally without a real destination.

Rails logs carry request IDs for API, authentication and database failures.
Audits contain security metadata only and retain 180 days. Release startup
prunes expired audit rows in bounded batches. Restore and release reports must
distinguish actual operations from isolated checks.

Expired sharing capabilities stop working at their deadline, independently of
cleanup. `bin/rails kits:prune_shares` removes expired temporary Kits and links in
bounded batches. Container and Square Cloud startup run this task; shared-resource
requests also run at most one maintenance batch per minute per Rails cache.
Operators can run the task independently for cleanup during periods without
traffic. Failed refreshes and expired links never delete saved personal/server
Kits. Rate limits use the existing Rails cache and reset with that cache; they are
not persistent quotas across process restarts. Backups retain their existing
30-day policy, including data deleted after a backup was taken.
