require_relative "boot"
require_relative "../lib/request_body_limit"

# The frontend is a separate Vite application. This API only needs persistence,
# controllers/dispatch and Rails' test integration; loading every Rails railtie
# would reintroduce unused mail, storage, cable and job infrastructure.
require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_dispatch/railtie"
require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module PokkanTheBot
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])
    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # The API also owns the OAuth callback. Add only the cookie/session
    # middleware needed for the server-side Authorization Code Grant.
    config.api_only = true
    frontend_origin = ENV.fetch(
      "FRONTEND_ORIGIN",
      Rails.env.production? ? "https://pokkan.net" : "http://localhost:5173"
    ).delete_suffix("/")
    config.x.frontend_origin = frontend_origin
    config.x.frontend_origins = ENV.fetch("FRONTEND_ORIGINS", frontend_origin)
      .split(",")
      .map { |origin| origin.strip.delete_suffix("/") }
      .reject(&:blank?)
      .uniq
    config.session_store :cookie_store,
      key: "_pokkan_the_bot_session",
      same_site: Rails.env.production? ? :none : :lax,
      secure: Rails.env.production?,
      httponly: true,
      expire_after: 14 * 24 * 60 * 60
    config.middleware.use ActionDispatch::Cookies
    config.middleware.insert_before ActionDispatch::Cookies, RequestBodyLimit
    config.middleware.use config.session_store, config.session_options
  end
end
