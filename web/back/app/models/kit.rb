class Kit < ApplicationRecord
  SAVED_LIMIT = 15
  class CapacityExceeded < StandardError; end

  belongs_to :discord_account, optional: true
  has_many :kit_shares, dependent: :delete_all

  before_validation(on: :create) { self.id ||= SecureRandom.uuid }
  validates :id, format: { with: /\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/ }
  validates :name, presence: true, length: { maximum: 160 }
  validates :guild_id, format: { with: /\A\d+\z/ }, allow_nil: true
  validates :sharing_restriction_reason, length: { maximum: 500 }
  validate :persistent_data
  validate do
    if temporary_expires_at
      errors.add(:base, "temporary copies cannot have account or server ownership") if discord_account_id || guild_id
      errors.add(:management_token_digest, "is required") unless management_token_digest&.match?(/\A[0-9a-f]{64}\z/)
    else
      errors.add(:discord_account, "is required") unless discord_account
      errors.add(:management_token_digest, "requires a temporary copy") if management_token_digest
    end
  end

  def available?
    temporary_expires_at.nil? || temporary_expires_at > Time.current
  end

  def managed_with?(token)
    temporary_expires_at && available? && token.is_a?(String) && token.match?(/\A[A-Za-z0-9_-]{43}\z/) &&
      ActiveSupport::SecurityUtils.secure_compare(management_token_digest, KitShare.digest(token))
  end

  # Bounded request-driven maintenance also runs from the explicit maintenance task.
  def self.prune_temporary!(limit: 100)
    where(temporary_expires_at: ..Time.current).limit(limit).each do |kit|
      kit.with_lock { kit.destroy! unless kit.available? }
    rescue ActiveRecord::RecordNotFound
      # Another request already removed the expired copy.
    end
    KitShare.where(expires_at: ..Time.current).limit(limit).delete_all
  end

  private

  def persistent_data
    { message: [ Hash, 256.kilobytes ], arguments: [ Array, 64.kilobytes ], placeholders: [ Array, 128.kilobytes ] }.each do |field, (type, limit)|
      value = public_send(field)
      unless value.is_a?(type) && safe_json?(value) && JSON.generate(value).bytesize <= limit
        errors.add(field, "must be bounded JSON #{type.name.downcase} data")
      end
    end
    validate_arguments if arguments.is_a?(Array)
    if placeholders.is_a?(Array)
      keys = %w[key label description category type example]
      valid = placeholders.length <= 256 && placeholders.all? do |item|
        item.is_a?(Hash) && item.keys.sort == keys.sort &&
          item.values.all? { |value| value.is_a?(String) && value.length <= 4_000 } &&
          %w[string number boolean url color snowflake].include?(item["type"])
      end
      errors.add(:placeholders, "must contain text placeholder definitions") unless valid
    end
  end

  def validate_arguments
    names = []
    valid = arguments.length <= 32 && arguments.all? do |item|
      next false unless item.is_a?(Hash) && (item.keys - %w[name type required default]).empty?

      name = item["name"]
      unique = !names.include?(name)
      names << name
      unique && name.is_a?(String) && name.match?(/\A[a-z][a-z0-9_]{0,31}\z/) &&
        %w[string integer number boolean snowflake color url].include?(item["type"]) &&
        [ true, false ].include?(item["required"]) &&
        (item["default"].nil? || (!item["required"] && item["default"].is_a?(String)))
    end
    errors.add(:arguments, "must contain unique, typed argument definitions") unless valid
  end

  def safe_json?(value, depth = 0)
    return false if depth > 32

    case value
    when Hash then value.all? { |key, item| key.is_a?(String) && safe_json?(item, depth + 1) }
    when Array then value.all? { |item| safe_json?(item, depth + 1) }
    when String, Integer, TrueClass, FalseClass, NilClass then true
    when Float then value.finite?
    else false
    end
  end
end
