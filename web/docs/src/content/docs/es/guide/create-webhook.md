---
title: Crea un webhook de Discord
description: Consigue de forma segura el enlace para enviar mensajes de Pokkan a un canal.
sidebar:
  order: 6
---

Un webhook es un enlace especial de Discord que permite a Pokkan publicar en un canal. No hace falta instalar un bot.

## En Discord

Necesitas el permiso **Gestionar webhooks**. Usa Discord en el ordenador o navegador y elige un canal de pruebas.

![Ruta en Discord: menú del servidor, ajustes, Integraciones, Webhooks, nuevo webhook y copiar URL; ilustración en inglés](/illustrations/discord-webhook-path.svg)

1. Abre el menú junto al nombre del servidor y entra en **Ajustes del servidor**.
2. Entra en **Integraciones → Webhooks**.
3. Crea un webhook o abre uno que tengas permiso para usar.
4. Ponle nombre, selecciona el canal y guarda los cambios.
5. Copia la **URL del webhook**. El enlace empieza por `https://discord.com/api/webhooks/`.

## En Pokkan

Abre **Mensajes → Enviar**, selecciona el Kit y pega el enlace en el campo del webhook. Comprueba el Kit y el canal de destino antes de enviar.

<picture>
  <source media="(max-width: 48rem)" srcset="/screenshots/pokkan-send-message-mobile.webp" />
  <img src="/screenshots/pokkan-send-message.webp" alt="Página de envío de Pokkan con vista previa y campo de webhook vacío; interfaz en inglés" />
</picture>

Revisa el mensaje y envíalo una vez. Abre el canal de Discord para comprobar el resultado. Cada envío correcto crea otro mensaje; editar el Kit no actualiza un mensaje ya publicado.

:::caution[Mantén el enlace en privado]
Cualquiera que tenga la URL puede usar el webhook. No la incluyas en mensajes, Kits, capturas ni solicitudes de ayuda. Si la expones, elimina y vuelve a crear el webhook en Discord.
:::

Si no aparece Webhooks, pide a un administrador que revise tus permisos. Copia la URL del webhook, no una invitación ni el enlace del canal.

Si tus menús son diferentes, la [guía ilustrada de Discord](https://support.discord.com/hc/es/articles/228383668-Intro-to-Webhooks) muestra dónde buscar. Para resolver errores de envío, consulta la [lista en inglés](/en/using-pokkan/troubleshooting/).

Siguiente: **[Envía tu mensaje →](/es/guide/send/)**
