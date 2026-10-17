---
title: Components V2を試す
description: サンプルを編集し、テキストとリンクボタンのSectionを追加します。
sidebar:
  order: 5
---

Components V2では、メッセージの各要素を組み合わせてレイアウトを作れます。Legacyとは別の形式で、embedに追加する機能ではありません。

1. [Components V2のサンプルを開きます](https://pokkan.net/ja/kits?example=components-v2)。編集できる新しい下書きになります。
2. 見出しや受付時間を書き換えます。
3. Containerを選択してアクセント色を変更または解除します。
4. **＋**から**Section**を追加します。テキストを入力し、アクセサリーの場所でボタンかサムネイルを選びます。
5. Webサイトを開くボタンは、ボタン上のスタイル選択から**Link**を選びます。ラベルは直接編集し、完全なURLは設定に入力します。

<img src="/screenshots/pokkan-section-link.webp" alt="テキストとリンクボタンを配置したSection" width="2560" height="2000" loading="lazy" decoding="async" />

Sectionにはテキストとアクセサリーが必要です。検証結果で未完成と表示されなくなったことを確認します。アクセサリーはテキストとは別の場所に入ります。

通常のボタンにはクリックに応答するアプリケーションが必要ですが、現在のPokkanの送信機能にはその処理がありません。この例ではLinkを使ってください。

embedや投票にはLegacyのKitを使います。既存のメッセージの形式を変える前にコピーを残しましょう。

次へ：**[Webhookを作成する →](/ja/guide/create-webhook/)**
