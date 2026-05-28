const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { VertexAI } = require("@google-cloud/vertexai");

initializeApp();
const db = getFirestore();

/**
 * Cloud Function reactiva que detecta cuando se sube una imagen temporal de producto
 * al Storage, la procesa mediante Gemini 1.5 Flash y almacena el resultado en Firestore.
 */
exports.processProductImage = onObjectFinalized({ maxInstances: 10 }, async (event) => {
  const fileBucket = event.data.bucket; // Bucket de Storage.
  const filePath = event.data.name; // Ruta del archivo.
  const contentType = event.data.contentType; // Tipo de contenido.

  // Solo procesar archivos subidos en la ruta temporal 'artifacts/temp_uploads/'
  if (!filePath.startsWith("artifacts/temp_uploads/")) {
    return null;
  }

  // Solo procesar imágenes válidas
  if (!contentType || !contentType.startsWith("image/")) {
    return null;
  }

  console.log(`[Smart Fix IA] Procesando nueva imagen: ${filePath}`);

  // Extraer el draftId de la ruta (artifacts/temp_uploads/draftId.jpg)
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const draftId = fileName.split(".")[0];

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
Eres un asistente de redacción publicitaria de élite para e-commerce. Tu objetivo es analizar la imagen de un producto y redactar un nombre y una descripción comercial de alto impacto.

Instrucciones de Redacción:
1. Analiza con detalle el producto: identifica materiales visibles (madera, acero, cuero, tela), acabados (mate, brillante, pulido), formas y estilo.
2. Razona sobre cuál es el mayor atractivo visual del producto.
3. Genera un nombre comercial sugerido que sea limpio y descriptivo (máximo 80 caracteres).
4. Genera una descripción comercial que sea ATRACTIVA pero CORTA (entre 3 y 5 líneas máximo). Debe ir directo al grano, usar un lenguaje persuasivo, destacar los detalles clave identificados en la imagen y explicar sutilmente por qué destaca. No utilices rellenos genéricos.

Debes devolver exclusivamente un objeto JSON válido con la siguiente estructura:
{
  "nombre_sugerido": "Nombre comercial de impacto",
  "descripcion_comercial": "Descripción corta de venta basada en detalles visuales analizados"
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
    const draftRef = db.collection("draft_products").doc(draftId);
    await draftRef.set({
      nombre_sugerido: result.nombre_sugerido || "",
      descripcion_comercial: result.descripcion_comercial || "",
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`,
      filePath: filePath,
      updatedAt: new Date()
    });

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
