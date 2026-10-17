---
title: Quando algo não funciona
description: Resolva problemas de envio, imagens, permissões e salvamento sem perder o rascunho nem expor credenciais.
sidebar:
  order: 4
---

## O envio está desativado

Escolha um Kit, informe a URL do webhook e confira a validação no editor. Uma Seção precisa de texto e acessório, e uma Linha de ação não pode ficar vazia. Botões de ação não são compatíveis com o envio direto por webhook. Se a intenção for abrir um site, use o estilo Link e informe o endereço nas configurações do Botão.

## O Discord recusou a mensagem

Leia o erro exibido junto ao envio e confira se o webhook ainda existe no canal desejado. Corrija os limites ou campos incompatíveis indicados. Se o Discord pedir um intervalo antes de tentar novamente, aguarde, pois repetir o pedido imediatamente não resolve a restrição.

## Não apareceu nada, mas o envio pode ter sido concluído

Abra o canal de destino antes de tentar outra vez. A mensagem pode ter sido publicada mesmo que o navegador não tenha recebido a confirmação. Um segundo envio bem-sucedido cria outra publicação, sem substituir a primeira.

## Uma imagem ou emoji não carrega

Confira se a URL abre a imagem sem exigir login e se o emoji personalizado ainda existe. O navegador ou o site de origem pode bloquear o carregamento, e um emoji removido do Discord deixa de estar disponível. Escrever o nome de um arquivo do computador não faz upload dele.

## Não encontro meu Kit

Confira o navegador, a conta do Discord e a seleção entre conta pessoal e servidor. Rascunhos não salvos ficam no navegador em que foram criados, e outra conta mostra uma coleção diferente. Para abrir um Kit de servidor, você precisa continuar como membro e manter a autorização da sua conta. Se tiver um backup no formato **Kit Pokkan**, importe-o para recuperar uma cópia.

## Consigo ver, mas não editar

Kits criados por outros membros do servidor ficam somente leitura para quem não tem autoridade administrativa. Você pode criar sua própria cópia para fazer uma variação. Se um Kit seu ficar indisponível, confira a autorização e a instalação pela página da conta antes de tentar salvar novamente.

## O salvamento informa um conflito

Outra pessoa ou aba salvou uma versão mais recente. Seu rascunho continua disponível, então baixe uma cópia em **JSON → Kit Pokkan** antes de escolher **Carregar versão recente**, caso precise reaplicar suas mudanças. Essa ação substitui o trabalho pendente e não combina as versões automaticamente.

## As sugestões de canais estão ausentes ou desatualizadas

Confira se o Kit pertence a um servidor ao qual você tem acesso. Kits pessoais não recebem a lista privada de canais de outro contexto. Na página da conta, peça uma atualização dos dados quando a opção estiver disponível e respeite o intervalo entre pedidos. Informações de permissão incompletas podem ocultar canais para evitar expor conteúdo privado.

## A prévia mostra um nome, mas o Discord recebeu um Placeholder

Exemplos de Placeholder e nomes conhecidos de servidor ajudam a visualizar a mensagem, mas não substituem o texto no envio. Troque o token armazenado pelo texto final e confira **JSON → Payload do Discord** antes de publicar.

## Peça ajuda sem expor dados privados

Informe a ação que tentou, o resultado esperado, o idioma e o tamanho da tela. Uma mensagem de exemplo reduzida ou uma captura da área afetada ajuda a localizar o problema. Remova URLs de webhook, tokens e informações pessoais antes de compartilhar.

Veja também [como criar um webhook](/pt-br/guide/create-webhook/) e [como guardar um backup em JSON](/pt-br/using-pokkan/import-export/).
