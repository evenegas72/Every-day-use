// Prompt, output schema and request builder for reading a care-log photo.
// Kept separate from index.js so it can be checked without Firebase.

export const MODEL = "claude-opus-5";

export const PHOTO_PATH_PATTERN = /^dad-care-log\/photos\/([A-Za-z0-9]{1,128})\/[A-Za-z0-9_.-]{1,100}$/;
export const PHOTO_KINDS = ["monitor", "note"];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The model's answer is only ever a draft that a family member must check,
// edit and confirm in the app before it's saved.
export const READING_SCHEMA = {
  type: "object",
  properties: {
    readable: {
      type: "boolean",
      description: "false if the photo is too blurry, dark, cropped or is not the expected kind of image.",
    },
    text: {
      type: "string",
      description: "The reading, in Spanish, one item per line. Empty if readable is false.",
    },
    doubts: {
      type: "string",
      description: "In Spanish: anything uncertain, partly illegible, or worth double-checking. Empty if nothing.",
    },
  },
  required: ["readable", "text", "doubts"],
  additionalProperties: false,
};

const SHARED_RULES = `Eres un asistente que ayuda a una familia en México a transcribir fotos para la bitácora de cuidados de un familiar.
Tu lectura es solo una sugerencia: un familiar la revisará y corregirá antes de guardarla.

Reglas:
- Escribe todo en español.
- Transcribe solo lo que se ve en la foto. No interpretes, no diagnostiques, no des consejos médicos y no digas si un valor es normal o anormal.
- Nunca adivines un número o una palabra. Si un dígito o palabra no se lee con claridad, escríbelo con [?] (por ejemplo "12[?]/80") y explícalo en "doubts".
- Si la foto es de otro tipo del que se indica (por ejemplo, se eligió «aparato» pero es una receta), transcríbela de todos modos según lo que realmente muestra.
- Solo pon readable en false si la foto no se puede leer (borrosa, oscura, cortada) o no muestra ningún aparato médico, nota ni documento; explica por qué en "doubts".`;

const KIND_INSTRUCTIONS = {
  monitor: `La foto es de la pantalla de un aparato médico. Puede ser un aparato de casa (baumanómetro, oxímetro de pulso, glucómetro, termómetro) o un equipo de hospital (monitor de signos vitales, ventilador mecánico, bomba de infusión, concentrador de oxígeno u otro).
- Una línea por valor, con el formato "Nombre: valor unidad". Ejemplos: "Presión arterial: 128/82 mmHg", "Pulso: 71 lpm", "Oxigenación (SpO2): 96 %", "Glucosa: 142 mg/dL", "Temperatura: 37.2 °C", "PEEP: 6 cmH2O".
- Usa la etiqueta y la unidad tal como aparecen en la pantalla (por ejemplo "Ppico", "VTesp", "FiO2"). Si no muestra unidad, no la inventes.
- En pantallas con muchos datos (ventiladores, monitores de hospital):
  - Empieza con el modo o programa si aparece (por ejemplo "Modo: VC-ACV").
  - Transcribe los valores medidos que se ven en números grandes.
  - Si la pantalla separa claramente los valores programados o configurados (por ejemplo, en una barra de botones abajo), ponlos después bajo una línea "Programado:".
  - Si hay mensajes de alarma o avisos escritos en la pantalla, transcríbelos en una línea "Aviso en pantalla: ...".
  - Ignora las gráficas y curvas; no describas su forma.
- Si la pantalla muestra fecha u hora, agrégala en otra línea ("Hora en el aparato: ...").
- Si hay varias lecturas guardadas o flechas de memoria, transcribe solo la que está en pantalla como la principal.`,
  note: `La foto es de una nota escrita a mano o de una receta médica.
- Transcribe el texto tal como está, línea por línea, respetando nombres de medicamentos, dosis, horarios e indicaciones.
- Copia los nombres de medicamentos exactamente como aparecen escritos; no los corrijas ni los cambies por otro nombre.
- No incluyas datos de identificación del médico (cédula, dirección, teléfono) a menos que formen parte de las indicaciones.`,
};

export function buildRequest({ kind, mediaType, base64Data }) {
  return {
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: READING_SCHEMA },
    },
    system: SHARED_RULES,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: KIND_INSTRUCTIONS[kind] },
        ],
      },
    ],
  };
}

// Returns { readable, text, doubts } or throws with a reason code.
export function parseReading(response) {
  if (response.stop_reason === "refusal") {
    const err = new Error("refusal");
    err.code = "refusal";
    throw err;
  }
  if (response.stop_reason === "max_tokens") {
    const err = new Error("truncated");
    err.code = "truncated";
    throw err;
  }
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    const err = new Error("no text block");
    err.code = "empty";
    throw err;
  }
  const parsed = JSON.parse(textBlock.text);
  return {
    readable: parsed.readable === true,
    text: String(parsed.text ?? "").slice(0, 3000),
    doubts: String(parsed.doubts ?? "").slice(0, 1000),
  };
}
