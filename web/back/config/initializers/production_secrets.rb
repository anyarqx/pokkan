if Rails.env.production?
  secret = ENV["SECRET_KEY_BASE"].to_s
  raise "SECRET_KEY_BASE must be configured with at least 64 characters." if secret.length < 64
end
