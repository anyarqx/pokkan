Rails.application.routes.draw do
  get "/api/v1/health", to: "api/v1/health#show"
  get "/api/v1/ready", to: "api/v1/health#ready"
  get "/api/v1/csrf", to: "api/v1/csrf#show"
  namespace :api do
    namespace :v1 do
      resources :reports, only: :create
      resources :kits, only: %i[index show update destroy] do
        resources :shares, controller: "kit_shares", only: %i[index create update destroy] do
          post :regenerate, on: :member
        end
      end
      resources :shared_kits, only: %i[show update]
      resources :temporary_kits, only: %i[create show update destroy] do
        resources :shares, controller: "temporary_kit_shares", only: %i[index create update destroy] do
          post :regenerate, on: :member
        end
      end
      get "contexts", to: "contexts#index"
      post "contexts/refresh", to: "contexts#refresh"
      post "contexts/select", to: "contexts#select"
      get "contexts/:guild_id/metadata", to: "contexts#metadata"
      post "contexts/:guild_id/metadata/refresh", to: "contexts#refresh_metadata"
    end
  end
  get "/auth/discord", to: "auth/discord#start"
  get "/auth/discord/install", to: "auth/discord#install"
  get "/auth/discord/callback", to: "auth/discord#callback"
  get "/api/v1/auth/session", to: "auth/discord#session_info"
  delete "/api/v1/auth/session", to: "auth/discord#destroy"

  root to: "api/v1/health#show"
end
