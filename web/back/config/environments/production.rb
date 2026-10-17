require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Rails is API-only. The Vite application is deployed separately to Workers;
  # never expose files left behind by an overlay-style provider deployment.
  config.public_file_server.enabled = false

  # Square Cloud terminates TLS before forwarding requests to Puma.
  config.assume_ssl = true
  config.force_ssl = true

  # This process is an API, never an HTML application. Keep its browser policy
  # intentionally narrow so accidental server-rendered endpoints stay inert.
  config.action_dispatch.default_headers.merge!(
    "Content-Security-Policy" => "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Permissions-Policy" => "camera=(), geolocation=(), microphone=()",
    "Referrer-Policy" => "strict-origin-when-cross-origin",
    "X-Content-Type-Options" => "nosniff",
    "X-Frame-Options" => "DENY"
  )

  # Skip http-to-https redirect for the default health check endpoint.
  # config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Square runs one Puma process for this SQLite deployment. This bounded store
  # owns endpoint rate-limit counters for that process.
  config.cache_store = :memory_store, { size: 16 * 1024 * 1024 }

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/api/v1/health"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Square Cloud terminates TLS for the documented public API host.
  config.hosts = [ ENV.fetch("API_HOST", "pokkan.squareweb.app") ]
end
