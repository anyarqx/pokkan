---
title: Selecione, mova e edite partes da mensagem
description: Edite na própria mensagem, insira elementos e use os controles por mouse, toque ou teclado.
sidebar:
  order: 4
---

Clique no texto para escrever ou selecione a borda de um elemento para alterar suas propriedades e posição. A formatação é atualizada na própria mensagem durante a digitação. Escape encerra a edição do texto para que você possa trabalhar com o elemento inteiro.

## Escreva e formate

Digite os marcadores de Markdown na própria mensagem, como `**negrito**` ou `- Item`. A formatação depende do campo: textos de mensagem aceitam títulos e listas, descrições e valores de embed também aceitam listas, enquanto rótulos de Botão e respostas de enquete usam texto simples.

No texto principal, o controle de estilo oferece títulos de níveis 1 a 3 e texto menor. Para código, você pode usar um bloco com uma indicação de linguagem. A [referência de formatação](/pt-br/discord/formatting/) mostra as sintaxes e os campos compatíveis.

Ao digitar `{`, as sugestões ajudam a inserir um Placeholder. Digitar `:` abre o seletor de emojis, com busca por nome. O editor completa essas aberturas com `}` ou `:`. Se apagar a abertura imediatamente, enquanto o par automático ainda estiver vazio, o fechamento também sai. Pares colados, escritos manualmente ou que já receberam conteúdo mantêm a exclusão normal.

Um nome completo, como `:estrela:`, vira um emoji personalizado quando corresponde a um único emoji no servidor do Kit. Nomes desconhecidos ou ambíguos continuam como texto. Emojis já inseridos mantêm seu ID ao trocar de contexto, e nomes dentro de código não são convertidos.

## Remova ou recupere o conteúdo Legacy

Para deixar apenas o embed, remova o texto comum acima dele:

1. Clique no texto e pressione Escape para sair da digitação e mostrar seus controles.
2. Use a lixeira, **Remover conteúdo da mensagem**. O embed permanece na mensagem.
3. Quando quiser escrever acima dele novamente, abra o **+** abaixo da mensagem e escolha **Conteúdo da mensagem**.

Apagar as palavras mantém o campo vazio para reescrever. A lixeira remove o campo inteiro, e **Desfazer** recupera o texto que ele continha. Legacy permite apenas um campo de conteúdo, sempre acima dos embeds.

## Insira no lugar certo

Use o **+ dentro de um grupo** para acrescentar partes a ele. Uma Linha de ação recebe Botões ou um menu de seleção, enquanto uma Seção tem uma área para textos e outra para um único Botão ou Miniatura. Um Contêiner pode agrupar essas estruturas, mas Botões não recebem outros elementos dentro deles.

Para trocar a Miniatura de uma Seção por um Botão, selecione o acessório e escolha o novo tipo. Depois, configure o destino do Botão, pois o endereço da imagem não é reaproveitado como link.

## Controles e configurações

Selecione a borda de um elemento para mostrar seus controles. Propriedades como cor, emoji e spoiler ficam próximas do conteúdo, enquanto **Configurar** reúne os demais campos.

Para criar um Botão que abre um site, selecione-o, abra a amostra de **Estilo** e escolha **Link**. Edite o texto no próprio Botão e preencha a URL em **Configurar**. A amostra mostra o estilo atual e permite trocá-lo sem reabrir as configurações.

<img src="/screenshots/pokkan-section-link-styles.webp" alt="Seletor de estilos nos controles de um Botão acessório de Seção" width="2560" height="2000" loading="lazy" decoding="async" />

Clique em uma imagem, mesmo indisponível, para corrigir seu endereço. Em uma galeria, cada imagem tem edição de URL e spoiler próprios. Para excluir ou duplicar a coleção inteira, selecione a borda da galeria.

Na enquete, clique no relógio para abrir o campo de duração em horas. Enter confirma e devolve o foco ao relógio, Escape fecha o campo e Tab segue para o próximo controle. Ao lado, o controle de múltiplas respostas permite que cada pessoa marque mais de uma alternativa.

<img src="/screenshots/pokkan-components-complete.webp" alt="Mensagem V2 com textos, Seção e galeria no editor" width="2560" height="1752" loading="lazy" decoding="async" />

## Mova, copie e desfaça

Arraste pela alça do item até um destino compatível. Se o lugar não aceitar aquele tipo ou não tiver espaço, o movimento será recusado. Ao mover o último texto para fora de uma Seção, seu acessório continua disponível para você acrescentar outro texto. Uma Linha de ação é removida quando perde seu último item.

O menu do elemento mostra as operações disponíveis naquela posição. Copiar um grupo inclui seus filhos, por isso duplicá-lo ou colá-lo exige espaço para a estrutura inteira e para as partes obrigatórias ainda ausentes. O acessório de Seção ocupa um espaço único e é substituído ali, sem ser reordenado como um item de lista.

Durante a digitação, copiar e recortar afetam o texto selecionado. Para copiar ou recortar um componente inteiro, saia da digitação e selecione sua borda. **Desfazer** e **Refazer**, na barra inferior, recuperam alterações da mensagem, inclusive exclusões e mudanças de estilo de Botão.

## No celular e pelo teclado

Em telas compactas, **Mensagens** abre a lista sobre o editor. Toque fora dela, use o botão de fechar ao lado de **Criar mensagem** ou pressione Escape para voltar à edição. Se um menu **…** estiver aberto, o primeiro Escape fecha o menu e o seguinte fecha a lista.

Use Tab para chegar aos controles e Enter ou Espaço para acioná-los. Com o link de um Kit em foco, F2 inicia a renomeação, Enter confirma e Escape cancela. Kits somente leitura permitem consultar a mensagem e usar as ações de cópia disponíveis, sem alterar o original.

Veja também [Kits e salvamento](/pt-br/using-pokkan/kits/) e [Validação](/pt-br/using-pokkan/validation/).
