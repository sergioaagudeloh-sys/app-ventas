# Manual de Migración y Despliegue de Backend (Nuevo Cliente)

Este manual contiene las especificaciones e instrucciones completas para migrar, configurar y desplegar esta aplicación para un cliente nuevo utilizando una cuenta e infraestructura de Firebase totalmente independiente y desde cero.

Siguiendo esta guía de manera exacta, se garantiza que **ningún elemento de diseño (tema, colores, tipografía, efectos visuales) ni de lógica de negocio (facturación, pedidos, catálogo) se rompa o altere**.

---

## 1. Funcionamiento de Colecciones en Firestore

En Cloud Firestore, **no es necesario crear de forma manual cada colección antes de usar la aplicación**. 

> [!NOTE]
> Firestore crea de forma automática e implícita las colecciones (`products`, `orders`, `wholesaleOrders`, `credits`, `ads`, `users`) cuando se realiza la primera escritura de un documento.

### Sin embargo, existen dos documentos de configuración fundamentales que debes inicializar:
La aplicación consulta el documento `/config/settings` y `/config/catalogFilters` en el arranque inicial. Si no existen, la aplicación intentará inicializarlos con valores por defecto locales (gracias al manejador automático en `appConfigService.js`), pero para personalizar la marca de tu cliente de inmediato y evitar variaciones imprevistas de color, es altamente recomendable crearlos en la base de datos de manera inicial.

---

## 2. Inicialización de Datos Semilla en Firestore

Entra a la sección de **Firestore Database** en la nueva consola de Firebase y crea la colección `config` con los siguientes dos documentos estructurados:

### Documento 1:
* **Colección:** `config`
* **ID del documento:** `settings`
* **Campos del Documento (JSON):**
```json
{
  "appName": "Nombre de la Tienda",
  "sellerName": "Nombre del Propietario",
  "appIcon": "",
  "theme": "rosa-elegante",
  "whatsappAdmin": "573000000000",
  "bankInfo": {
    "numeroCuenta": "123-456789-00",
    "banco": "Banco Ejemplo",
    "tipoCuenta": "ahorros"
  },
  "adminRegistered": false,
  "appFont": "inter",
  "appRadius": "rounded",
  "catalogBanner": {
    "type": "none",
    "value": ""
  },
  "catalogLayout": "grid2",
  "animationsEnabled": true,
  "actionColor": "",
  "welcomeWavesEnabled": true,
  "commissionPercent": 1
}
```
> [!IMPORTANT]
> El campo `"adminRegistered": false` es clave. Al abrir la app por primera vez e ir a la URL `/admin`, la aplicación detectará que no hay administrador registrado y mostrará automáticamente una pantalla para crear la primera cuenta (Email y Contraseña) en lugar del login habitual. Una vez completado, se guardará como `true` de manera automática.

### Documento 2:
* **Colección:** `config`
* **ID del documento:** `catalogFilters`
* **Campos del Documento (JSON):**
```json
{
  "categories": true,
  "sizes": true,
  "colors": true,
  "gender": true,
  "brand": false,
  "material": false
}
```

---

## 3. Preparación e Configuración de Firebase Console

Realiza la configuración del backend en la cuenta de Google de tu nuevo cliente:

