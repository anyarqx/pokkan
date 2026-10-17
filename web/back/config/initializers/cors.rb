# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

frontend_origins = Rails.application.config.x.frontend_origins.freeze

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins { |origin, _environment| frontend_origins.include?(origin) }

    resource "/api/*",
      headers: %w[Accept Content-Type X-CSRF-Token Authorization],
      expose: %w[X-Request-Id Retry-After],
      methods: %i[get post put patch delete options head],
      credentials: true,
      max_age: 600
  end
end
