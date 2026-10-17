class DiscordContexts
  MANAGE_GUILD = 1 << 5
  ADMINISTRATOR = 1 << 3
  CACHE_TTL = 2.minutes

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

  def self.guild_admin?(account, guild_id, member)
    authorization = bot_authorization
    guild = DiscordApi.get("/guilds/#{guild_id}", authorization:)
    return false unless guild.is_a?(Hash) && guild["id"].to_s == guild_id.to_s
    return true if guild["owner_id"].to_s == account.discord_id

    roles = DiscordApi.get("/guilds/#{guild_id}/roles", authorization:)
    return false unless roles.is_a?(Array) && member["roles"].is_a?(Array)

    permissions = roles.filter_map { |role| [ role["id"].to_s, role["permissions"].to_s ] if role.is_a?(Hash) }.to_h
    ids = [ guild_id.to_s, *member["roles"].map(&:to_s) ]
    return false unless ids.all? { |id| permissions[id]&.match?(/\A\d+\z/) }

    bits = ids.reduce(0) { |value, id| value | permissions.fetch(id).to_i }
    (bits & (MANAGE_GUILD | ADMINISTRATOR)).positive?
  end

  def self.installed?(guild_id)
    DiscordApi.get("/guilds/#{guild_id}", authorization: bot_authorization).is_a?(Hash)
  rescue DiscordApi::NotFound
    false
  end

  # Public link reads share a short installation check, never membership grants.
  def self.public_installed?(guild_id)
    key = "discord-public-install/#{guild_id}"
    cached = Rails.cache.read(key)
    return cached[:installed] if cached&.key?(:installed)
    raise DiscordApi::RateLimited.new(retry_after: [ cached[:retry_at] - Time.current.to_f, 1 ].max) if cached&.key?(:retry_at)
    raise DiscordApi::Unavailable if cached
    raise DiscordApi::Unavailable unless Rails.cache.write("#{key}/lease", true, expires_in: 12.seconds, unless_exist: true)

    begin
      installed = installed?(guild_id)
      Rails.cache.write(key, { installed: }, expires_in: 30.seconds)
      installed
    rescue DiscordApi::Forbidden
      Rails.cache.write(key, { installed: false }, expires_in: 30.seconds)
      false
    rescue DiscordApi::RateLimited => error
      Rails.cache.write(key, { retry_at: Time.current.to_f + error.retry_after }, expires_in: error.retry_after)
      raise
    rescue DiscordApi::Unavailable, DiscordApi::Unauthorized
      Rails.cache.write(key, { unavailable: true }, expires_in: 5.seconds)
      raise
    ensure
      Rails.cache.delete("#{key}/lease")
    end
  end

  def self.invalidate_installs!(guild_id: nil)
    Rails.cache.delete("discord-contexts-v1/bot-guilds")
    Rails.cache.delete("discord-public-install/#{guild_id}") if guild_id
  end

  def self.for(account, force: false)
    authorization = account.discord_authorization
    return { authorization_required: true, guilds: [] } unless authorization&.guilds_authorized?

    user_guilds = cached("user-guilds-#{account.id}", force:) do
      token = authorization.usable_access_token!
      fetch_guilds("Bearer #{token}")
    rescue DiscordApi::Unauthorized
      authorization.destroy!
      raise DiscordOauth::ConsentRequired, "Discord authorization expired or was revoked."
    end
    raise DiscordApi::Unavailable unless user_guilds.is_a?(Array)

    installed_ids = cached("bot-guilds", force:) do
      fetch_guilds(bot_authorization).filter_map { |guild| guild["id"].to_s if guild.is_a?(Hash) && guild["id"].present? }
    rescue DiscordApi::Unauthorized
      raise BotNotConfigured, "Discord bot token is invalid."
    end
    guilds = user_guilds.filter_map do |guild|
      next unless guild.is_a?(Hash) && guild["id"].to_s.match?(/\A\d+\z/)

      id = guild.fetch("id").to_s
      installed = installed_ids.include?(id)
      eligible = guild["owner"] == true || (guild["permissions"].to_i & (MANAGE_GUILD | ADMINISTRATOR)).positive?
      {
        id:, name: guild["name"].to_s, icon: guild["icon"], banner: guild["banner"],
        status: installed ? "installed" : eligible ? "invite" : "unavailable"
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

  def self.cached(key, force:, &block)
    cache_key = "discord-contexts-v1/#{key}"
    Rails.cache.delete(cache_key) if force
    Rails.cache.fetch(cache_key, expires_in: CACHE_TTL, &block)
  end
  private_class_method :fetch_guilds, :cached
end
