class DiscordContexts
  MANAGE_GUILD = 1 << 5
  ADMINISTRATOR = 1 << 3
  CACHE_TTL = 2.minutes
  FETCH_LOCKS = Array.new(32) { Mutex.new }.freeze

  class BotNotConfigured < StandardError; end

  def self.bot_authorization
    token = ENV["DISCORD_BOT_TOKEN"].presence
    raise BotNotConfigured, "Discord bot installation verification is not configured." unless token

    "Bot #{token}"
  end

  def self.member!(account, guild_id)
    authorization = account.discord_authorization
    raise DiscordOauth::ConsentRequired unless authorization&.guilds_authorized?
    raise DiscordApi::NotFound unless guild_id.to_s.match?(/\A\d+\z/)

    authorization.usable_access_token!

    member = DiscordApi.get("/guilds/#{guild_id}/members/#{account.discord_id}", authorization: bot_authorization)
    raise DiscordApi::Unavailable unless member.is_a?(Hash) && member.dig("user", "id").to_s == account.discord_id

    member
  end

  def self.access!(account, guild_id)
    guild = membership!(account, guild_id)
    raise DiscordApi::NotFound unless guild_admin?(guild)

    guild
  end

  def self.membership!(account, guild_id)
    raise DiscordApi::NotFound unless guild_id.to_s.match?(/\A\d+\z/)

    user_guilds(account).find { |item| item.is_a?(Hash) && item["id"].to_s == guild_id.to_s } || raise(DiscordApi::NotFound)
  end

  def self.guild_admin?(member)
    return false unless member.is_a?(Hash)

    member["owner"] == true || (member["permissions"].is_a?(String) && member["permissions"].match?(/\A\d+\z/) &&
      (member["permissions"].to_i & (MANAGE_GUILD | ADMINISTRATOR)).positive?)
  end

  def self.installed?(guild_id, fresh: true)
    cached("installed-#{guild_id}", force: fresh) do
      begin
        DiscordApi.get("/guilds/#{guild_id}", authorization: bot_authorization).is_a?(Hash)
      rescue DiscordApi::NotFound
        false
      end
    end
  end

  def self.invalidate_installs!
    Rails.cache.delete("discord-contexts-v1/bot-guilds")
  end

  def self.for(account, force: false)
    authorization = account.discord_authorization
    return { authorization_required: true, guilds: [] } unless authorization&.guilds_authorized?

    user_guilds = user_guilds(account, force:).select do |guild|
      guild.is_a?(Hash) && guild["id"].is_a?(String) && guild["id"].match?(/\A\d+\z/) && guild_admin?(guild)
    end

    installed_ids = installed_guild_ids(force:) unless user_guilds.empty?
    guilds = user_guilds.filter_map do |guild|
      id = guild.fetch("id").to_s
      installed = installed_ids&.include?(id)
      {
        id:, name: guild["name"].to_s, icon: guild["icon"], banner: guild["banner"],
        can_install: true,
        status: installed_ids.nil? ? "unknown" : installed ? "installed" : "invite"
      }
    end
    { authorization_required: false, guilds: guilds.sort_by { |guild| [ guild[:status] == "installed" ? 0 : guild[:status] == "invite" ? 1 : 2, guild[:name].downcase ] } }
  end

  def self.fetch_guilds(authorization)
    guilds = []
    after = nil
    loop do
      path = "/users/@me/guilds?limit=200#{"&after=#{after}" if after}"
      page = DiscordApi.get(path, authorization:)
      raise DiscordApi::Unavailable unless page.is_a?(Array)

      guilds.concat(page)
      break if page.length < 200

      next_after = page.last["id"].to_s
      raise DiscordApi::Unavailable if next_after.blank? || next_after == after || guilds.length > 100_000

      after = next_after
    end
    guilds
  end

  def self.installed_guild_ids(force: false)
    return if Rails.cache.read("discord-installation-retry")

    cached("bot-guilds", force:) do
      fetch_guilds(bot_authorization).filter_map { |guild| guild["id"].to_s if guild.is_a?(Hash) && guild["id"].present? }
    end
  rescue DiscordApi::Unavailable, DiscordApi::Unauthorized, DiscordApi::Forbidden, BotNotConfigured => error
    Rails.cache.write("discord-installation-retry", true, expires_in: error.is_a?(DiscordApi::RateLimited) ? error.retry_after : 60.seconds)
    nil
  end

  def self.user_guilds(account, force: false)
    authorization = account.discord_authorization
    raise DiscordOauth::ConsentRequired unless authorization&.guilds_authorized?

    # A replaced OAuth grant must not reuse or be overwritten by an older
    # in-flight discovery. The digest is only a cache namespace, never a token.
    grant_key = Digest::SHA256.hexdigest(authorization.access_token_ciphertext)
    cached("user-guilds-#{account.id}-#{grant_key}", force:) do
      authorization.reload
      retry_in = authorization.contexts_retry_after_at && (authorization.contexts_retry_after_at - Time.current).ceil
      raise DiscordApi::RateLimited.new(retry_after: retry_in) if retry_in.to_i.positive?

      begin
        token = authorization.usable_access_token!
        fetch_guilds("Bearer #{token}")
      rescue DiscordApi::RateLimited => error
        authorization.update!(contexts_retry_after_at: Time.current + error.retry_after)
        raise
      rescue DiscordApi::Unauthorized
        authorization.destroy!
        raise DiscordOauth::ConsentRequired, "Discord authorization expired or was revoked."
      end
    end
  end

  def self.cached(key, force:)
    cache_key = "discord-contexts-v1/#{key}"
    # Coalesce cold reads without keeping a database transaction open for HTTP.
    FETCH_LOCKS[key.hash % FETCH_LOCKS.length].synchronize do
      value = Rails.cache.read(cache_key)
      return value unless value.nil? || force

      value = yield
      Rails.cache.write(cache_key, value, expires_in: CACHE_TTL)
      value
    end
  end
  private_class_method :fetch_guilds, :cached, :user_guilds, :installed_guild_ids
end
