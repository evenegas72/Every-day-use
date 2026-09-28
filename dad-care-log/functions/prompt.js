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
  const parsed = parseJsonAnswer(response);
  return {
    readable: parsed.readable === true,
    text: String(parsed.text ?? "").slice(0, 3000),
    doubts: String(parsed.doubts ?? "").slice(0, 1000),
  };
}

// The JSON object in a structured-output response, or throws with a code.
function parseJsonAnswer(response) {
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
  return JSON.parse(textBlock.text);
}

// ---------------------------------------------------------------------------
// General explanation of a confirmed reading: what each value means, the
// general adult range, whether the value is inside it, and questions to take
// to the nurse or doctor. Text only (no photo): it explains the numbers the
// family member has already checked and confirmed.
// ---------------------------------------------------------------------------
export const VALUE_STATUSES = ["within", "below", "above", "no_range"];
export const MAX_EXPLAIN_TEXT = 3000;
export const MAX_VALUES = 20;
export const MAX_QUESTIONS = 8;

export const EXPLAIN_SCHEMA = {
  type: "object",
  properties: {
    values: {
      type: "array",
      description: "One item per value in the reading, in the same order.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "The value's name as written in the reading, e.g. \"SpO2\"." },
          value: { type: "string", description: "The value with its unit, exactly as in the reading, e.g. \"96 %\"." },
          meaning: { type: "string", description: "One short sentence in Spanish: what this value measures." },
          generalRange: { type: "string", description: "The usual general range for adults, e.g. \"92–100 %\"; empty if there is no general range." },
          status: { type: "string", enum: VALUE_STATUSES },
        },
        required: ["label", "value", "meaning", "generalRange", "status"],
        additionalProperties: false,
      },
    },
    questions: {
      type: "array",
      description: "Short questions in Spanish to ask the nurse or doctor, about values outside the general range or unclear.",
      items: { type: "string" },
    },
  },
  required: ["values", "questions"],
  additionalProperties: false,
};

const EXPLAIN_RULES = `Eres un asistente que ayuda a una familia en México a entender, de forma general, los valores de un aparato médico que cuidan en casa o en el hospital.
Recibes una lectura que un familiar ya revisó y confirmó. Para cada valor de la lectura:
- "meaning": en una frase corta y sencilla, qué mide ese valor.
- "generalRange": el rango general habitual para adultos (por ejemplo "92–100 %", "60–100 lpm"). Usa los rangos de referencia más aceptados.
- "status": "within" si el valor está dentro de ese rango, "below" si está por debajo, "above" si está por encima.
- Usa "no_range" cuando no existe un rango general porque el equipo médico lo ajusta para cada paciente (por ejemplo el modo del ventilador u otros valores programados), cuando el valor no es un número, o cuando no estás seguro del rango. En ese caso deja "generalRange" vacío o explica en él que lo ajusta el equipo médico.
- En valores medidos por un ventilador que sí tienen una referencia general conocida (por ejemplo la presión meseta o la frecuencia respiratoria), da esa referencia.

"questions": de 0 a ${MAX_QUESTIONS} preguntas cortas y concretas para hacerle a la enfermera o al médico, sobre los valores fuera del rango general o poco claros. Ejemplo: "La FiO2 está en 65 %. ¿Cuál es la meta actual y se está bajando?".

Reglas:
- Escribe todo en español sencillo.
- Da solo información general sobre cada valor por separado. No des un diagnóstico, no sugieras medicamentos ni cambios en el tratamiento o en el aparato.
- Usa solo los valores que aparecen en la lectura; no inventes valores.
- Si la lectura no tiene valores que explicar, devuelve listas vacías.`;

export function buildExplainRequest({ text }) {
  return {
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: EXPLAIN_SCHEMA },
    },
    system: EXPLAIN_RULES,
    messages: [{ role: "user", content: `Lectura confirmada:\n${text}` }],
  };
}

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

// Returns { values, questions } with sizes and statuses checked, or throws.
export function parseExplanation(response) {
  const parsed = parseJsonAnswer(response);
  const values = (Array.isArray(parsed.values) ? parsed.values : [])
    .slice(0, MAX_VALUES)
    .map((v) => ({
      label: clip(v.label, 80),
      value: clip(v.value, 60),
      meaning: clip(v.meaning, 300),
      generalRange: clip(v.generalRange, 120),
      status: VALUE_STATUSES.includes(v.status) ? v.status : "no_range",
    }))
    .filter((v) => v.label && v.value);
  const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
    .map((q) => clip(q, 300))
    .filter(Boolean)
    .slice(0, MAX_QUESTIONS);
  return { values, questions };
}
