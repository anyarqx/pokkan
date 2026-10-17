---
title: Controles do editor
description: Encontre os controles comuns e contextuais e saiba qual elemento cada um altera.
sidebar:
  order: 2
---

Selecione a borda de um elemento para acessar seus controles sem começar a editar o texto. Para trabalhar com um grupo inteiro, como Contêiner, Seção, linha ou galeria, selecione sua borda externa em vez de um dos filhos. No celular, um toque mostra os controles. Os ícones têm nomes acessíveis e mostram uma dica ao passar o mouse.

## Ações comuns

| Controle                                   | O que muda                                                                                          | Onde aparece                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alça de arrastar                           | Move o item para uma posição compatível, sem converter seu tipo.                                    | Componentes, [embeds](/pt-br/discord/embeds/), [campos](/pt-br/discord/embed-fields/) e listas compatíveis. O acessório de Seção permanece no espaço único. |
| Configurar                                 | Abre propriedades restantes, como IDs, destino e descrições. O texto continua editável na mensagem. | No componente ou embed selecionado, com campos diferentes para cada tipo.                                                                                   |
| Excluir                                    | Remove o item e seus filhos, quando for um grupo. Desfazer pode recuperá-los.                       | Nos elementos removíveis. Não significa excluir o Kit inteiro.                                                                                              |
| Mais ações                                 | Oferece as operações possíveis para aquele item e posição.                                          | Na maioria dos elementos, mas não no acessório de Seção.                                                                                                    |
| Adicionar elemento / sinal de mais interno | Insere naquele ponto ou dentro do pai.                                                              | Na raiz e em grupos que aceitam filhos, não em elementos sem filhos.                                                                                        |

Conforme o item selecionado, **Mais ações** oferece **Configurar**, **Adicionar antes**, **Adicionar depois**, **Duplicar**, **Copiar**, **Recortar**, **Colar**, **Mover para cima**, **Mover para baixo** e **Excluir**. A cópia de componentes fica na área de transferência interna do editor, e a colagem só é oferecida quando a estrutura cabe e é aceita no destino. Recortar só remove o item quando também é possível copiá-lo.

Em Legacy, embeds, campos, respostas de enquete e anexos importados têm ações de duplicação, movimento e exclusão conforme os limites da lista. Esses menus não permitem colar componentes V2 em posições incompatíveis, e a configuração de um embed continua nos controles dele.

<img src="/screenshots/pokkan-embed-field-actions.webp" alt="Campo de embed selecionado com seu menu contextual e o editor ao redor" width="2560" height="2254" loading="lazy" decoding="async" />

## Controles conforme a seleção

| Elemento                                               | Controles adicionais e resultado                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Conteúdo Legacy](/pt-br/discord/message-content/)     | Copiar o texto ou remover o campo inteiro. O sinal de mais da raiz permite adicioná-lo novamente.                                               |
| [Embed](/pt-br/discord/embeds/)                        | Cor, inclusão de miniatura/imagem ausentes, Configurar autor/rodapé/link/data, excluir e Mais ações. Imagens existentes editam a URL ao clicar. |
| [Campo de embed](/pt-br/discord/embed-fields/)         | Alternar entre em linha e largura total, excluir, Mais ações e arrastar.                                                                        |
| [Enquete](/pt-br/discord/polls/)                       | Relógio abre a duração, controle de múltiplas respostas permite marcar várias alternativas e lixeira remove a enquete.                          |
| [Resposta de enquete](/pt-br/discord/poll-answers/)    | Emoji, exclusão e movimento/Mais ações dentro dos limites.                                                                                      |
| [Contêiner](/pt-br/discord/containers/)                | Cor de destaque e spoiler para o grupo inteiro.                                                                                                 |
| [Botão](/pt-br/discord/buttons/)                       | Estilo, emoji e desativação. Premium não oferece emoji nem texto comum. Configurar muda URL, ID personalizado ou SKU conforme o estilo.         |
| [Miniatura](/pt-br/discord/thumbnails/)                | Spoiler e descrição em Configurar. O endereço é alterado na própria imagem.                                                                     |
| [Item de galeria](/pt-br/discord/gallery-items/)       | Spoiler individual e edição direta do endereço. A borda da galeria seleciona a coleção inteira.                                                 |
| [Galeria](/pt-br/discord/media-galleries/)             | Configurar adiciona, remove, ordena e descreve os itens.                                                                                        |
| [Arquivo](/pt-br/discord/files/)                       | Spoiler e edição direta da referência ao anexo.                                                                                                 |
| [Separador](/pt-br/discord/separators/)                | Configurar escolhe a divisória e o espaço pequeno ou grande.                                                                                    |
| [Menu de seleção](/pt-br/discord/select-menus/)        | Indicação editável e Configurar para ID, quantidades, desativação e opções ou valores iniciais conforme o tipo.                                 |
| [Acessório de Seção](/pt-br/discord/sections/)         | Substituir alterna entre Botão e Miniatura. Não há arrastar, excluir ou Mais ações independentes para esse espaço único.                        |
| [Anexo importado](/pt-br/discord/attachments-replies/) | Mover, duplicar e excluir o registro, sem fazer upload de um arquivo.                                                                           |

