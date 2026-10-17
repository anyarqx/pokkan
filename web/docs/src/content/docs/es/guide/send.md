---
title: Envía tu mensaje
description: Revisa la vista previa y publica en un canal mediante tu webhook.
sidebar:
  order: 7
---

Necesitas un Kit y la [URL del webhook](/es/guide/create-webhook/). Usa un canal de pruebas para el primer envío.

## En Pokkan

1. En el editor, elige **Enviar**. También puedes abrir **Mensajes → Enviar** y seleccionar un Kit.
2. Revisa el texto, los enlaces, las imágenes y las menciones.
3. Pega la URL en el campo del webhook. Corrige los errores indicados antes de continuar.
4. Envía una sola vez.

<img src="/screenshots/pokkan-send-workshop.webp" alt="Página de envío con vista previa y campo de webhook vacío" width="2560" height="2322" loading="lazy" decoding="async" />

## En Discord

Abre el canal del webhook y comprueba que el mensaje ha llegado.

:::caution[Cada envío crea una publicación]
Enviar de nuevo crea otro mensaje. Editar o eliminar el Kit no modifica un mensaje ya publicado en Discord.
:::

Después de un envío correcto, Pokkan guarde el webhook en este navegador hasta 30 días, por separado para cada cuenta o visitante. Vacía el campo para eliminar la URL guardada. No se incluye en Kits guardados o compartidos, y conviene evitar esta opción en dispositivos compartidos.

Para llevar al lector a una web, usa un botón de enlace. Pokkan indica antes de continuar si el mensaje requiere acciones de aplicación o subidas de archivos, que todavía no son compatibles con este envío.

Si usas Placeholders, revisa también **JSON → Discord Payload**. La vista previa puede mostrar un ejemplo o el nombre conocido del servidor, pero el webhook envía el texto almacenado. Sustituye los tokens por lo que debe aparecer en el canal.

Si falla, revisa la URL, el canal y los errores de validación. No pulses repetidamente mientras un envío está en curso. La [lista de solución de problemas en inglés](/en/using-pokkan/troubleshooting/) ofrece más ayuda.

Siguiente: **[Guarda y vuelve a abrir un Kit →](/es/guide/save/)**
