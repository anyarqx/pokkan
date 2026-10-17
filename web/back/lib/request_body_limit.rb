require "stringio"

# Reject oversized JSON before Rails parses it, including chunked request bodies.
class RequestBodyLimit
  LIMIT = 768 * 1024

  def initialize(app)
    @app = app
  end

  def call(env)
    if env["PATH_INFO"].start_with?("/api/") && %w[POST PUT PATCH].include?(env["REQUEST_METHOD"])
      return too_large if env["CONTENT_LENGTH"].to_i > LIMIT

      body = env["rack.input"]&.read(LIMIT + 1).to_s
      return too_large if body.bytesize > LIMIT

      env["rack.input"] = StringIO.new(body)
    end
    @app.call(env)
  end

  private

  def too_large
    [ 413, { "content-type" => "application/json", "cache-control" => "no-store" }, [ '{"error":"The request is too large.","code":"payload_too_large"}' ] ]
  end
end
