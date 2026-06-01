# Guía de Despliegue: Formulario de Control de EPPs (Club de Regatas Lima)

Esta guía te guiará paso a paso para desplegar tu nuevo formulario de control de EPP en Google Drive. El formulario guardará automáticamente todas las respuestas en una hoja de Google Sheets, procesará el estado de cambio de forma independiente y tiene una apariencia profesional con los colores del Club (Azul Marino y Oro).

---

## 📋 Requisitos Previos

Solo necesitas tener una cuenta de Google (Gmail o Google Workspace/Regatas) activa.

---

## 🛠️ Guía Paso a Paso para la Instalación

### Paso 1: Crear la Hoja de Google Sheets
1. Ve a [Google Drive](https://drive.google.com) y haz clic en **Nuevo** ➔ **Hoja de cálculo de Google**.
2. Ponle un nombre claro a tu archivo, por ejemplo: `REGISTRO_EPPs_Personal_Mantenimiento`.
3. Copia el **ID de la Hoja de Cálculo** desde la barra de direcciones de tu navegador web. El ID es la cadena larga de caracteres que se encuentra entre `/d/` y `/edit` en la URL.
   * *Ejemplo de URL*: `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0jK/edit#gid=0`
   * *El ID en este ejemplo sería*: `1a2b3c4d5e6f7g8h9i0jK`

---

### Paso 2: Abrir e Configurar Google Apps Script
Puedes configurar el script de dos formas: **Enlazado (Recomendado)** o **Independiente**.

#### Opción A: Script Enlazado (Más fácil y rápido)
1. En la hoja de cálculo que acabas de crear, ve al menú superior: **Extensiones** ➔ **Apps Script**.
2. Esto abrirá un editor web de código. Borra cualquier código que aparezca por defecto (como `function myFunction() { ... }`).
3. Abre el archivo local de tu computadora: `formulario-epp/codigo_apps_script.js`.
4. Copia **todo** su contenido y pégalo completo en el editor de Apps Script.
5. Como es un script enlazado, puedes dejar `const SHEET_ID = "";` vacío. El sistema detectará automáticamente la hoja a la que está vinculado.
6. Haz clic en el icono de **Guardar** (el disquete 💾) en la barra de herramientas.

#### Opción B: Script Independiente (Usando un ID específico)
1. Si prefieres crear el Apps Script desde cero en tu Google Drive (**Nuevo** ➔ **Más** ➔ **Google Apps Script**).
2. Pega todo el contenido del archivo `formulario-epp/codigo_apps_script.js`.
3. Reemplaza el valor de la variable `SHEET_ID` con el ID real que copiaste en el Paso 1:
   ```javascript
   const SHEET_ID = "TU_ID_DE_GOOGLE_SHEETS_AQUÍ";
   ```
4. Guarda el archivo con el disquete 💾.

---

### Paso 3: Desplegar como Aplicación Web (Web App)
Para que los técnicos puedan ingresar al formulario desde su teléfono o PC, debemos desplegarlo públicamente:

1. En la esquina superior derecha del editor de Apps Script, haz clic en el botón azul **Implementar** (o **Deploy**) ➔ **Nueva implementación**.
2. En la ventana emergente, haz clic en el icono de engranaje ⚙️ (junto a "Seleccionar tipo") y elige **Aplicación web**.
3. Configura los siguientes campos:
   * **Descripción**: `Versión Inicial Formulario EPP`
   * **Ejecutar como**: Selecciona **Tu correo electrónico** (tu cuenta de Google). Esto asegura que el formulario tenga permisos para escribir en tu Google Sheet en tu nombre.
   * **Quién tiene acceso**: Selecciona **Cualquier persona** (o **Anyone**). *Nota: Esto es indispensable para que los técnicos puedan ingresar y registrar sus respuestas sin necesidad de registrarse o iniciar sesión obligatoriamente en Apps Script*.
4. Haz clic en el botón azul **Implementar**.

---

### Paso 4: Autorizar Permisos de Google
La primera vez que realices el despliegue, Google te pedirá autorizar al script para escribir en tu hoja de cálculo:

1. Haz clic en el botón **Autorizar acceso**.
2. Elige tu cuenta de Google.
3. Te aparecerá una pantalla de advertencia que dice "Google no ha verificado esta aplicación" (esto es normal para proyectos de script personales).
4. Haz clic en **Configuración avanzada** (letras pequeñas en la parte inferior izquierda).
5. Haz clic en **Ir a Proyecto sin nombre (no seguro)** o **Ir a Control de EPP (no seguro)**.
6. En la siguiente pantalla, revisa los permisos y haz clic en **Permitir**.

---

### Paso 5: ¡Listo para Compartir!
Una vez completado el despliegue, Google Apps Script te mostrará una ventana con dos datos clave:
1. **ID de implementación**
2. **URL de la aplicación web**: Esta es la dirección web de tu formulario.
   * *Se verá algo así*: `https://script.google.com/macros/s/AKfycb..._abc123/exec`

👉 **Copia esta URL**. Este es el enlace directo a tu formulario premium. Puedes compartirlo con tu personal técnico por WhatsApp, correo electrónico, o crear un código QR y pegarlo en el taller de mantenimiento para que lo escaneen fácilmente desde su celular.

---

## 📊 ¿Cómo verás las respuestas en Google Sheets?

Al primer envío de un técnico, el script creará automáticamente una pestaña en tu hoja llamada **`Registro_EPPs`** con un formato impecable:
* La cabecera se pintará automáticamente en color **Azul Marino (Navy)** con texto blanco en negrita.
* Las columnas capturarán ordenadamente:
  1. **Marca de Tiempo**: Fecha y hora exacta del envío.
  2. **Nombre Completo**: Del técnico que completó el registro.
  3. **Especialidad**: Pintura, Albañilería, Electricista, etc.
  4. **Resumen de Inspección**: Un resumen legible de todos sus EPPs, por ejemplo:
     `[Casco de Seguridad: Lo tiene] [Lentes de Seguridad: Requiere cambio] [Guantes de Nitrilo: No usa]...`
  5. **EPPs que Requieren Cambio**: Un campo extremadamente útil para compras o seguridad ocupacional. Mostrará una lista limpia separada por comas de **únicamente los EPPs que requieren reemplazo** (ej: `Lentes de Seguridad, Mameluco Descartable`). Si el técnico no requiere cambios de EPP, dirá `Ninguno`.
  6. **Otros EPPs / Observaciones**: Observaciones adicionales o solicitudes ingresadas en texto libre.
