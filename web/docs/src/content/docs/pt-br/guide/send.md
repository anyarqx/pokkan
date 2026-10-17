---
title: Envie sua mensagem
description: Confira a prévia e publique em um canal usando o webhook que você criou.
sidebar:
  order: 7
---

Você precisa de um Kit e da [URL do webhook](/pt-br/guide/create-webhook/). Faça o primeiro envio em um canal de testes.

## Na Pokkan

1. No editor, escolha **Enviar**. Você também pode abrir **Mensagens → Enviar** e selecionar um Kit.
2. Confira texto, links, imagens e menções na prévia.
3. Cole a URL no campo do webhook. Corrija os erros indicados antes de continuar.
4. Escolha **Enviar agora** uma vez.

![Página Mensagens com Enviar selecionado, prévia e campo de webhook vazio; interface em inglês](/screenshots/pokkan-send-message.webp)

## No Discord

Abra o canal do webhook e confirme que a mensagem chegou.

:::caution[Cada envio cria uma publicação]
Enviar de novo cria outra mensagem. Editar ou excluir o Kit não altera uma mensagem já publicada no Discord.
:::

Após um envio bem-sucedido, a Pokkan guarda o webhook neste navegador por até 30 dias, separadamente para cada conta ou visitante. Limpe o campo para remover a URL salva. Ela não acompanha Kits salvos ou compartilhados, e é melhor evitar essa opção em dispositivos de uso compartilhado.

Se quiser levar o leitor a um site, use um botão de link. Botões que executam ações de aplicação e uploads de arquivos ainda não são compatíveis com esse envio; a Pokkan indica essas limitações antes de continuar.

Se a mensagem usa Placeholders, confira também **JSON → Discord Payload**. A prévia pode mostrar um exemplo ou o nome conhecido do servidor, mas o webhook envia o texto armazenado. Troque os tokens pelo texto que deve aparecer no canal.

Se falhar, confira a URL, o canal e os erros de validação. Não clique repetidamente enquanto um envio estiver em andamento. A [lista de solução de problemas em inglês](/en/using-pokkan/troubleshooting/) traz mais detalhes.

Próximo: **[Salve e reabra um Kit →](/pt-br/guide/save/)**
