# Plan de Implementación: Sistema de Inventario Inteligente Multimodal (Smart Fix)

Este documento detalla el estado actual de la integración de Inteligencia Artificial (Gemini 1.5 Flash) para la carga automática de productos, los pasos completados y los pendientes para cuando se active el plan Blaze en Firebase.

---

## Estado Actual de la Implementación (Pausado)

### 1. Cambios Completados en el Código Local:
* **Configuración del Storage:** Se modificó `src/config/firebaseConfig.js` para exportar la instancia de Storage (`storage`).
* **Código de la Cloud Function:** Se creó la función `processProductImage` en `functions/index.js` y se configuraron las dependencias en `functions/package.json`.
* **Configuración de Firebase:** Se añadió la sección `"functions"` en `firebase.json`.
* **Interfaz de Usuario (Frontend):** Se actualizó el componente `ProductFormModal.jsx` para gestionar la subida temporal a `artifacts/temp_uploads/{draftId}.jpg` y escuchar a `/draft_products/{draftId}` en Firestore.
* **Manual de Migración:** Se actualizó `instrucciones de migración/manual_migracion.md` agregando la sección "7. Configuración e Integración de IA Multimodal".

---

## Pendientes para Completar la Integración (Pasos a Seguir)

Una vez que se solucione el estado de la tarjeta y se pueda cambiar de plan en Firebase:

### Paso 1: Activar el Plan Blaze en Firebase
1. Entra a la [Consola de Firebase](https://console.firebase.google.com/).
2. Haz clic en el botón **"Mejorar"** o **"Upgrade"** en la esquina inferior izquierda.
3. Elige el **Plan Blaze** y vincula una tarjeta de crédito/facturación activa.

### Paso 2: Habilitar la API de Vertex AI en Google Cloud
1. Abre [Google Cloud Console](https://console.cloud.google.com/).
2. Busca **"Vertex AI API"** en la barra de búsqueda superior.
3. Haz clic en **Habilitar** (o **Enable**).

### Paso 3: Desplegar las Cloud Functions
Ejecuta el siguiente comando en la raíz del proyecto para subir las funciones de backend a Firebase:
```powershell
# En Windows (evitando restricciones de políticas de scripts de PowerShell):
firebase.cmd deploy --only functions
```

### Paso 4: Validar el Funcionamiento E2E
1. Abre el panel de administración.
2. Ve a inventario y haz clic en **"Agregar Producto"**.
3. Selecciona una imagen.
4. Confirma que se sube, aparece el indicador "IA analizando producto..." y se auto-completan los campos de Nombre y Descripción.
5. Verifica que al hacer clic en Cancelar se limpien los recursos temporales.
