---
title: Importação e exportação
description: Importe uma mensagem e escolha o formato JSON adequado para um backup ou para usar no Discord.
sidebar:
  order: 2
---

Abra **JSON** no editor para copiar ou baixar sua mensagem. O formato escolhido determina quais dados acompanham o arquivo.

## Escolha o formato

- **Payload do Discord** reúne os dados da mensagem aceitos pelo Discord, sem o nome do Kit, seus argumentos ou o catálogo de Placeholders. Corrija os erros de validação antes de exportar nesse formato.
- **Kit Pokkan** guarda o Kit com a mensagem e os dados que a acompanham. Use esse formato para fazer um backup ou continuar a edição depois.

Depois de escolher o formato, use os ícones **Copiar** ou **Baixar** na barra acima do código. Passe o cursor sobre um ícone para conferir a ação. Se o navegador negar acesso à área de transferência, você ainda pode baixar o arquivo.

<img src="/screenshots/pokkan-json-editor-pt-br.webp" alt="Painel JSON com as ações acima do código" width="2880" height="1900" loading="lazy" decoding="async" />

## Importe uma cópia ou altere o Kit aberto

Em [Mensagens](https://pokkan.net/pt-BR/kits), escolha **Importar**, dê um nome e cole o JSON. A importação cria um novo Kit, sem substituir outro da sua coleção.

Para alterar o Kit que já está aberto, edite o JSON no painel e use **Aplicar**, na mesma barra. Confira o resultado no editor antes de salvar, pois essa ação muda a mensagem atual. O código tem sua própria rolagem, mantendo as ações acessíveis enquanto você edita mensagens longas.

Componentes importados que a Pokkan ainda não suporta podem ser preservados no formato **Kit Pokkan**, mas ficam de fora do **Payload do Discord**. Leia os avisos de validação para saber o que será omitido.

A URL do webhook deve ficar apenas no campo de envio. Ela dá acesso ao canal e não deve ser incluída no JSON de um Kit.

Veja também [Kits e rascunhos](/pt-br/using-pokkan/kits/) e [Placeholders](/pt-br/using-pokkan/placeholders/).
