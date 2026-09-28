import { test } from "node:test";
import assert from "node:assert/strict";
import { PHOTO_PATH_PATTERN, MAX_QUESTIONS, buildAskRequest, buildExplainRequest, buildRequest, parseAskAnswer, parseExplanation, parseReading } from "../prompt.js";

test("photo path must be dad-care-log/photos/<uid>/<file>", () => {
  assert.equal(PHOTO_PATH_PATTERN.exec("dad-care-log/photos/abc123/1-x.jpg")[1], "abc123");
  for (const bad of ["dad-care-log/photos/abc/../x.jpg", "other/abc/1.jpg", "dad-care-log/photos/abc/sub/1.jpg"]) {
    assert.equal(PHOTO_PATH_PATTERN.exec(bad), null, bad);
  }
});

test("request sends the image and asks for structured JSON", () => {
  const req = buildRequest({ kind: "note", mediaType: "image/jpeg", base64Data: "AAAA" });
  assert.equal(req.messages[0].content[0].type, "image");
  assert.equal(req.messages[0].content[0].source.media_type, "image/jpeg");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.match(req.messages[0].content[1].text, /receta/);
});

test("monitor instructions cover hospital equipment, not just home devices", () => {
  const req = buildRequest({ kind: "monitor", mediaType: "image/jpeg", base64Data: "AAAA" });
  const text = req.messages[0].content[1].text;
  assert.match(text, /ventilador mecánico/);
  assert.match(text, /monitor de signos vitales/);
  assert.doesNotMatch(text, /en casa \(/);
});

test("parses a normal reading", () => {
  const r = parseReading({ stop_reason: "end_turn", content: [{ type: "text", text: '{"readable":true,"text":"Pulso: 71 lpm","doubts":""}' }] });
  assert.deepEqual(r, { readable: true, text: "Pulso: 71 lpm", doubts: "" });
});

test("refusals and truncation are errors, never partial readings", () => {
  assert.throws(() => parseReading({ stop_reason: "refusal", content: [] }), { code: "refusal" });
  assert.throws(() => parseReading({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"readable":tr' }] }), { code: "truncated" });
});

test("explanation request sends only the confirmed text and asks for JSON", () => {
  const req = buildExplainRequest({ text: "SpO2: 96 %" });
  assert.equal(req.messages[0].content, "Lectura confirmada:\nSpO2: 96 %");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.match(req.system, /rango general/);
  assert.match(req.system, /No des un diagnóstico/);
});

test("explanation parsing cleans statuses, lengths and counts", () => {
  const answer = {
    values: [
      { label: "SpO2", value: "96 %", meaning: "Oxígeno en la sangre", generalRange: "92–100 %", status: "within" },
      { label: "FiO2", value: "65 %", meaning: "Oxígeno que da el ventilador", generalRange: "21 %", status: "weird" },
      { label: "", value: "1", meaning: "", generalRange: "", status: "above" },
    ],
    questions: Array.from({ length: 12 }, (_, i) => `Pregunta ${i}`),
  };
  const r = parseExplanation({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(answer) }] });
  assert.equal(r.values.length, 2);
  assert.equal(r.values[1].status, "no_range");
  assert.equal(r.questions.length, MAX_QUESTIONS);
});

test("an explanation refusal is an error, never an empty 'all clear'", () => {
  assert.throws(() => parseExplanation({ stop_reason: "refusal", content: [] }), { code: "refusal" });
});

test("ask request sends the question and asks for general information only", () => {
  const req = buildAskRequest({ question: "Derrame pleural bilateral y neumonía" });
  assert.equal(req.messages[0].content, "Derrame pleural bilateral y neumonía");
  assert.match(req.system, /No hagas un diagnóstico/);
  assert.match(req.system, /no recomendar medicamentos|sin recomendar medicamentos/);
});

test("ask answer parsing requires an answer and limits questions", () => {
  const ok = parseAskAnswer({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ answer: " Texto ", questions: Array(10).fill("¿?") }) }] });
  assert.equal(ok.answer, "Texto");
  assert.equal(ok.questions.length, MAX_QUESTIONS);
  assert.throws(() => parseAskAnswer({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ answer: "", questions: [] }) }] }), { code: "empty" });
});
