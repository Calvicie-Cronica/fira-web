# AgroCebada FIRA 2026 · Página interactiva

Abrir `index.html` con doble clic. No requiere servidor ni conexión a internet.

## Estructura

- `index.html`: contenido y secciones.
- `css/estilos.css`: estilos.
- `js/app.js`: gráficas e interacciones.
- `js/datos.js`: datos resumidos (generado).
- `descargas/`: archivos disponibles para descarga en la página.
- `img/`: guardar aquí `metodologia.png` para mostrarla en la sección 02.
- `herramientas/preparar_datos.py`: regenera `js/datos.js` y los CSV de `descargas/`.

## Actualizar datos

Con la carpeta de resultados (`res_ahorasi`) disponible:

    python herramientas/preparar_datos.py --origen ruta/a/res_ahorasi

Requiere `pandas`.

## Publicar

Subir la carpeta completa a un repositorio y activar GitHub Pages sobre la rama principal.
