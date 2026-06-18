# Plataforma de Recorridos Virtuales 360°

Esta plataforma standalone permite visualizar imágenes 360° interactivas con calidad premium. Está diseñada para que puedas agregar y enlazar nuevas escenas editando únicamente el archivo `config.json`, sin necesidad de tocar código.

## Estructura de Carpetas

```
virtual-tour/
├── index.html        (No tocar)
├── css/              (No tocar)
├── js/               (No tocar)
├── config.json       (¡EDITA ESTE ARCHIVO!)
└── assets/
    ├── panoramas/    (Guarda aquí tus fotos 360° en .jpg)
    └── thumbnails/   (Guarda aquí imágenes pequeñas 400x225px)
```

## Cómo agregar un recorrido

1. Toma tus fotos 360° (proporción 2:1, equirectangulares) y guárdalas en `assets/panoramas/`.
2. Crea una captura pequeña de la foto y guárdala en `assets/thumbnails/`.
3. Abre `config.json` con cualquier editor de texto.
4. Agrega o modifica una "escena" bajo la sección `"scenes"`.

### Ejemplo de Configuración

```json
"mi_habitacion": {
  "title": "Mi Habitación",
  "description": "Descripción breve.",
  "image": "assets/panoramas/mi_foto.jpg",
  "thumbnail": "assets/thumbnails/mi_foto_thumb.jpg",
  "pitch": 0,
  "yaw": 0,
  "hfov": 100,
  "hotSpots": [
    {
      "type": "info",
      "pitch": 15,
      "yaw": 45,
      "title": "Un cuadro",
      "text": "Este cuadro lo pinté yo."
    },
    {
      "type": "scene",
      "pitch": 0,
      "yaw": 90,
      "targetScene": "otra_habitacion",
      "text": "Ir a la otra sala",
      "icon": "arrow"
    }
  ]
}
```

### ¿Qué son `pitch` y `yaw`?
- **Pitch**: Inclinación arriba/abajo (-90 a 90). `0` es el horizonte.
- **Yaw**: Giro izquierda/derecha (-180 a 180). `0` es el centro original de la foto.

*Tip: Para colocar hotspots exactamente donde quieres, abre tu consola del navegador, Pannellum imprime las coordenadas al hacer clic con la tecla `Shift` presionada, o puedes ir probando valores.*
