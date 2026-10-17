---
title: Crea un webhook de Discord
description: Consigue de forma segura el enlace para enviar mensajes de Pokkan a un canal.
sidebar:
  order: 6
---

Un webhook es un enlace especial de Discord que permite a Pokkan publicar en un canal. No hace falta instalar un bot.

## En Discord

Necesitas el permiso **Gestionar webhooks**. Usa Discord en el ordenador o navegador y elige un canal de pruebas.

![Ruta desde los ajustes del servidor hasta la creación de un webhook y la copia de su URL](/illustrations/discord-webhook-path.svg)

1. Abre el menú junto al nombre del servidor y entra en **Ajustes del servidor**.
2. Entra en **Integraciones → Webhooks**.
3. Crea un webhook o abre uno que tengas permiso para usar.
4. Ponle nombre, selecciona el canal y guarda los cambios.
5. Copia la **URL del webhook**. El enlace empieza por `https://discord.com/api/webhooks/`.

## En Pokkan

Abre **Mensajes → Enviar**, selecciona el Kit y pega el enlace en el campo del webhook. Comprueba el Kit y el canal de destino antes de enviar.

<picture>
  <source media="(max-width: 48rem)" srcset="/screenshots/pokkan-send-workshop-mobile.webp" width="780" height="2084" />
  <img src="/screenshots/pokkan-send-workshop.webp" alt="Página de envío de Pokkan con vista previa y campo de webhook vacío" width="2560" height="2322" loading="lazy" decoding="async" />
</picture>

Revisa el mensaje y envíalo una vez. Abre el canal de Discord para comprobar el resultado. Cada envío correcto crea un mensaje nuevo. Si quieres corregir uno ya publicado, editar su Kit no cambia el original en Discord.

:::caution[Mantén el enlace en privado]
Cualquiera que tenga la URL puede usar el webhook. No la incluyas en mensajes, Kits, capturas ni solicitudes de ayuda. Si la expones, elimina y vuelve a crear el webhook en Discord.
:::

Si no aparece Webhooks, pide a un administrador que revise tus permisos. Copia la URL del webhook, no una invitación ni el enlace del canal.

Si tus menús son diferentes, la [guía ilustrada de Discord](https://support.discord.com/hc/es/articles/228383668-Intro-to-Webhooks) muestra dónde buscar. Para resolver errores de envío, consulta la [lista en inglés](/en/using-pokkan/troubleshooting/).

Siguiente: **[Envía tu mensaje →](/es/guide/send/)**
