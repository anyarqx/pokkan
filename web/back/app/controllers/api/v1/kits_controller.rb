module Api
  module V1
    class KitsController < ApplicationController
      class RevisionConflict < StandardError; end

      before_action :require_account!

      rescue_from DiscordOauth::ConsentRequired do
        render_error("Discord server access needs to be authorized again.", code: "authorization_required", status: :unauthorized)
      end
      rescue_from DiscordApi::NotFound, DiscordApi::Forbidden do
        render_error("The requested resource was not found.", code: "not_found", status: :not_found)
      end
      rescue_from DiscordApi::Unavailable, DiscordApi::Unauthorized, DiscordContexts::BotNotConfigured do
        render_error("Discord server access is temporarily unavailable.", code: "discord_unavailable", status: :service_unavailable)
      end
      rescue_from DiscordApi::RateLimited do |error|
        response.set_header("Retry-After", error.retry_after.ceil.to_s)
        render_error("Discord asked us to wait before checking server access.", code: "discord_rate_limited", status: :too_many_requests)
      end
      rescue_from ActiveRecord::StaleObjectError do
        conflict
      end
      rescue_from RevisionConflict do
        conflict
      end

      def index
        context_id = params[:context_id].presence || "personal"
        if context_id == "personal"
          kits = current_account.kits.where(guild_id: nil)
          admin = false
        else
          raise ActiveRecord::RecordNotFound unless context_id.match?(/\A\d+\z/)

          member = DiscordContexts.member!(current_account, context_id)
          kits = Kit.where(guild_id: context_id)
          admin = kits.where.not(discord_account_id: current_account.id).exists? && admin_for_display(context_id, member)
        end
        render json: { kits: kits.includes(:discord_account).order(updated_at: :desc).map { |kit| represent(kit, admin:) } }
      end

      def show
        kit = Kit.find(params[:id])
        admin = access!(kit)
        render json: { kit: represent(kit, admin:) }
      end

      def update
        payload = kit_payload
        kit = Kit.find_by(id: params[:id])
        if kit
          raise ActionController::BadRequest if payload.key?("guild_id")

          admin = access!(kit, mutate: true)
          revision = payload["revision"]
          raise RevisionConflict unless revision.is_a?(Integer)

          kit.with_lock do
            raise RevisionConflict if revision.is_a?(Integer) && revision != kit.lock_version

            assign_content(kit, payload)
            kit.save!
            record_audit!(account: current_account, action: "kit.update", target_type: "Kit", target_id: kit.id)
          end
        else
          raise ActionController::BadRequest if payload.key?("revision")

          guild_id = payload["guild_id"].presence
          raise ActionController::BadRequest if payload.key?("guild_id") && (!guild_id.is_a?(String) || !guild_id.match?(/\A\d+\z/))

          DiscordContexts.member!(current_account, guild_id) if guild_id
          kit = current_account.kits.build(id: params[:id], guild_id:)
          assign_content(kit, payload)
          kit.transaction do
            kit.save!
            record_audit!(account: current_account, action: "kit.create", target_type: "Kit", target_id: kit.id)
          end
          admin = false
        end
        render json: { kit: represent(kit, admin:) }
      rescue ActiveRecord::RecordInvalid
        render_error(kit.errors.full_messages.to_sentence, code: "kit_invalid", status: :unprocessable_entity)
      rescue ActiveRecord::RecordNotUnique
        conflict
      end

      def destroy
        kit = Kit.find(params[:id])
        access!(kit, mutate: true)
        revision = params[:revision]
        raise RevisionConflict if kit.guild_id && !revision.to_s.match?(/\A\d+\z/)

        kit.with_lock do
          raise RevisionConflict if revision.present? && revision.to_i != kit.lock_version

          record_audit!(account: current_account, action: "kit.delete", target_type: "Kit", target_id: kit.id)
          kit.destroy!
        end
        head :no_content
      end

      private

      def kit_payload
        payload = params.require(:kit)
        raise ActionController::BadRequest unless payload.is_a?(ActionController::Parameters)

        required = %w[name arguments message placeholders]
        raise ActionController::BadRequest unless (payload.keys - %w[guild_id revision]).sort == required.sort

        data = payload.to_unsafe_h
        raise ActionController::BadRequest unless data["name"].is_a?(String)

        data
      end

      def assign_content(kit, data)
        kit.assign_attributes(name: data["name"], arguments: data["arguments"], message: data["message"], placeholders: data["placeholders"])
      end

      def access!(kit, mutate: false)
        if kit.guild_id.nil?
          raise ActiveRecord::RecordNotFound unless kit.discord_account_id == current_account.id

          return false
        end

        member = DiscordContexts.member!(current_account, kit.guild_id)
        return false if kit.discord_account_id == current_account.id

        admin = mutate ? DiscordContexts.guild_admin?(current_account, kit.guild_id, member) : admin_for_display(kit.guild_id, member)
        raise ActiveRecord::RecordNotFound if mutate && !admin

        admin
      end

      def admin_for_display(guild_id, member)
        DiscordContexts.guild_admin?(current_account, guild_id, member)
      rescue DiscordApi::Unavailable
        false
      end

      def represent(kit, admin:)
        kit.as_json(only: %i[id name arguments message placeholders guild_id]).merge(
          "creator_id" => kit.discord_account.discord_id,
          "revision" => kit.lock_version,
          "can_manage_sharing" => kit.guild_id.nil? || kit.discord_account_id == current_account.id || admin,
          "sharing_restricted" => kit.sharing_suspended_at.present?,
          "sharing_restriction_reason" => (kit.sharing_restriction_reason if kit.guild_id.nil? || kit.discord_account_id == current_account.id || admin),
          "can_edit" => kit.guild_id.nil? || kit.discord_account_id == current_account.id || admin
        )
      end

      def conflict
        render_error("This Kit changed elsewhere. Reload it before saving again.", code: "kit_conflict", status: :conflict)
      end
    end
  end
end
