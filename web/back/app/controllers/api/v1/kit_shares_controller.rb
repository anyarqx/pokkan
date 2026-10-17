module Api
  module V1
    # Reuses Kit content validation, ownership authorization and Discord error handling.
    class KitSharesController < KitsController
      rate_limit to: 30, within: 1.minute, by: -> { request.remote_ip }, name: "share_management", with: :sharing_rate_limited

      def index
        kit = managed_kit
        render json: { shares: kit.kit_shares.where("expires_at IS NULL OR expires_at > ?", Time.current).order(created_at: :desc).map { |share| represent_share(share) } }
      end

      def create
        kit = managed_kit
        data = share_payload
        share = nil
        token = nil
        kit.with_lock do
          verify_management!(kit)
          return restricted if kit.sharing_suspended_at
          kit.kit_shares.where(expires_at: ..Time.current).delete_all
          if kit.kit_shares.count >= 20
            return render_error("Revoke an existing link before creating another.", code: "share_limit", status: :unprocessable_entity)
          end
          share = kit.kit_shares.build(permission: "view", audience: kit.guild_id ? "members" : "anyone")
          assign_share(share, data)
          share.expires_at ||= kit.temporary_expires_at
          token = share.rotate_token!
          share.save!
          audit_sharing(kit)
        end
        render json: { share: represent_share(share), token: }, status: :created
      rescue ActiveRecord::RecordInvalid
        render_error("The link settings are invalid.", code: "share_invalid", status: :unprocessable_entity)
      end

      def update
        change_share { |share| assign_share(share, share_payload); share.save! }
      end

      def regenerate
        change_share { |share| token = share.rotate_token!; share.save!; token }
      end

      def destroy
        kit = managed_kit
        kit.with_lock do
          verify_management!(kit)
          kit.kit_shares.find(params[:id]).destroy!
          audit_sharing(kit)
        end
        head :no_content
      end

      private

      def managed_kit
        kit = Kit.find(params[:kit_id])
        access!(kit, mutate: true)
        kit
      end

      def verify_management!(_kit)
        # Permanent ownership cannot be changed by either Kit or share updates.
      end

      def change_share
        kit = managed_kit
        token = nil
        share = nil
        kit.with_lock do
          verify_management!(kit)
          return restricted if kit.sharing_suspended_at
          share = kit.kit_shares.find(params[:id])
          token = yield share
          audit_sharing(kit)
        end
        render json: { share: represent_share(share) }.merge(token.is_a?(String) ? { token: } : {})
      rescue ActiveRecord::RecordInvalid
        render_error("The link settings are invalid.", code: "share_invalid", status: :unprocessable_entity)
      end

      def share_payload
        data = params[:share] || ActionController::Parameters.new
        raise ActionController::BadRequest unless data.is_a?(ActionController::Parameters) && (data.keys - %w[permission audience lifetime_hours]).empty?

        data.to_unsafe_h
      end

      def assign_share(share, data)
        share.assign_attributes(data.slice("permission", "audience"))
        return unless data.key?("lifetime_hours")

        hours = data["lifetime_hours"]
        raise ActionController::BadRequest unless [ 0, 1, 24, 168, 720 ].include?(hours) && hours.is_a?(Integer)

        share.expires_at = hours.zero? ? nil : hours.hours.from_now
        if share.kit.temporary_expires_at
          share.expires_at = [ share.expires_at || share.kit.temporary_expires_at, share.kit.temporary_expires_at ].min
        end
      end

      def represent_share(share)
        share.as_json(only: %i[id permission audience expires_at created_at])
      end

      def audit_sharing(kit)
        record_audit!(account: current_account, action: "kit.share", target_type: "Kit", target_id: kit.id) if current_account
      end

      def sharing_rate_limited
        response.set_header("Retry-After", "60")
        render_error("Too many sharing requests. Try again shortly.", code: "share_rate_limited", status: :too_many_requests)
      end

      def restricted
        render_error("Sharing is restricted for this Kit. Contact support if you need help.", code: "sharing_restricted", status: :forbidden)
      end
    end
  end
end
