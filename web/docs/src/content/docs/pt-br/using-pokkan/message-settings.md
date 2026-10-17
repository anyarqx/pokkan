---
title: Configurações da mensagem
description: Entenda menções, opções da mensagem, referências de resposta e campos avançados.
---

Para ajustar notificações, menções e outras propriedades da mensagem inteira, abra o menu de contexto da área vazia do editor e escolha **Configurações da mensagem**. Nem todos os campos disponíveis são aceitos pelo envio direto por webhook, então confira a compatibilidade em Enviar antes de depender deles.

| Campo                         | Significado e efeito                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto para voz                | Solicita TTS. A reprodução depende das permissões e das configurações do cliente Discord.                                                                                                                        |
| Suprimir embeds               | Define a opção de suprimir embeds, sem apagar os dados armazenados.                                                                                                                                              |
| Suprimir notificações         | Solicita uma mensagem sem notificação push ou de desktop, sem torná-la invisível.                                                                                                                                |
| Menções permitidas            | Controla quais menções podem notificar. Listas de usuários e cargos autorizam IDs específicos, enquanto as opções gerais permitem categorias. Uma menção visível não autoriza, por si só, uma notificação geral. |
| Nonce                         | Identificador opcional do envio, com até 25 caracteres no editor. Não é ID de Kit nem credencial de compartilhamento.                                                                                            |
| Exigir nonce                  | Solicita detecção de duplicação em formas de criação compatíveis. O webhook direto não aceita todos os campos gerais de mensagem.                                                                                |
| Figurinhas                    | Lista de até três IDs, apenas em Legacy. Informar IDs não faz upload de figurinhas.                                                                                                                              |
| Tema compartilhado do cliente | JSON estruturado preservado em Legacy para envios compatíveis. Deixe ausente se o envio não o suportar.                                                                                                          |

<img src="/screenshots/pokkan-message-settings.webp" alt="Configurações da mensagem com opções de notificação e menções permitidas" width="1216" height="1648" loading="lazy" decoding="async" />

Nas menções permitidas, habilite apenas as pessoas ou cargos que devem ser notificados. O padrão evita liberar categorias amplas automaticamente. Inserir uma referência fixa pela busca de canais ou cargos não altera essa política de notificações.

<img src="/screenshots/pokkan-message-settings-advanced.webp" alt="Parte inferior das configurações com nonce, figurinhas e tema estruturado" width="1216" height="1648" loading="lazy" decoding="async" />

No mesmo menu, **Responder a** permite indicar outra mensagem pelo ID e preencher o tipo de referência e os IDs opcionais de canal e servidor. Você também pode escolher se o envio deve falhar quando a mensagem original não existir e se deve mencionar seu autor. Para editar uma referência existente, clique na linha de resposta. [Anexos e referências de resposta](/pt-br/discord/attachments-replies/) explica as restrições de transporte.

As alterações dessas configurações participam de Desfazer e Refazer. Campos com JSON estruturado só aplicam o conteúdo quando ele é válido. A [validação](/pt-br/using-pokkan/validation/) e a compatibilidade em Enviar diferenciam dados malformados de campos que o webhook não suporta.
