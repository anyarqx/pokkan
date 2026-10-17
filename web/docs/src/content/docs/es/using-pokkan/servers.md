---
title: Cuenta, servidores y referencias
description: Inicia sesión, instala Pokkan y encuentra canales y roles autorizados para el mensaje.
sidebar:
  order: 2
---

Elige un servidor en la barra superior para abrir su colección de mensajes reutilizables. Al editar uno de sus Kits, también puedes buscar canales y roles por nombre con los datos disponibles para tu cuenta.

## Inicia sesión y elige un servidor

1. Entra con Discord desde el control de cuenta superior. La autorización solicita perfil y lista de servidores.
2. Abre la página de cuenta y busca un servidor apto para instalar Pokkan.
3. Usa su acción de instalación. Discord comprueba si puedes añadir aplicaciones allí.
4. Completa la instalación, vuelve y actualiza el estado. Visitar la invitación no confirma la instalación.
5. Elige el servidor instalado en el selector superior. La entrada **+** abre la gestión de cuenta.

Puedes volver a tu cuenta personal desde el mismo selector. Si usabas Pokkan antes de la integración con servidores, Discord puede pedirte permiso para acceder a su lista, manteniendo la cuenta y los Kits que ya tienes.

![Cuenta con servidores disponibles para selección e instalación](/screenshots/pokkan-account-contexts.webp)

## Crea y abre Kits del servidor

Con el servidor seleccionado, abre **Mensajes**, crea y guarda un Kit. Otros miembros autorizados podrán verlo. Un enlace directo comprueba el acceso antes de cargarlo y puede ajustar el contexto visible al Kit.

El creador y administradores pueden editar. Los demás miembros pueden crear sus propios Kits y ver los existentes. Consulta [permisos y borradores](/es/using-pokkan/kits/).

## Inserta canales y roles por nombre

En un campo que admite menciones, abre las referencias del servidor en la barra de formato. Busca y elige un canal o rol. Se inserta una referencia fija, como `<#123456789012345678>` o `<@&123456789012345678>`.

Solo se ofrecen canales permitidos para tu miembro. Que el bot tenga acceso no significa que tú también lo tengas. Los datos de permisos incompletos pueden impedir las sugerencias.

Una referencia fija no es `{channel.name}`. Un Kit del servidor puede mostrar `{guild.name}` y `{guild.id}` conocidos en la vista previa, pero no inventa un canal o usuario de ejecución. Los ejemplos de Placeholder no se sustituyen automáticamente al enviar por webhook.

## Actualización y cierre de sesión

La cuenta muestra si los datos están actualizados, antiguos o no disponibles. Pokkan normalmente actualiza después de unos 15 minutos. La actualización manual tiene un intervalo de 60 segundos; Discord puede exigir más espera. Los cambios de permisos pueden tardar hasta una nueva actualización.

Salir del servidor, perder autorización o quitar Pokkan puede impedir el acceso. Los fallos temporales no borran Kits. Cerrar sesión termina solo la sesión actual. Para revocar el consentimiento, usa **Aplicaciones autorizadas** en Discord.

Siguiente: [Guardar y reabrir](/es/guide/save/) · [Enviar](/es/guide/send/)
