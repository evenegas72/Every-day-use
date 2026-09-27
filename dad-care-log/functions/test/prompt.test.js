import { test } from "node:test";
import assert from "node:assert/strict";
import { PHOTO_PATH_PATTERN, buildRequest, parseReading } from "../prompt.js";

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

test("parses a normal reading", () => {
  const r = parseReading({ stop_reason: "end_turn", content: [{ type: "text", text: '{"readable":true,"text":"Pulso: 71 lpm","doubts":""}' }] });
  assert.deepEqual(r, { readable: true, text: "Pulso: 71 lpm", doubts: "" });
});

test("refusals and truncation are errors, never partial readings", () => {
  assert.throws(() => parseReading({ stop_reason: "refusal", content: [] }), { code: "refusal" });
  assert.throws(() => parseReading({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"readable":tr' }] }), { code: "truncated" });
});
