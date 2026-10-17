---
title: Encontre e corrija erros da mensagem
description: Localize o campo indicado pela validação e diferencie erros de estrutura das limitações de envio por webhook.
sidebar:
  order: 5
---

Você pode manter um rascunho incompleto enquanto edita. Antes de exportar no formato **Payload do Discord** ou enviar a mensagem, preencha as partes obrigatórias e corrija os erros apontados pela validação.

## Localize o problema

1. Abra o resumo pelo contador de problemas na barra inferior do editor.
2. Confira se o item é um **erro** ou **aviso** e leia o que precisa ser alterado.
3. Selecione o item para chegar ao campo ou componente correspondente. Problemas que afetam a mensagem inteira podem abrir suas configurações.
4. Faça a correção no editor. O resumo e a indicação junto ao conteúdo acompanham a mudança.

O marcador próximo a um componente abre seus problemas. Campos inválidos também podem receber um sublinhado para ajudar a encontrá-los. Essas indicações pertencem ao editor e não aparecem na mensagem enviada ao Discord.

<img src="/screenshots/pokkan-section-validation.webp" alt="Marcador de validação e aviso ao lado de uma Seção incompleta" width="2560" height="2000" loading="lazy" decoding="async" />

## Correções frequentes

| Problema                       | Como corrigir                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Seção sem acessório            | Escolha Botão ou Miniatura no espaço do acessório.                                         |
| Seção sem texto                | Adicione um Bloco de texto dentro dela.                                                    |
| Linha de ação vazia            | Adicione um filho compatível ou remova a linha.                                            |
| Campo de embed vazio           | Preencha o nome e o valor ou exclua o campo.                                               |
| Botão de link sem destino      | Informe a URL em Configurar.                                                               |
| Mensagem sem conteúdo enviável | Adicione texto, embed, enquete ou um componente compatível.                                |
| Texto acima do limite          | Reduza o campo indicado. Dividir em mais embeds não aumenta o limite de texto total deles. |

Components V2 aceita 40 componentes no total, incluindo os que ficam dentro de outros. A Pokkan reserva espaço para completar as estruturas obrigatórias. Por isso, uma inserção não relacionada pode ficar indisponível enquanto a que completa uma Seção continua disponível.

## Componentes importados ainda não suportados

A Pokkan preserva esses objetos no formato **Kit Pokkan**, mas não os inclui no **Payload do Discord**, indicando isso em um aviso. Se a omissão deixar uma estrutura obrigatória vazia ou incompleta, a validação também apontará um erro. Conseguir guardar o objeto no Kit não significa que ele possa ser enviado.

## Mensagem válida, envio incompatível

Uma mensagem pode ter uma estrutura aceita pelo Discord e ainda depender de um tipo de envio que a Pokkan não oferece. Uploads de anexos e ações interativas de aplicação são exemplos. A página de envio informa essas limitações separadamente dos erros do conteúdo.

Para abrir um site, use um Botão de link. Trocar um ID de componente não cria uma ação, e a Pokkan não executa comportamentos de bot, comandos ou scripts.

Continue em [Importação e exportação](/pt-br/using-pokkan/import-export/) ou [Quando algo não funciona](/pt-br/using-pokkan/troubleshooting/).
