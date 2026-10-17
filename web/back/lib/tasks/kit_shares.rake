namespace :kits do
  desc "Remove expired temporary Kits and access links in bounded batches"
  task prune_shares: :environment do
    loop do
      expired = Kit.where(temporary_expires_at: ..Time.current).exists? || KitShare.where(expires_at: ..Time.current).exists?
      break unless expired

      Kit.prune_temporary!
    end
  end
end
