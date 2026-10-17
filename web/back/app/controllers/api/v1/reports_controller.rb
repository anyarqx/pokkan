module Api
  module V1
    class ReportsController < KitsController
      rate_limit to: 5, within: 1.hour, by: -> { "account:#{current_account.id}" }, name: "reports_account", with: :rate_limited
      rate_limit to: 10, within: 1.hour, by: -> { request.remote_ip }, name: "reports_network", with: :rate_limited

      def create
        data = params.require(:report)
        raise ActionController::BadRequest unless data.is_a?(ActionController::Parameters) && (data.keys - %w[kind contact location details share_id temporary_id kit_id]).empty?
        raise ActionController::BadRequest unless data[:details].is_a?(String) && data[:kind].is_a?(String)
        raise ActionController::BadRequest unless %i[contact location].all? { |field| data[field].nil? || data[field].is_a?(String) }
        if ResourceReport.where(closed_at: nil).count >= 2_000
          return render_error("Reports are temporarily unavailable. Please use the support link.", code: "reports_unavailable", status: :service_unavailable)
        end

        share = KitShare.includes(:kit).find_by(id: data[:share_id]) if data[:share_id].is_a?(String)
        token = request.authorization.to_s[/\ABearer ([A-Za-z0-9_-]{43})\z/, 1]
        kit = share.kit if share&.permits?(token)
        if data[:temporary_id].is_a?(String)
          candidate = Kit.find_by(id: data[:temporary_id])
          kit = candidate if candidate&.managed_with?(token)
        elsif data[:kit_id].is_a?(String)
          candidate = Kit.find(data[:kit_id])
          access!(candidate)
          kit = candidate
        end
        location = data[:location].to_s
        uri = URI.parse(location)
        location = uri.path if uri.is_a?(URI::HTTPS) && uri.host == "pokkan.net"
        location = nil unless location.match?(%r{\A/(?:en|pt-BR|es|ja)/(?:shared|kits)/[0-9a-f-]{36}\z})
        details = data[:details].gsub(%r{(https://pokkan\.net/[^\s#]+)#[^\s]+}, '\1').gsub(%r{https://(?:discord\.com|discordapp\.com)/api/(?:v\d+/)?webhooks/[^\s]+}, "[redacted webhook URL]")
        report = ResourceReport.create!(discord_account: current_account, kit:, kind: data[:kind], contact: data[:contact], location:, details:)
        record_audit!(account: current_account, action: "report.create", target_type: "ResourceReport", target_id: report.id)
        render json: { reference: report.id }, status: :created
      rescue ActiveRecord::RecordInvalid, URI::InvalidURIError
        render_error("Check the report details and optional email address.", code: "report_invalid", status: :unprocessable_entity)
      end

      private

      def rate_limited
        response.set_header("Retry-After", "3600")
        render_error("Too many reports. Please wait or use support.", code: "report_rate_limited", status: :too_many_requests)
      end
    end
  end
end
