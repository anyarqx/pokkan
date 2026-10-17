---
title: Webhooks
description: Entenda como um webhook envia mensagens para um canal e por que seu endereço deve ficar em segredo.
sidebar:
  order: 2
---

Um webhook é um link especial que permite publicar em um canal do Discord. A Pokkan usa esse endereço para enviar a mensagem que você montou, sem exigir que você crie uma aplicação ou instale um bot.

O nome, o avatar e o canal de destino do webhook são configurados no Discord. A URL inteira precisa ficar em segredo, pois quem tiver esse link poderá usar o webhook. Não a inclua no conteúdo de um Kit nem em capturas de tela ou pedidos de suporte.

Um webhook não substitui um bot que responde a ações. Um Botão de link pode abrir um site, mas um Botão para criar tickets ou atribuir cargos depende de uma aplicação que implemente essa tarefa. A Pokkan permite preparar esses controles no editor, porém seu envio direto não executa as ações e recusa componentes que dependem delas.

Siga [Crie um webhook no Discord](/pt-br/guide/create-webhook/) para obter o endereço e depois [Envie sua mensagem](/pt-br/guide/send/) para publicar em um canal.

Referências oficiais: [introdução aos webhooks](https://support.discord.com/hc/pt-br/articles/228383668-Intro-to-Webhooks) e [API de webhooks](https://docs.discord.com/developers/resources/webhook).