1. Ve a [Firebase Console](https://console.firebase.google.com/) y haz clic en **Crear un proyecto**.
2. **Habilita los siguientes servicios:**
   * **Authentication:** Ve a *Build > Authentication* y habilita la pestaña **Correo electrónico y contraseña**.
   * **Firestore Database:** Ve a *Build > Firestore Database > Crear base de datos*. Elige la ubicación idónea y configúrala en **Modo producción**.
   * **Firebase Storage (Para fotos de productos/banners):** 
     * Ve a *Build > Storage* y haz clic en **Comenzar**.
     * Configúralo en **Modo producción**.
     * Ve a la pestaña **Rules** y actualiza las reglas de seguridad de Storage para permitir la lectura pública de imágenes y la subida de archivos únicamente a usuarios autenticados:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /{allPaths=**} {
           allow read: if true;
           allow write: if request.auth != null;
         }
       }
     }
     ```
   * **Hosting:** Ve a *Build > Hosting* y habilita el servicio.

3. **Registra la aplicación Web:**
   * Haz clic en el icono web (`</>`) en el dashboard principal de tu proyecto de Firebase.
   * Asigna un nombre a la aplicación y obtén el objeto de configuración (`firebaseConfig`).

---

## 4. Configuración del Entorno local en la App

En la carpeta raíz de tu código local, configura el direccionamiento al nuevo proyecto de Firebase:

1. Modifica o crea el archivo `.env.local` (el cual está protegido en `.gitignore` para que no se filtre en tus repositorios públicos) y reemplaza las variables por las de tu nuevo cliente:

```env
VITE_FIREBASE_API_KEY=AIzaSyA1...
VITE_FIREBASE_AUTH_DOMAIN=nuevo-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nuevo-proyecto
VITE_FIREBASE_STORAGE_BUCKET=nuevo-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...
```

---

## 5. Despliegue de Seguridad e Índices con un solo paso (Firebase CLI)

Los archivos de seguridad y optimización ya están completamente listos y optimizados en la raíz de tu proyecto. 

Para cargarlos en el nuevo proyecto de tu cliente:
1. Instala de forma global el CLI de Firebase si aún no lo posees:
   ```bash
   npm install -g firebase-tools
   ```
2. Inicia sesión en la cuenta del cliente nuevo:
   ```bash
   firebase login
   ```
3. Vincula la terminal con el nuevo proyecto:
   ```bash
   firebase use --add
   ```
   *(Selecciona el ID del proyecto del nuevo cliente y asígnale el alias `default`)*.
4. Despliega las Reglas de Seguridad de Firestore e Índices de una sola vez:
   ```bash
   firebase deploy --only firestore
   ```
   *(Esto subirá automáticamente los archivos locales [firestore.rules](file:///d:/Aplicaciones/App%20Ventas/firestore.rules) y [firestore.indexes.json](file:///d:/Aplicaciones/App%20Ventas/firestore.indexes.json) al nuevo backend).*

> [!WARNING]
> **Tiempo de Construcción de los Índices en Firestore:**
> Al desplegar los índices compuestos por primera vez, Firestore iniciará su proceso de compilación y construcción en segundo plano. Esto tarda normalmente **entre 1 y 5 minutos**. Durante este periodo, las consultas paginadas o filtradas (por ejemplo, el panel de créditos) fallarán en el frontend mostrando el error: `FirebaseError: The query requires an index. That index is currently building and cannot be used yet.`
>
> Esto es un comportamiento normal y temporal. No intentes modificar el código ni desplegar nuevamente; solo debes esperar a que Firestore complete la construcción del índice en el servidor. Puedes verificar el estado en tiempo real en la consola de Firebase en la pestaña *Firestore Database > Índices*.

---

## 6. Construcción y Despliegue del Frontend (PWA)

Una vez conectadas las variables y configurado el backend:

1. **Compila la aplicación en modo producción:**
   ```bash
   npm run build
   ```
   *(Este comando empaquetará el código HTML/JS de React de manera óptima, compilará los estilos CSS, registrará los service workers de PWA y guardará los archivos compilados en la carpeta `/dist`)*.
2. **Sube los archivos al Hosting de Firebase:**
   ```bash
   firebase deploy --only hosting
   ```
3. ¡Felicidades! Al finalizar, la terminal te indicará la URL de Hosting del nuevo cliente (ej. `https://nuevo-proyecto.web.app`), donde la app se encontrará 100% activa, funcional y con su diseño premium intacto.

---

## 7. Configuración e Integración de IA Multimodal (Plan Blaze y Vertex AI)

Para que la carga de productos con sugerencias por Inteligencia Artificial funcione de forma óptima para cada cliente, debes realizar los siguientes pasos adicionales de configuración:

### Paso A: Cambiar al Plan Blaze (Pago por uso)
1. Ve a [Firebase Console](https://console.firebase.google.com/) del cliente.
2. En la esquina inferior izquierda verás una etiqueta de **"Plan Spark"**. Haz clic en **"Mejorar"** o **"Upgrade"**.
3. Selecciona el **Plan Blaze** y asócialo a una cuenta de facturación de Google Cloud. *(Firebase cuenta con un plan gratuito muy amplio; no se facturará nada a menos que superes estos límites comerciales)*.

### Paso B: Habilitar la API de Vertex AI en Google Cloud
1. Entra a [Google Cloud Console](https://console.cloud.google.com/) con la misma cuenta del cliente.
2. Asegúrate de tener seleccionado el proyecto correcto en la barra superior.
3. Busca **"Vertex AI API"** en la barra de búsqueda superior.
4. Haz clic en la opción correspondiente y luego presiona el botón **"Habilitar"** (o **"Enable"**). Espera a que se active el servicio.

### Paso C: Despliegue de la Cloud Function
1. Asegúrate de tener instalado Node.js (versión 18 o superior) en tu entorno local.
2. Abre la terminal en la raíz del proyecto y despliega únicamente la función con:
   ```bash
   firebase deploy --only functions
   ```
   *(Esto compilará el código de `/functions`, instalará las dependencias necesarias y creará la función reactiva `processProductImage` en la región `us-central1` de manera automática)*.
