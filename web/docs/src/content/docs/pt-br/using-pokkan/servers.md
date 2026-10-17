---
title: Conta, servidores e referências
description: Entre, instale a Pokkan e encontre canais e cargos autorizados para usar na mensagem.
sidebar:
  order: 2
---

Escolha um servidor no topo para abrir sua coleção de mensagens reutilizáveis. Ao editar um Kit desse servidor, você também pode buscar canais e cargos pelo nome, usando os dados disponíveis para sua conta.

## Entre e escolha um servidor

1. Entre com Discord pelo controle de conta no topo. A autorização solicita perfil e lista de servidores.
2. Abra a página da conta e localize um servidor elegível para instalação.
3. Use a ação de adicionar a Pokkan. O Discord verifica se você pode instalar aplicativos ali.
4. Conclua a instalação, volte e atualize o estado. Abrir o convite não basta para confirmar a instalação.
5. No seletor compacto do topo, escolha o servidor instalado. A entrada **+** leva ao gerenciamento da conta.

Você pode voltar à sua conta pessoal pelo mesmo seletor. Se já usava a Pokkan antes da integração com servidores, talvez o Discord peça autorização para acessar sua lista de servidores, mantendo a conta e os Kits que você já possui.

![Conta com servidores disponíveis para seleção e instalação](/screenshots/pokkan-account-contexts.webp)

## Crie e use Kits do servidor

Com o servidor selecionado, abra **Mensagens**, crie e salve um Kit. Outros membros autorizados poderão vê-lo. Um link direto verifica acesso antes de carregar o conteúdo e pode ajustar o contexto visível ao Kit.

O criador e administradores podem editar. Membros comuns podem criar seus próprios Kits e ver os demais. Veja [permissões e rascunhos](/pt-br/using-pokkan/kits/).

## Insira canais e cargos pelo nome

Em um campo que aceita menções, abra o controle de referências de servidor na barra de formatação. Pesquise e escolha um canal ou cargo. A Pokkan insere uma referência fixa, como `<#123456789012345678>` ou `<@&123456789012345678>`.

Só são oferecidos canais permitidos para seu membro. Acesso do bot não significa acesso para você. Dados incompletos de permissão podem impedir sugestões.

A referência fixa difere de `{channel.name}`. Um Kit de servidor pode mostrar `{guild.name}` e `{guild.id}` conhecidos na prévia, mas não inventa canal ou usuário de execução. Exemplos de Placeholder não são substituídos automaticamente no envio por webhook.

## Atualização e saída

A página da conta informa se os dados do servidor estão atualizados. A Pokkan normalmente busca uma nova versão após cerca de 15 minutos, mas você pode pedir uma atualização se um canal mudou de nome ou um cargo não aparece. Há um intervalo de 60 segundos entre pedidos manuais, que pode ser maior se o Discord pedir mais tempo. Mudanças de permissão podem demorar até a próxima atualização para aparecer.

Sair do servidor, perder autorização ou remover a Pokkan pode interromper o acesso. Falhas temporárias não apagam Kits. Sair da conta encerra só a sessão atual. Para revogar o consentimento, use **Aplicativos autorizados** no Discord.

Próximo: [Salvar e reabrir](/pt-br/guide/save/) · [Enviar](/pt-br/guide/send/)
