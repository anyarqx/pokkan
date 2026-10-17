namespace :reports do
  desc "List pending reports without printing their content or contact information"
  task pending: :environment do
    ResourceReport.where(closed_at: nil).order(:created_at).limit(100).each do |report|
      puts [ report.id, report.kind, report.kit_id, report.created_at.iso8601 ].join("\t")
    end
  end

  desc "Read a report privately: reports:show[report_uuid]"
  task :show, [ :id ] => :environment do |_task, args|
    report = ResourceReport.find(args.fetch(:id))
    puts JSON.pretty_generate(report.attributes.except("discord_account_id"))
    puts "Discord requester: #{report.discord_account&.discord_id}" if report.discord_account
  end

  %w[restrict restore close].each do |action|
    desc "#{action.capitalize} a reported resource: reports:#{action}[report_uuid], with OPERATOR and REASON"
    task action, [ :id ] => :environment do |_task, args|
      operator = ENV.fetch("OPERATOR").strip
      reason = ENV.fetch("REASON").strip
      abort "OPERATOR (1–80 characters) and REASON (1–500 characters) are required." unless operator.length.between?(1, 80) && reason.length.between?(1, 500)

      report = ResourceReport.find(args.fetch(:id))
      ResourceReport.transaction do
        if action != "close"
          kit = report.kit || raise(ActiveRecord::RecordNotFound, "The reported Kit is unavailable.")
          kit.with_lock do
            kit.update!(sharing_suspended_at: action == "restrict" ? Time.current : nil, sharing_restriction_reason: action == "restrict" ? reason : nil)
          end
        end
        report.update!(outcome: "#{action}: #{reason}".truncate(500), handled_by: operator, closed_at: Time.current)
      end
      Rails.logger.info(event: "report.#{action}", report_id: report.id, kit_id: report.kit_id, operator:)
      puts "Recorded #{action} for report #{report.id}."
    end
  end

  desc "Remove reports older than 180 days, or closed more than 90 days ago"
  task prune: :environment do
    ResourceReport.prune_expired!
  end
end
