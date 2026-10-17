class DiscordGuildMetadata
  VIEW_CHANNEL = 1 << 10
  ADMINISTRATOR = 1 << 3

  def self.read(account, guild_id, manual: false)
    member = DiscordContexts.member!(account, guild_id)
    snapshot = DiscordGuildSnapshot.for_guild(guild_id)
    claim = snapshot.claim!(manual:)
    if claim.is_a?(String)
      begin
        snapshot.finish!(claim, payload: fetch(guild_id))
      rescue DiscordApi::RateLimited => error
        snapshot.finish!(claim, error: "rate_limited", retry_after: error.retry_after)
      rescue DiscordApi::NotFound
        snapshot.finish!(claim, error: "bot_removed", retry_after: 60)
      rescue DiscordApi::Forbidden
        snapshot.finish!(claim, error: "bot_forbidden", retry_after: 60)
      rescue DiscordApi::Unavailable, DiscordApi::Unauthorized
        snapshot.finish!(claim, error: "unavailable", retry_after: 60)
      end
      snapshot.reload
    end

    status = if snapshot.updating?
      "updating"
    elsif snapshot.payload && snapshot.format_version == DiscordGuildSnapshot::FORMAT_VERSION
      snapshot.stale? ? "stale" : "current"
    else
      "unavailable"
    end
    result = {
      guild_id:,
      status:,
      fetched_at: snapshot.fetched_at,
      last_attempted_at: snapshot.last_attempted_at,
      retry_after: [ snapshot.retry_in, snapshot.manual_retry_in ].max,
      error: snapshot.last_error,
      cooldown: claim == :cooldown
    }
    return result unless snapshot.payload && snapshot.format_version == DiscordGuildSnapshot::FORMAT_VERSION

    data = snapshot.payload
    guild = data.fetch("guild")
    roles = data.fetch("roles")
    # Cached channel overwrites may have changed while Discord was unavailable.
    # Keep the snapshot, but do not expose its channel names until it is current.
    channels = snapshot.stale? ? [] : visible_channels(guild, data.fetch("channels"), roles, member, account.discord_id)
    result.merge(
      guild: guild.slice("id", "name", "icon", "banner", "description", "features"),
      channels: channels.map { |channel| channel.slice("id", "name", "type", "parent_id", "position") },
      roles: roles.map { |role| role.slice("id", "name", "color", "position") }
    )
  end

  def self.fetch(guild_id)
    authorization = DiscordContexts.bot_authorization
    guild = DiscordApi.get("/guilds/#{guild_id}", authorization:)
    channels = DiscordApi.get("/guilds/#{guild_id}/channels", authorization:)
    roles = DiscordApi.get("/guilds/#{guild_id}/roles", authorization:)
    raise DiscordApi::Unavailable unless guild.is_a?(Hash) && guild["id"].to_s == guild_id && channels.is_a?(Array) && roles.is_a?(Array)

    guild_fields = %w[id name icon banner description features owner_id preferred_locale verification_level nsfw_level premium_tier]
    channel_fields = %w[id name type parent_id position flags permission_overwrites nsfw topic]
    role_fields = %w[id name color position permissions flags mentionable hoist icon unicode_emoji tags]
    raise DiscordApi::Unavailable unless channels.all? { |item| item.is_a?(Hash) && item["id"].to_s.match?(/\A\d+\z/) && item["type"].is_a?(Integer) && item["permission_overwrites"].is_a?(Array) }
    raise DiscordApi::Unavailable unless roles.all? { |item| item.is_a?(Hash) && item["id"].to_s.match?(/\A\d+\z/) && item["permissions"].to_s.match?(/\A\d+\z/) }

    {
      "guild" => guild.slice(*guild_fields),
      "channels" => channels.map { |item| item.slice(*channel_fields) },
      "roles" => roles.map { |item| item.slice(*role_fields) }
    }
  end

  def self.visible_channels(guild, channels, roles, member, user_id)
    role_permissions = roles.to_h { |role| [ role["id"].to_s, role["permissions"].to_i ] }
    member_roles = member["roles"]
    return [] unless member_roles.is_a?(Array) && role_permissions.key?(guild["id"].to_s) && member_roles.all? { |id| role_permissions.key?(id.to_s) }

    owner = guild["owner_id"].to_s == user_id
    base = role_permissions.fetch(guild["id"].to_s)
    member_roles.each { |id| base |= role_permissions.fetch(id.to_s) }
    visible = channels.select do |channel|
      owner || (base & ADMINISTRATOR).positive? || viewable?(channel, guild["id"].to_s, user_id, member_roles.map(&:to_s), base)
    end
    visible.sort_by { |channel| [ channel["parent_id"].to_s, channel["position"].to_i, channel["id"].to_s ] }
  end

  def self.viewable?(channel, guild_id, user_id, member_roles, base)
    permissions = base
    overwrites = channel["permission_overwrites"]
    return false unless overwrites.is_a?(Array) && overwrites.all? do |item|
      item.is_a?(Hash) && item["id"].to_s.match?(/\A\d+\z/) && [ 0, 1 ].include?(item["type"]) &&
        item["allow"].to_s.match?(/\A\d+\z/) && item["deny"].to_s.match?(/\A\d+\z/)
    end

    everyone = overwrites.find { |item| item["id"].to_s == guild_id && item["type"].to_i == 0 }
    permissions = apply(permissions, everyone) if everyone
    role_overwrites = overwrites.select { |item| item["type"].to_i == 0 && member_roles.include?(item["id"].to_s) }
    permissions = (permissions & ~role_overwrites.reduce(0) { |bits, item| bits | item["deny"].to_i }) |
      role_overwrites.reduce(0) { |bits, item| bits | item["allow"].to_i }
    individual = overwrites.find { |item| item["id"].to_s == user_id && item["type"].to_i == 1 }
    permissions = apply(permissions, individual) if individual
    (permissions & VIEW_CHANNEL).positive?
  end

  def self.apply(permissions, overwrite)
    (permissions & ~overwrite["deny"].to_i) | overwrite["allow"].to_i
  end
  private_class_method :fetch, :visible_channels, :viewable?, :apply
end
