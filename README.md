# Pokkan

Unicode emoji in Discord previews use [Discord Twemoji](https://github.com/discord/twemoji), licensed under MIT and CC-BY 4.0.

Pokkan is a browser editor for Discord message Kits. Create and preview messages,
import or export JSON, and send directly to a Discord webhook. Signing in with
Discord adds personal and server-owned Kit storage with verified membership and
creator/administrator editing permissions.

- `web/front`: React/Vite client, served as static assets at `https://pokkan.net`.
- `web/back`: Rails account and Kit API at `https://pokkan.squareweb.app`.
- `web/docs`: static public user guides for `https://docs.pokkan.net`.
- `docs`: internal engineering and operations documentation.

## Development

Copy `env/dev.env.example` to the untracked `env/dev.env`, then run
`./scripts/run.sh -d`. Compose builds Rails with its gems, prepares a fresh MySQL
schema, and serves Rails on port 3000 and Vite on port 5173. OAuth credentials
are optional for anonymous editing and webhook sending.

The migration chain supports fresh databases and upgrades existing personal Kits
without changing their IDs or ownership. Use `bin/rails db:prepare` in the
configured backend environment. Reset only explicitly disposable development or
test databases after checking their target and contents; never reset production.

## Checks

```sh
cd web/front
npm run check
npm test
npm run build
npm run check:bundle
npm audit
```

```sh
cd web/back
DB_ADAPTER=sqlite3 RAILS_ENV=test bin/rails db:prepare test
bundle exec rubocop
bundle exec brakeman --no-pager
bundle exec bundler-audit check --update
```

Frontend tests include locale catalog consistency. Compose verification requires
`docker compose up --build -d`, healthy containers, successful `/api/v1/health`
and `/api/v1/ready` responses, and a responding frontend at `http://localhost:5173`.

See [architecture](docs/architecture.md) for the domain and boundaries and
[operations](docs/operations.md) for deployment and backup procedures.

## Public documentation

See [web/docs/README.md](web/docs/README.md) for authoring, localization, static
build checks and Cloudflare Pages deployment. Documentation has its own build;
its search index and images are not bundled into the editor.
