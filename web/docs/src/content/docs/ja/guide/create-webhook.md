---
title: DiscordのWebhookを作成する
description: Pokkanからチャンネルに投稿するためのWebhook URLを安全に取得します。
sidebar:
  order: 6
---

Webhookは、Pokkanから特定のDiscordチャンネルに投稿するための専用リンクです。Botをインストールする必要はありません。

## Discordで取得する

**Webhookの管理**権限が必要です。PC版またはブラウザー版のDiscordで、テスト用のチャンネルを選んでください。

![DiscordでWebhookを作る順序。サーバーメニュー、サーバー設定、連携サービス、Webhook、新規作成、URLのコピー。図中の表記は英語](/illustrations/discord-webhook-path.svg)

1. サーバー名の横にあるメニューから**サーバー設定**を開きます。
2. **連携サービス → Webhook**を開きます。
3. Webhookを新規作成するか、使用を許可された既存のWebhookを選びます。
4. 名前と送信先チャンネルを設定して、変更を保存します。
5. **Webhook URLをコピー**します。リンクは `https://discord.com/api/webhooks/` で始まります。

## Pokkanで使う

**キット → 送信**でKitを選び、Webhookの入力欄にURLを貼り付けます。送信前にKitと送信先チャンネルを確認してください。

<picture>
  <source media="(max-width: 48rem)" srcset="/screenshots/pokkan-send-message-mobile.webp" />
  <img src="/screenshots/pokkan-send-message.webp" alt="メッセージのプレビューと空のWebhook入力欄があるPokkan送信画面。英語表示" />
</picture>

内容を確認して一度だけ送信し、Discordのチャンネルに届いたことを確認します。送信するたびに新しいメッセージが作られます。Kitを編集しても、投稿済みのメッセージは変わりません。

:::caution[Webhook URLは秘密にしてください]
URLを知っている人はWebhookを使用できます。メッセージ、Kit、スクリーンショットや問い合わせに含めないでください。公開してしまった場合は、Discordで削除して作り直します。
:::

Webhookの項目が見つからないときは、管理者に権限を確認してもらってください。チャンネルのリンクや招待リンクとは異なります。

メニューの位置が違う場合は、[Discord公式の図解ガイド](https://support.discord.com/hc/ja/articles/228383668-Intro-to-Webhooks)で確認できます。送信エラーについては[英語のトラブルシューティング](/en/using-pokkan/troubleshooting/)も参照してください。

次へ：**[メッセージを送信する →](/ja/guide/send/)**
