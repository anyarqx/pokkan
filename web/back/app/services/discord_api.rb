require "net/http"
require "openssl"

class DiscordApi
  BASE_URL = "https://discord.com/api/v10"

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
    uri = URI("#{BASE_URL}#{path}")
    request = Net::HTTP::Get.new(uri)
    request["Authorization"] = authorization
    request["User-Agent"] = "Pokkan (https://pokkan.net)"

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 3, read_timeout: 6) do |http|
      http.request(request)
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
      seconds = retry_after.to_f
      raise RateLimited.new(retry_after: seconds.finite? && seconds.positive? ? seconds : 1)
    else raise Unavailable, "Discord could not provide server information."
    end
  rescue JSON::ParserError, SocketError, IOError, SystemCallError, Timeout::Error, OpenSSL::SSL::SSLError
    raise Unavailable, "Discord could not provide server information."
  end
end
