---
title: Conta, servidores e referências
description: Escolha uma conta ou servidor para organizar Kits e consulte canais, cargos e emojis quando a Pokkan estiver instalada.
sidebar:
  order: 2
---

Escolha um servidor no topo para abrir sua coleção de mensagens reutilizáveis. Ao editar um Kit desse servidor, você também pode buscar canais e cargos pelo nome, usando os dados disponíveis para sua conta.

## Entre e escolha um servidor

1. Entre com Discord pelo controle de conta no topo. A autorização permite identificar sua conta e consultar os servidores de que você participa.
2. Abra o seletor ao lado do avatar e escolha sua conta pessoal ou um servidor.
3. Entre em **Mensagens** para ver a coleção selecionada e criar um Kit nela.

O seletor mostra os servidores que você possui ou nos quais tem **Gerenciar Servidor** ou **Administrador**. Essas permissões são necessárias para acessar a coleção privada de Kits, inclusive por uma URL direta. Instalar a Pokkan não concede permissões à sua conta.

Você pode organizar Kits antes de a Pokkan ser instalada. A instalação permite consultar canais, cargos e emojis pelo editor e fica disponível para quem tem permissão de gerenciar o servidor. Na página da conta, use o ícone de adicionar e conclua a autorização no Discord. Ao voltar, atualize o estado, pois abrir o convite não confirma a instalação.

A entrada **+** do seletor leva à página da conta, e seu avatar abre essa página diretamente. Se o Discord pedir autorização para a lista de servidores, você pode concedê-la mantendo os Kits da conta.

## Crie e use Kits do servidor

Com o servidor selecionado, abra **Mensagens**, crie e salve um Kit. Outros membros autorizados poderão encontrá-lo na lista daquele servidor.

Um link direto só carrega o conteúdo depois de verificar seu acesso e pode ajustar o seletor ao servidor do Kit. Trocar essa seleção não transforma um Kit pessoal já aberto em Kit de servidor nem transfere um Kit para outro lugar.

Quem tem acesso à coleção pode criar, editar e excluir seus Kits. Links compartilhados podem conceder leitura ou edição separadamente, sem abrir a coleção privada. Veja [permissões e rascunhos](/pt-br/using-pokkan/kits/).

## Insira canais e cargos pelo nome

Com a Pokkan instalada, digite `#` em um campo que aceita menções para buscar canais ou `@` para buscar cargos. Escreva parte do nome e escolha uma sugestão com o mouse, toque ou Enter. A Pokkan insere uma referência fixa, como `<#123456789012345678>` ou `<@&123456789012345678>`, sem oferecer uma lista de usuários.

A busca inclui categorias e os tipos de canal disponíveis nos dados autorizados, como texto, voz, anúncios, palco e fórum. `@` também oferece `@everyone` e `@here`. Inserir essas referências não ativa notificações por conta própria: confira as [menções permitidas](/pt-br/using-pokkan/message-settings/) antes de enviar.

As sugestões de canais respeitam sua participação e suas permissões no servidor. O acesso do bot não concede o mesmo acesso à sua conta, e dados de permissão incompletos podem impedir sugestões para evitar expor canais privados.

Uma referência fixa aponta sempre para o mesmo canal ou cargo. Já `{guild.name}` e `{guild.id}` são Placeholders que podem mostrar os dados conhecidos do servidor na prévia. Eles continuam como texto no envio por webhook, então confira o conteúdo antes de publicar.

O seletor de emojis também oferece os emojis disponíveis do servidor, filtrados pelos seus cargos e pela disponibilidade informada pelo Discord. Emojis restritos a cargos que você não possui ficam de fora. A coleção integrada da Pokkan, quando configurada, aparece em outra seção do seletor. Encontrar um emoji na lista não garante seu uso em qualquer destino, pois o Discord também aplica as permissões da mensagem e do canal.

## Atualização e mudanças de acesso

A página da conta informa se os dados do servidor estão atualizados. A Pokkan normalmente busca uma nova versão após cerca de 15 minutos, mas você pode pedir uma atualização se um canal mudou de nome ou um cargo não aparece. Há um intervalo de 60 segundos entre pedidos manuais, que pode ser maior se o Discord pedir mais tempo.

Esses intervalos são políticas de atualização da Pokkan, por isso nomes e permissões podem mudar antes de a próxima versão dos dados estar disponível. O acesso aos Kits é verificado separadamente, mesmo quando os dados do servidor já estão guardados.

Se você sair do servidor ou perder a autorização, o acesso aos Kits poderá ser interrompido. Remover a Pokkan impede novas consultas de canais, cargos e emojis, mas não apaga a coleção de Kits. Uma negativa de acesso confirmada também invalida os dados utilizáveis daquele contexto no navegador. Falhas temporárias do Discord não apagam os Kits salvos.

Sair da conta encerra apenas a sessão atual da Pokkan, mantendo as dos outros dispositivos. Para revogar o acesso da Pokkan à sua conta do Discord, remova a autorização em **Aplicativos autorizados**, no Discord.

Veja também [Placeholders e valores de prévia](/pt-br/using-pokkan/placeholders/) e [Quando algo não funciona](/pt-br/using-pokkan/troubleshooting/).
