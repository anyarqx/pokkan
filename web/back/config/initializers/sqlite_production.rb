if Rails.env.production? && ENV["DB_ADAPTER"] == "sqlite3"
  workers = Integer(ENV.fetch("WEB_CONCURRENCY", "1"), 10)
  raise "SQLite production requires one Puma worker." unless workers == 1
end
