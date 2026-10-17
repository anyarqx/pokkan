require "net/http"
require "openssl"
require "digest"

class DiscordApi
  BASE_URL = "https://discord.com/api/v10"
  RATE_LIMIT_LOCK = Mutex.new

  class Unavailable < StandardError; end
  class Unauthorized < StandardError; end
  class Forbidden < StandardError; end
  class NotFound < StandardError; end
  class RateLimited < Unavailable
    attr_reader :retry_after

    def initialize(retry_after: 1)
      @retry_after = retry_after
      super("Discord is temporarily rate limiting requests.")
    end
  end

  def self.get(path, authorization:)
    authorization_key = "discord-rate-limit/#{Digest::SHA256.hexdigest(authorization)}"
    route_key = "#{authorization_key}/#{Digest::SHA256.hexdigest(path.split('?').first)}"
    retry_in = [ Rails.cache.read(authorization_key).to_f, Rails.cache.read(route_key).to_f ].max - Time.current.to_f
    raise RateLimited.new(retry_after: retry_in) if retry_in.positive?

    uri = URI("#{BASE_URL}#{path}")
    request = Net::HTTP::Get.new(uri)
    request["Authorization"] = authorization
    request["User-Agent"] = "Pokkan (https://pokkan.net)"

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 8, read_timeout: 6, write_timeout: 6, max_retries: 0) do |http|
      http.request(request)
    end
    if response["X-RateLimit-Remaining"] == "0"
      reset_after = response["X-RateLimit-Reset-After"]&.to_f || (response["X-RateLimit-Reset"].to_f - Time.current.to_f)
      restrict_until_reset(route_key, reset_after)
    end
    case response.code.to_i
    when 200 then JSON.parse(response.body)
    when 401 then raise Unauthorized, "Discord authorization is no longer valid."
    when 403 then raise Forbidden, "Discord access is insufficient."
    when 404 then raise NotFound, "Discord resource is unavailable."
    when 429
      body = begin
        JSON.parse(response.body)
      rescue JSON::ParserError
        {}
      end
      retry_after = response["Retry-After"].presence || (body["retry_after"] if body.is_a?(Hash))
      seconds = Float(retry_after, exception: false)
      seconds = 1 unless seconds&.finite? && seconds.positive?
      global = response["X-RateLimit-Global"] == "true" || (body.is_a?(Hash) && body["global"] == true)
      restrict_until_reset(global ? authorization_key : route_key, seconds)
      raise RateLimited.new(retry_after: seconds)
    else raise Unavailable, "Discord could not provide server information."
    end
  rescue JSON::ParserError, SocketError, IOError, SystemCallError, Timeout::Error, OpenSSL::SSL::SSLError => error
    Rails.logger.warn(event: "discord.transport_unavailable", error_class: error.class.name)
    raise Unavailable, "Discord could not provide server information."
  end

  def self.restrict_until_reset(key, seconds)
    return unless seconds.finite? && seconds.positive?

    RATE_LIMIT_LOCK.synchronize do
      deadline = [ Rails.cache.read(key).to_f, Time.current.to_f + seconds ].max
      Rails.cache.write(key, deadline, expires_in: deadline - Time.current.to_f)
    end
  end
  private_class_method :restrict_until_reset
end
