---
title: Conoce el editor
description: Edita en la vista previa y encuentra los controles de cada elemento.
sidebar:
  order: 3
---

Pulsa el texto que quieras cambiar y escribe directamente en el mensaje. El formato se mantiene visible mientras escribes, incluidos los títulos, las listas y los enlaces. Pulsa Escape para terminar de escribir y volver a los controles del elemento. Las etiquetas de los botones y las respuestas de encuestas usan texto sin formato.

Al editar un campo con Markdown, sus marcas aparecen en un color discreto. Puedes seleccionar o borrar los `**` que rodean una palabra en negrita sin eliminarla. En el ordenador, la barra de formato permanece en la parte inferior del editor, encima de las acciones del documento. En el móvil no se muestra esa barra y las acciones inferiores se ocultan mientras escribes, dejando espacio para el mensaje y el teclado. Enter añade una línea en estos campos. En las etiquetas de texto sin formato, Enter termina la edición.

Los controles laterales de un elemento siguen disponibles al editar sus elementos internos y acompañan el desplazamiento dentro de él. El comportamiento es el mismo en mensajes Legacy y Components V2.

<img src="/screenshots/pokkan-components-complete.webp" alt="Mensaje de bienvenida con texto, imagen y botón de enlace en el editor" width="2560" height="1752" loading="lazy" decoding="async" />

Usa **+** donde quieras añadir una parte. Dentro de un grupo, el **+** añade contenido a ese grupo. Al seleccionar un elemento aparecen controles para propiedades como el color y el emoji, mientras que **Configurar** reúne los detalles restantes. Los elementos que pueden cambiar de posición también tienen un asa para arrastrarlos.

Puedes probar cambios y recuperarlos con **Deshacer**, en los controles inferiores. Para guardar una copia, descárgala desde **JSON**. **Enviar** abre el paso de envío con este Kit seleccionado, donde puedes comprobar el destino antes de publicar.

En el móvil, **Mensajes** abre la lista sobre el editor. Elige un Kit, pulsa Escape o toca fuera de la lista para volver a editar. El botón de cierre está junto a **Crear mensaje**.

## Añade un sitio web a un botón

1. Selecciona el botón y abre la muestra de estilo de sus controles.
2. Elige **Enlace**. Pulsa el texto del botón para escribir una etiqueta como “Ver programa”.
3. Abre **Configurar** e introduce la dirección completa del sitio.

<img src="/screenshots/pokkan-section-link-styles.webp" alt="Estilos disponibles en los controles de un botón de Section" width="2560" height="2000" loading="lazy" decoding="async" />

Con el teclado, abre la muestra con Enter y recorre los estilos con las flechas. Enter confirma la elección y Escape cierra sin cambiar el botón. Al elegir Enlace, el campo de acción de la aplicación deja paso a la dirección del sitio. **Deshacer** recupera el estilo y sus datos anteriores.

## Deja solo el Embed o recupera el texto

1. Pulsa el texto situado sobre el Embed y presiona Escape para dejar de escribir.
2. Elige la papelera en los controles de ese texto. El Embed se conserva.
3. Para escribir encima de nuevo, abre **+** debajo del mensaje y elige **Contenido del mensaje**.

Para reescribir el texto, borra las palabras y sigue escribiendo en el campo vacío. Usa la papelera cuando ya no quieras ese campo en el mensaje. **Deshacer** permite recuperarlo con su texto.

## Emoji y validación

El control de emoji de un botón o una respuesta de encuesta permite buscar por nombre, explorar categorías o pegar un emoji de Discord. También acepta el ID de un emoji personalizado.

Usa **Deshacer** si te equivocas. Si falta un **+**, ese lugar puede haber alcanzado un límite o no admitir el tipo deseado. La validación indica qué necesita una estructura incompleta.

Al escribir `{`, aparecen sugerencias de Placeholder. `:` abre el selector de emojis, incluidos los del servidor que tengas disponibles y la colección de Pokkan cuando esté configurada. El editor añade el carácter de cierre y lo elimina junto con la apertura solo si acabas de insertar el par automático y sigue vacío. Los pares pegados, escritos manualmente o que ya han tenido contenido conservan el borrado normal.

Siguiente: **[Añade un embed →](/es/guide/embed/)**
