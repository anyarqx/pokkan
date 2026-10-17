---
title: Conheça o editor
description: Edite na prévia, adicione componentes e encontre as ações de cada elemento.
sidebar:
  order: 3
---

Clique ou toque no trecho que deseja alterar e escreva na própria mensagem. A formatação permanece visível durante a digitação, inclusive em títulos, listas e links. Pressione Escape para encerrar a digitação e voltar aos controles do elemento. Rótulos de botões e respostas de enquete usam texto simples.

Durante a edição de um campo com Markdown, os marcadores aparecem em uma cor discreta. Você pode selecionar ou apagar os `**` ao redor de um negrito sem perder as palavras. No computador, a barra de formatação fica na parte inferior do editor, acima das ações do documento. No celular, essa barra não aparece e as ações inferiores ficam ocultas enquanto você digita, deixando espaço para a mensagem e o teclado. Enter acrescenta uma linha nesses campos. Nos rótulos de texto simples, Enter encerra a edição.

Os controles laterais de um elemento continuam disponíveis ao editar seus filhos e acompanham a rolagem dentro dele. Esse comportamento é o mesmo em mensagens Legacy e Components V2.

<img src="/screenshots/pokkan-components-complete.webp" alt="Mensagem V2 com texto, imagem e Botão de link no editor" width="2560" height="1752" loading="lazy" decoding="async" />

Para acrescentar uma parte, use o **+** no lugar em que ela deve aparecer. Dentro de um grupo, ele insere conteúdo naquele grupo. Selecionar um elemento revela seus controles de cor, emoji ou outras propriedades, conforme o tipo. **Configurar** reúne os detalhes restantes, e a alça de arrastar permite mover os itens que podem mudar de posição.

Você pode experimentar essas alterações e voltar pelo **Desfazer**, no controle inferior. Quando quiser guardar uma cópia do trabalho, **JSON** permite baixá-la. **Enviar** abre a etapa de envio com o Kit já escolhido, onde você confere o destino antes de publicar.

No celular, **Mensagens** abre a lista sobre o editor. Escolha um Kit, pressione Escape ou toque fora da lista para voltar à edição. O botão de fechar fica ao lado de **Criar mensagem**.

<img src="/screenshots/pokkan-components-mobile.webp" alt="Editor compacto com navegação Mensagens e a mesma área de edição V2" loading="lazy" width="780" height="2056" />

A [referência de controles](/pt-br/using-pokkan/controls/) identifica cada ação contextual e leva ao elemento que ela altera.

## Coloque um link em um botão

1. Selecione o botão e toque na amostra de cor dos seus controles.
2. Escolha **Link**. Clique no texto do botão para escrever, por exemplo, “Ver programação”.
3. Abra **Configurar** e preencha o endereço completo do site.

<img src="/screenshots/pokkan-section-link-styles.webp" alt="Estilos disponíveis nos controles de um botão de Seção" width="2560" height="2000" loading="lazy" decoding="async" />

Pelo teclado, abra a amostra com Enter e percorra os estilos com as setas. Enter confirma a escolha e Escape fecha o seletor sem alterar o botão. Ao trocar para Link, o campo de ação do aplicativo dá lugar ao endereço do site. **Desfazer** recupera o estilo e os dados anteriores se você precisar voltar.

## Deixe apenas o embed ou recupere o texto

1. Clique no texto acima do Embed e pressione Escape para sair da digitação.
2. Nos controles desse texto, escolha a lixeira. O embed continua na mensagem.
3. Para escrever acima dele novamente, abra o **+** abaixo da mensagem e escolha **Conteúdo da mensagem**.

Se quiser apenas reescrever o texto, apague as palavras e continue no campo vazio. Use a lixeira quando não quiser mais esse campo na mensagem, sabendo que **Desfazer** recupera o conteúdo removido.

## Emoji e validação

No controle de emoji de um botão ou resposta de enquete, você pode pesquisar pelo nome, explorar as categorias ou colar um emoji do Discord. O mesmo campo aceita o ID de um emoji personalizado.

Se um **+** não aparecer, aquele lugar pode ter atingido o limite ou não aceitar o tipo desejado. A [validação](/pt-br/using-pokkan/validation/) ajuda a localizar o que falta para enviar, como uma Seção ainda sem acessório.

Para mais opções, consulte [como selecionar, remover e mover partes](/pt-br/using-pokkan/editing/). Se a validação apontar um problema antes de enviar, veja [como encontrá-lo e corrigi-lo](/pt-br/using-pokkan/validation/).

Próximo: **[Adicione um embed →](/pt-br/guide/embed/)**