<img src="/screenshots/pokkan-button-style-picker.webp" alt="Controles de Botão com os seis estilos disponíveis" width="2560" height="1090" loading="lazy" decoding="async" />

**Cor** aceita seletor ou código hexadecimal e pode ser limpa. **Emoji** oferece entrada manual, busca por Unicode, categorias e remoção, além de emojis do servidor disponíveis para sua conta e da coleção da Pokkan. **Spoiler** oculta o conteúdo na apresentação até ser revelado, mas não o remove nem oferece privacidade contra quem pode abrir o Kit.

<img src="/screenshots/pokkan-color-control.webp" alt="Seletor de cor e entrada hexadecimal no embed selecionado" width="2560" height="2254" loading="lazy" decoding="async" />

<img src="/screenshots/pokkan-emoji-picker.webp" alt="Seletor de emoji com busca por tickets" width="2560" height="2000" loading="lazy" decoding="async" />

## Durante a edição de texto

Ao editar um campo com Markdown no computador, a barra de formatação fica na parte inferior do editor, acima das ações do documento. Selecione um trecho e escolha a formatação, ou use Ctrl/⌘ B para negrito, Ctrl/⌘ I para itálico, Ctrl/⌘ Shift X para tachado e Ctrl/⌘ ` para código em linha. Os marcadores ficam visíveis durante a edição e desaparecem na prévia. No celular, a barra de formatação não aparece e as ações inferiores ficam ocultas enquanto você digita. Rótulos de Botão, texto de enquete, autor e rodapé permanecem como texto simples.

Para colocar um link em um trecho, selecione as palavras e escolha **Link**, preenchendo o endereço de destino. Com o cursor dentro de um link existente, esse mesmo controle permite alterar o endereço ou remover o vínculo sem apagar o texto. Spoilers ficam revelados durante a edição do campo, permitindo selecionar e alterar seu conteúdo.

<img src="/screenshots/pokkan-formatting-controls.webp" alt="Descrição de embed durante a edição, com ferramentas de formatação acima das ações do editor" width="600" height="498" loading="lazy" decoding="async" />

Com referências autorizadas do servidor, digite `#` para buscar canais ou `@` para buscar cargos e inserir uma menção fixa. Digitar `{` oferece sugestões de Placeholder, enquanto `:` abre o seletor de emojis. As referências inserem valores fixos no texto, sem definir um usuário ou canal para execução. Veja [Formatação](/pt-br/discord/formatting/) e [Placeholders](/pt-br/using-pokkan/placeholders/).

## Ações do Kit, barra inferior e configurações

Clique no título para renomear o Kit no próprio lugar. Enter confirma, Escape cancela e clicar fora aceita um nome válido de até 160 caracteres. A renomeação também está no menu lateral do Kit, junto de duplicação, compartilhamento e exclusão, conforme sua permissão.

<img src="/screenshots/pokkan-kit-actions.webp" alt="Menu de ações do Kit aberto ao lado da mensagem" width="2560" height="2254" loading="lazy" decoding="async" />

No cabeçalho, **Compartilhar** gerencia links de acesso, **Placeholders** reúne tokens e valores de exemplo e **JSON** permite conferir, copiar, baixar ou aplicar os dados da mensagem. **Salvar** e **Descartar** ficam disponíveis quando há alterações pendentes. Descartar recupera a versão salva, por isso use **Desfazer** para voltar apenas uma alteração.

A barra inferior reúne **Desfazer**, **Refazer**, **Enviar** e, quando permitida, a exclusão do Kit com confirmação. Em um Kit compartilhado, você pode copiar a mensagem para sua coleção, enquanto o acesso de leitura omite as ações que alterariam o original. [Compartilhamento](/pt-br/using-pokkan/sharing/) explica o alcance dos links.

O contador de problemas abre o resumo de validação. Escolha um problema para chegar ao item e corrigi-lo no próprio editor. O menu de contexto da área vazia também abre [configurações da mensagem e referências de resposta](/pt-br/using-pokkan/message-settings/), que alteram os dados da mensagem, sem mudar a quem o Kit pertence.

Veja [Edição](/pt-br/using-pokkan/editing/) para os atalhos e as restrições do modo de leitura.
