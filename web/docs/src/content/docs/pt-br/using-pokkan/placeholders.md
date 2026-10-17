---
title: Placeholders e valores de prévia
description: Insira valores de exemplo e entenda o que a prévia conhece sobre o servidor e o que será enviado ao Discord.
sidebar:
  order: 3
---

Um Placeholder marca um valor que pode variar, como `{guild.name}` e `{guild.id}` para o servidor de um Kit. O catálogo também oferece `{bot.name}`, com o nome da Pokkan. Para outros dados, você pode cadastrar um Placeholder próprio com um valor de exemplo, como `{event.name}`. Ele faz parte do texto armazenado e não executa código.

## Insira um Placeholder

1. Abra **Placeholders** no editor para consultar os disponíveis ou cadastrar um nome e valor de exemplo próprios.
2. Em um campo de texto compatível, digite `{` e escolha uma sugestão.
3. Saia da edição do campo para ver a representação na prévia. Para conferir o texto armazenado, volte a editar ou abra JSON.

Um exemplo ajuda a avaliar o tamanho e a leitura da frase. Se você definir “Clube de astronomia” para um nome de servidor, isso não busca nem confirma a existência desse servidor no Discord.

<img src="/screenshots/pokkan-placeholders.webp" alt="Catálogo de Placeholders com valores de exemplo para a prévia" loading="lazy" width="2560" height="2000" />

## Valores conhecidos do servidor

Em um Kit de servidor disponível para sua conta, as prévias do editor e de envio mostram o nome e o ID reais em `{guild.name}` e `{guild.id}`. Um Kit pessoal não recebe os dados de um servidor selecionado em outra parte da aplicação.

O catálogo não oferece usuário, avatar, canal ou mensagem de origem, pois escolher um servidor não informa quem usará o Kit nem onde ele será publicado. Você ainda pode cadastrar seus próprios exemplos para preparar o texto, sem que isso busque esses dados no Discord.

## Confira o texto antes de enviar

O envio direto por webhook usa o texto armazenado. Ele não troca os Placeholders pelos exemplos ou pelos dados de servidor mostrados na prévia, então substitua-os pelo que deve aparecer na publicação.

Se houver dúvida, abra **JSON → Payload do Discord** para conferir o conteúdo. Um Placeholder que continuar ali, como `{guild.name}`, poderá aparecer literalmente no Discord.

Continue em [Envie sua mensagem](/pt-br/guide/send/) ou veja [como inserir referências fixas a canais e cargos](/pt-br/using-pokkan/servers/).
