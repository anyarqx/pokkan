class DiscordEmojis
  FIELDS = %w[id name animated available roles].freeze

  def self.capture(items)
    raise DiscordApi::Unavailable unless items.is_a?(Array)

    items.filter_map do |item|
      next unless item.is_a?(Hash) && item["id"].to_s.match?(/\A\d+\z/) && item["name"].is_a?(String) &&
        item["roles"].is_a?(Array) && item["roles"].all? { |role| role.is_a?(String) && role.match?(/\A\d+\z/) }

      item.slice(*FIELDS)
    end
  end

  def self.visible(items, member_roles)
    return [] unless member_roles.is_a?(Array)

    items.filter_map do |emoji|
      next if emoji["available"] == false || !emoji["roles"].is_a?(Array)
      next unless emoji["roles"].empty? || (emoji["roles"] & member_roles).any?

      emoji.slice("id", "name", "animated")
    end
  end

  def self.built_in
    guild_id = ENV["DISCORD_EMOJI_GUILD_ID"].to_s
    return [] unless guild_id.match?(/\A\d+\z/)

    key = "discord-built-in-emojis/#{guild_id}"
    cached = Rails.cache.read(key)
    return cached if cached
    return [] unless Rails.cache.write("#{key}/lease", true, expires_in: 12.seconds, unless_exist: true)

    begin
      items = capture(DiscordApi.get("/guilds/#{guild_id}/emojis", authorization: DiscordContexts.bot_authorization))
      result = visible(items, [])
      Rails.cache.write(key, result, expires_in: 15.minutes)
      result
    rescue DiscordApi::RateLimited => error
      Rails.cache.write(key, [], expires_in: error.retry_after)
      []
    rescue DiscordApi::Unavailable, DiscordApi::Unauthorized, DiscordApi::Forbidden, DiscordApi::NotFound, DiscordContexts::BotNotConfigured
      Rails.cache.write(key, [], expires_in: 60.seconds)
      []
    ensure
      Rails.cache.delete("#{key}/lease")
    end
  end
end
