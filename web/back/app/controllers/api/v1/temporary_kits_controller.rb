module Api
  module V1
    class TemporaryKitsController < SharedKitsController
      rate_limit to: 10, within: 1.hour, only: :create, by: -> { request.remote_ip }, name: "temporary_creation", with: :creation_rate_limited

      def create
        data = kit_payload
        raise ActionController::BadRequest if data.key?("guild_id") || data.key?("revision")

        hours = params[:lifetime_hours] || 24
        raise ActionController::BadRequest unless hours.is_a?(Integer) && [ 1, 24, 168 ].include?(hours)

        if Kit.where.not(temporary_expires_at: nil).count >= 1_000
          return render_error("Temporary sharing is at capacity. Try again later.", code: "share_capacity", status: :service_unavailable)
        end
        manager = SecureRandom.urlsafe_base64(32)
        kit = Kit.new(temporary_expires_at: hours.hours.from_now, management_token_digest: KitShare.digest(manager))
        assign_content(kit, data)
        share = kit.kit_shares.build(permission: params[:permission] || "view", audience: "anyone", expires_at: kit.temporary_expires_at)
        token = share.rotate_token!
        Kit.transaction { kit.save!; share.save! }
        render json: { kit: management_representation(kit), share: share.as_json(only: %i[id permission audience expires_at created_at]), token:, management_token: manager, expires_at: kit.temporary_expires_at }, status: :created
      rescue ActiveRecord::RecordInvalid
        render_error("The Kit data is invalid.", code: "kit_invalid", status: :unprocessable_entity)
      end

      def show
        with_managed_kit do |kit|
          render json: { kit: management_representation(kit), expires_at: kit.temporary_expires_at }
        end
      end

      def update
        with_managed_kit do |kit|
          update_shared_content!(kit)
          render json: { kit: management_representation(kit) }
        end
      rescue ActiveRecord::RecordInvalid
        render_error("The Kit data is invalid.", code: "kit_invalid", status: :unprocessable_entity)
      end

      def destroy
        with_managed_kit(&:destroy!)
        head :no_content
      end

      private

      def management_representation(kit)
        shared_representation(kit, edit: true).merge(sharing_restricted: kit.sharing_suspended_at.present?, sharing_restriction_reason: kit.sharing_restriction_reason)
      end

      def with_managed_kit
        kit = Kit.find(params[:id])
        kit.with_lock do
          raise ActiveRecord::RecordNotFound unless kit.managed_with?(bearer_token)

          yield kit
        end
      end

      def creation_rate_limited
        response.set_header("Retry-After", "3600")
        render_error("Too many temporary copies. Try again later.", code: "share_rate_limited", status: :too_many_requests)
      end
    end
  end
end
