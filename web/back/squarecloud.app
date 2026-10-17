# Square Cloud infers Ruby from this file; START below remains the real server.
MAIN=main.rb
VERSION=recommended
# Rails needs headroom while booting and preparing SQLite.
MEMORY=768
DISPLAY_NAME=Pokkan API
DESCRIPTION=Pokkan Rails API
SUBDOMAIN=pokkan
# Prepare the database, prune expired audit records and start Puma.
START=rm -f db/migrate/202608*.rb && bundle exec rails db:prepare && bundle exec rails runner 'AuditEvent.prune_expired!' && bundle exec rails kits:prune_shares && bundle exec rails reports:prune && bundle exec puma -p 80 -e production
AUTORESTART=true
# Configure DB_ADAPTER=sqlite3 and SQLITE_DATABASE in Square Cloud's private
# environment. Do not put credentials in this descriptor or the frontend bundle.
