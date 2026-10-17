---
title: Formatação de mensagens
description: Formate textos, escreva blocos de código e insira menções e emojis nos campos compatíveis.
sidebar:
  order: 11
---

O Discord usa Markdown, uma sintaxe de marcadores no texto, para aplicar formatação. Digite os marcadores na própria mensagem e acompanhe o resultado enquanto escreve. O conteúdo Legacy e os Blocos de texto V2 aceitam a mesma formatação de mensagem.

## Sintaxes mais usadas

| O que escrever                            | Resultado                                 |
| ----------------------------------------- | ----------------------------------------- |
| `**Importante**`                          | Negrito                                   |
| `*Uma observação*`                        | Itálico                                   |
| `__Sublinhado__`                          | Sublinhado                                |
| `~~Desatualizado~~`                       | Tachado                                   |
| `# Título`                                | Título no começo da linha                 |
| `## Título` ou `### Título`               | Títulos menores                           |
| `-# Observação`                           | Texto menor no começo da linha            |
| `- Item` ou `1. Item`                     | Lista com marcadores ou numerada          |
| `> Citação`                               | Uma linha de citação                      |
| `>>> Citação`                             | Citação que continua nas linhas seguintes |
| `[Ajuda](https://docs.pokkan.net/pt-br/)` | Link com um texto de sua escolha          |

Para marcar um spoiler, coloque duas barras verticais de cada lado: <code>||Surpresa||</code>. Se quiser mostrar um marcador sem aplicar a formatação, escreva uma barra invertida antes dele. Títulos e listas precisam de um espaço depois do marcador.

## Código em linha e em bloco

Coloque uma crase de cada lado de um trecho curto para mostrá-lo como código em linha. Para um bloco, use três crases em linhas separadas. Depois das crases de abertura, você pode indicar a linguagem:

````text
```py
print("hello")
```
````

A Pokkan colore código em Python, JavaScript, TypeScript, C, C++, JSON, shell, CSS e XML/HTML. Entre as indicações aceitas estão `py`, `js`, `ts`, `c`, `cpp`, `c++`, `json` e `sh`. Uma linguagem não reconhecida mantém o código legível, sem destaque de sintaxe nem alteração do que você escreveu.

Em campos de embed, linhas longas de código quebram para caber no espaço disponível. Se o campo estiver em linha com outros, selecione **Tornar campo em bloco** para dar a ele uma linha própria. **Tornar campo inline** permite voltar à disposição anterior. Blocos no texto principal da mensagem podem ter rolagem horizontal.

## A formatação depende do campo

Descrições e valores de campos de embed aceitam Markdown, incluindo listas como `- Item`, mas textos de autor e rodapé, rótulos de Botão e perguntas e respostas de enquete permanecem em texto simples. Para transformar o título de um embed em link, informe o destino nas configurações do embed, em vez de escrever a sintaxe de link no título.

## Menções e emojis

Referências a usuários, cargos e canais usam as sintaxes `<@123456789012345678>`, `<@&123456789012345678>` e `<#123456789012345678>`, respectivamente. Quando sua conta tem acesso aos dados de um servidor, a Pokkan pode mostrar os nomes dos canais e cargos correspondentes. Outras referências podem aparecer de forma genérica na prévia até serem interpretadas pelo Discord.

Mostrar uma menção não significa autorizar a notificação. Confira as [menções permitidas](/pt-br/using-pokkan/message-settings/) antes do envio, principalmente ao mencionar cargos ou grupos de pessoas. O padrão evita liberar notificações amplas automaticamente.

Ao digitar `:` em um campo, você pode pesquisar emojis e escolher uma sugestão. O seletor também reúne os emojis disponíveis do servidor do Kit e a coleção da Pokkan, quando configurada. O uso no Discord depende de o emoji continuar disponível e das permissões do destino.

Emojis Unicode permanecem como caracteres no Kit e usam as imagens do Twemoji do Discord na prévia. Emojis personalizados carregam pelo CDN do Discord e podem ser informados por ID, `<:nome:id>` ou `<a:nome:id>` para os animados. Se a imagem não carregar, o valor digitado continua disponível para correção.

Veja [como editar e formatar no editor](/pt-br/using-pokkan/editing/) e [como buscar canais e cargos pelo nome](/pt-br/using-pokkan/servers/).

Referência oficial: [formatação de texto no Discord](https://support.discord.com/hc/pt-br/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline).
