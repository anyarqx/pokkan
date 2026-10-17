---
title: Crie um webhook no Discord
description: Obtenha com segurança o link que permite enviar mensagens da Pokkan para um canal.
sidebar:
  order: 6
---

Um webhook é um link especial do Discord que permite à Pokkan publicar em um canal. Não é necessário instalar um bot.

## No Discord

Você precisa da permissão **Gerenciar webhooks**. Use o Discord no computador ou navegador e escolha um canal de testes.

![Caminho no Discord: menu do servidor, Configurações do servidor, Integrações, Webhooks, Novo webhook e Copiar URL do webhook; ilustração em inglês](/illustrations/discord-webhook-path.svg)

1. Abra o menu ao lado do nome do servidor e escolha **Configurações do servidor**.
2. Entre em **Integrações → Webhooks**.
3. Crie um webhook ou abra um que você tenha autorização para usar.
4. Dê um nome, escolha o canal e salve as alterações.
5. Copie a **URL do webhook**. O link começa com `https://discord.com/api/webhooks/`.

## Na Pokkan

Abra **Mensagens → Enviar**, selecione o Kit e cole o link no campo de webhook. Confira o Kit e o canal de destino antes de enviar.

<picture>
  <source media="(max-width: 48rem)" srcset="/screenshots/pokkan-send-message-mobile.webp" />
  <img src="/screenshots/pokkan-send-message.webp" alt="Página de envio da Pokkan com prévia e campo de webhook vazio; interface em inglês" />
</picture>

Confira a mensagem e envie uma vez. Abra o canal no Discord para confirmar. Cada envio bem-sucedido cria uma nova mensagem; editar o Kit não altera uma mensagem já publicada.

:::caution[Mantenha o link em segredo]
Quem possui a URL pode usar o webhook. Não a coloque em mensagens, Kits, capturas ou pedidos de suporte. Se expuser o link, exclua e recrie o webhook no Discord.
:::

Se a opção Webhooks não aparecer, peça à administração para conferir suas permissões. Copie a URL do webhook, não o convite do servidor nem o link do canal.

Se os menus estiverem diferentes, o [guia ilustrado do Discord](https://support.discord.com/hc/pt-br/articles/228383668-Intro-to-Webhooks) mostra onde procurar. Para dificuldades no envio, consulte a [lista de verificação em inglês](/en/using-pokkan/troubleshooting/).

Próximo: **[Envie sua mensagem →](/pt-br/guide/send/)**
