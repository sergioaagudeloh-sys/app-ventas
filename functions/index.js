const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getMessaging } = require("firebase-admin/messaging");
const { VertexAI } = require("@google-cloud/vertexai");

initializeApp();
const db = getFirestore();

/**
 * Cloud Function reactiva que detecta cuando se sube una imagen temporal de producto
 * al Storage, la procesa mediante Gemini 1.5 Flash y almacena el resultado en Firestore.
 * Usa firebase-functions v1 (onFinalize) para compatibilidad con plan Spark/sin billing.
 */
exports.processProductImage = functions.runWith({ maxInstances: 10 }).storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;


  // Solo procesar archivos subidos en la ruta temporal 'products_drafts/'
  if (!filePath.startsWith("products_drafts/")) {
    return null;
  }

  // Solo procesar imágenes válidas
  if (!contentType || !contentType.startsWith("image/")) {
    return null;
  }

  console.log(`[Smart Fix IA] Procesando nueva imagen: ${filePath}`);

  // Extraer el draftId de la ruta: products_drafts/draft_<UUID>_<nombre_original>.<ext>
  // El frontend genera el ID con crypto.randomUUID() que produce el patrón estándar:
  // draft_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Se usa regex para capturar este patrón exacto, ignorando el nombre original del archivo.
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const draftIdMatch = fileName.match(/^(draft_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!draftIdMatch) {
    console.warn(`[Smart Fix IA] No se pudo extraer draftId del archivo: ${fileName}`);
    return null;
  }
  const draftId = draftIdMatch[1];

  try {
    const bucket = getStorage().bucket(fileBucket);
    const file = bucket.file(filePath);

    // Descargar el archivo de imagen directamente a memoria
    const [fileBuffer] = await file.download();
    const base64Image = fileBuffer.toString("base64");

    // Autodetectar el ID del proyecto de Firebase en ejecución
    const projectId = process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG).projectId;
    const vertexAI = new VertexAI({ project: projectId, location: "us-central1" });

    // Instanciar el modelo Gemini 1.5 Flash configurando la respuesta forzada a JSON
    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const systemInstruction = `
Eres un asistente de redacción publicitaria de élite para e-commerce. Tu objetivo es analizar la imagen de un producto y redactar textos comerciales y de SEO de alto impacto.

Instrucciones de Redacción:
1. Analiza con detalle el producto: identifica materiales visibles (madera, acero, cuero, tela), acabados (mate, brillante, pulido), formas y estilo.
2. Razona sobre cuál es el mayor atractivo visual del producto.
3. Genera un nombre comercial sugerido que sea limpio y descriptivo (máximo 80 caracteres).
4. Genera una descripción comercial que sea ATRACTIVA pero CORTA (entre 3 y 5 líneas máximo). Debe ir directo al grano, usar un lenguaje persuasivo, destacar los detalles clave identificados en la imagen y explicar sutilmente por qué destaca. No utilices rellenos genéricos.
5. Genera un título SEO optimizado para el producto (máximo 60 caracteres). Debe incluir las palabras clave principales que un usuario buscaría en Google.
6. Genera una meta descripción SEO atractiva y precisa (máximo 155 caracteres). Debe resumir el producto de forma que incentive el clic en resultados de búsqueda.

Debes devolver exclusivamente un objeto JSON válido con la siguiente estructura:
{
  "nombre_sugerido": "Nombre comercial de impacto",
  "descripcion_comercial": "Descripción corta de venta basada en detalles visuales analizados",
  "seo_title": "Título SEO optimizado máx. 60 caracteres",
  "seo_description": "Meta descripción para buscadores máx. 155 caracteres"
}
`;

    const request = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: contentType,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    console.log("[Smart Fix IA] Enviando solicitud a Gemini 1.5 Flash...");
    const response = await generativeModel.generateContent(request);
    const responseText = response.response.candidates[0].content.parts[0].text;
    console.log("[Smart Fix IA] Respuesta recibida:", responseText);

    // Parsear el JSON devuelto por Gemini
    const result = JSON.parse(responseText);

    // Guardar los datos autogenerados en el borrador de Firestore
    // Los campos se anidan bajo 'suggestions' para que el frontend los lea con onSnapshot
    const draftRef = db.collection("draft_products").doc(draftId);
    await draftRef.set({
      suggestions: {
        nombre: result.nombre_sugerido || "",
        descripcion: result.descripcion_comercial || "",
        seoTitle: result.seo_title || "",
        seoDescription: result.seo_description || "",
      },
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`,
      filePath: filePath,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`[Smart Fix IA] Borrador ${draftId} guardado con éxito en Firestore.`);

  } catch (error) {
    console.error("[Smart Fix IA] Error procesando imagen con Gemini:", error);
    
    // Escribir el error en Firestore para notificar al panel administrativo
    try {
      await db.collection("draft_products").doc(draftId).set({
        error: "La IA no pudo procesar esta imagen. Intenta con otra foto o ingresa los datos de forma manual.",
        updatedAt: new Date()
      });
    } catch (e) {
      console.error("[Smart Fix IA] Falló al registrar error en Firestore:", e);
    }
  }

  return null;
});

/**
 * Cloud Function reactiva que escucha la creación de notificaciones en Firestore
 * y las envía como notificaciones push FCM a todos los dispositivos válidos del destinatario.
 */
exports.sendPushNotification = functions.firestore.document("notifications/{notificationId}").onCreate(async (snapshot, context) => {
  const notificationData = snapshot.data();
  if (!notificationData) return null;

  const { recipientId, recipientRole, title, body, clickAction, orderId, orderNumber } = notificationData;
  if (!recipientId || !title || !body) {
    console.log("[FCM Push] Parámetros incompletos en la notificación.");
    return null;
  }

  try {
    // 1. Obtener los tokens FCM válidos para el destinatario
    // Si es cliente, buscamos por celular (recipientId)
    // Para otros roles, buscamos por userId (que puede ser su id de empleado o 'admin')
    const tokensSnapshot = await db.collection("fcmTokens")
      .where("userId", "==", recipientId)
      .where("isValid", "==", true)
      .get();

    if (tokensSnapshot.empty) {
      console.log(`[FCM Push] No se encontraron tokens FCM activos para el usuario: ${recipientId}`);
      return null;
    }

    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) {
        tokens.push({ id: doc.id, token: data.token });
      }
    });

    console.log(`[FCM Push] Enviando notificación a ${tokens.length} dispositivos para el usuario: ${recipientId}`);

    const messaging = getMessaging();
    const sendPromises = tokens.map(async (item) => {
      const message = {
        token: item.token,
        notification: {
          title: title,
          body: body
        },
        data: {
          title: title,
          body: body,
          clickAction: clickAction || "/",
          orderId: orderId || "",
          orderNumber: orderNumber || ""
        },
        webpush: {
          headers: {
            Urgency: "high"
          },
          notification: {
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            requireInteraction: true
          }
        }
      };

      try {
        await messaging.send(message);
        console.log(`[FCM Push] Mensaje enviado con éxito al token: ${item.id}`);
      } catch (err) {
        console.error(`[FCM Push] Error al enviar al token ${item.id}:`, err);
        // Si el token ya no es válido, marcarlo en la base de datos
        if (err.code === "messaging/registration-token-not-registered" || 
            err.code === "messaging/invalid-registration-token" ||
            err.message?.includes("not registered") ||
            err.message?.includes("invalid")) {
          console.log(`[FCM Push] Invalidando token desactualizado en Firestore: ${item.id}`);
          await db.collection("fcmTokens").doc(item.id).update({
            isValid: false,
            invalidatedAt: new Date()
          });
        }
      }
    });

    await Promise.all(sendPromises);
    console.log("[FCM Push] Proceso de envío finalizado.");

  } catch (error) {
    console.error("[FCM Push] Error general en sendPushNotification:", error);
  }

  return null;
});
