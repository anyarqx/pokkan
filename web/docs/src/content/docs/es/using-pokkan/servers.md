---
title: Cuenta, servidores y referencias
description: Elige dónde guardar Kits y consulta canales, roles y emojis cuando Pokkan esté instalada.
sidebar:
  order: 2
---

Elige tu cuenta o un servidor en la barra superior para abrir su colección de mensajes. Aparecen los servidores con Pokkan instalada y aquellos donde eres propietario o tienes **Gestionar servidor** o **Administrador**. En estos últimos puedes guardar Kits antes de instalarla. Pertenecer a otro servidor no basta para abrir su colección en Pokkan.

## Elige un servidor

1. Inicia sesión con Discord desde el control de cuenta. La autorización solicita tu perfil y la lista de servidores a los que perteneces.
2. En el selector junto al avatar, elige tu cuenta personal o un servidor.
3. Abre **Mensajes** para consultar esa colección y crear un Kit en ella.

El avatar abre la página de cuenta, y la entrada **+** del selector también lleva a su gestión. Autorizar la lista de servidores en una cuenta existente conserva sus Kits.

Para consultar canales, roles y emojis, añade Pokkan desde la acción de instalación del servidor en la página de cuenta. Discord comprueba si puedes instalar aplicaciones allí. Completa la autorización y vuelve a actualizar el estado, porque abrir la invitación no confirma la instalación.

## Crea y abre Kits del servidor

Selecciona el servidor antes de crear y guardar el Kit. Los demás miembros autorizados podrán encontrarlo en su lista. Un enlace directo comprueba el acceso antes de cargar el contenido y puede ajustar el selector al servidor correspondiente, sin transferir el Kit.

Solo el propietario del servidor y quienes tienen Administrador o Gestionar servidor pueden acceder a la colección privada, crear, editar y eliminar Kits, aunque Pokkan todavía no esté instalada. Un enlace compartido puede conceder acceso independiente de lectura o edición. Consulta [permisos y borradores](/es/using-pokkan/kits/).

## Busca canales, roles y emojis

Con Pokkan instalada, escribe `#` para buscar canales o `@` para buscar roles en un campo compatible. Introduce parte del nombre y elige una sugerencia con el ratón, el tacto o Enter. La sugerencia inserta referencias fijas como `<#123456789012345678>` o `<@&123456789012345678>` sin ofrecer una lista de usuarios.

Se incluyen categorías y los tipos de canal presentes en los datos autorizados, como texto, voz, anuncios, escenario y foro. `@` también ofrece `@everyone` y `@here`. Insertarlos no activa las notificaciones por sí solo, así que revisa las [menciones permitidas](/es/using-pokkan/message-settings/) antes de enviar.

Los canales se filtran con tus permisos. Que el bot pueda ver un canal no te concede acceso a él, y la falta de datos suficientes puede ocultar sugerencias.

El selector de emojis ofrece los que están disponibles para tus roles en ese servidor y, cuando está configurada, una colección de Pokkan. Los emojis restringidos a otros roles no aparecen. Discord sigue aplicando las restricciones del canal de destino al usarlos.

Los Placeholders `{guild.name}` y `{guild.id}` pueden mostrar los datos conocidos en la vista previa. El envío por webhook no los sustituye automáticamente, así que revisa el texto antes de publicar.

## Actualización y cambios de acceso

La cuenta muestra si los datos están actualizados o necesitan renovarse. Pokkan normalmente los actualiza después de unos 15 minutos. Puedes pedir una actualización manual si falta un canal o ha cambiado un nombre, con un intervalo de 60 segundos que puede aumentar si Discord pide esperar.

Los cambios pueden tardar hasta la siguiente actualización en aparecer, pero los datos guardados no autorizan por sí solos las operaciones sobre Kits. Si sales del servidor o pierdes la autorización, puedes perder el acceso. Quitar Pokkan impide nuevas consultas de canales, roles y emojis, pero no borra la colección de Kits. Los fallos temporales tampoco borran mensajes guardados.

Cerrar sesión termina solo la sesión actual. Para revocar el acceso de Pokkan a tu cuenta de Discord, elimínala de **Aplicaciones autorizadas** en Discord.

Continúa con [Kits y guardado](/es/using-pokkan/kits/) o [Enviar](/es/guide/send/).
