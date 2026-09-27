// Cloud Function for the Care Log: reads a photo that a family member has
// already uploaded to Storage and returns a *suggested* transcription from
// Claude. It never writes to Firestore. The person reviews, edits and
// confirms the suggestion in the app before anything is saved.

import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import {
  ALLOWED_MEDIA_TYPES,
  MAX_PHOTO_BYTES,
  PHOTO_KINDS,
  PHOTO_PATH_PATTERN,
  buildRequest,
  parseReading,
} from "./prompt.js";

initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

export const readCarePhoto = onCall(
  {
    region: "us-central1",
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 180,
    memory: "512MiB",
    maxInstances: 3,
  },
  async (request) => {
    const auth = request.auth;
    if (!auth || auth.token.email_verified !== true) {
      throw new HttpsError("unauthenticated", "sign-in required");
    }

    const { path, kind } = request.data ?? {};
    if (typeof path !== "string" || !PHOTO_KINDS.includes(kind)) {
      throw new HttpsError("invalid-argument", "path and kind are required");
    }

    // Access control: the caller may only have their *own* uploads read.
    // Storage rules only let family members write into
    // dad-care-log/photos/<their uid>/, so a file existing at this path
    // proves the caller passed the family allow-list when they uploaded
    // it. That keeps the allow-list in one place (the rules files).
    const match = PHOTO_PATH_PATTERN.exec(path);
    if (!match || match[1] !== auth.uid) {
      throw new HttpsError("permission-denied", "not your photo");
    }

    const file = getStorage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", "photo not found");
    }
    const [metadata] = await file.getMetadata();
    const mediaType = metadata.contentType;
    if (!ALLOWED_MEDIA_TYPES.includes(mediaType) || Number(metadata.size) > MAX_PHOTO_BYTES) {
      throw new HttpsError("invalid-argument", "unsupported photo");
    }
    const [bytes] = await file.download();

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let response;
    try {
      response = await client.beta.messages.create(
        buildRequest({ kind, mediaType, base64Data: bytes.toString("base64") }),
      );
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        logger.warn("Claude rate limited", { status: error.status });
        throw new HttpsError("resource-exhausted", "busy, try again");
      }
      if (error instanceof Anthropic.APIError) {
        logger.error("Claude API error", { status: error.status, message: error.message });
        throw new HttpsError("unavailable", "AI reading failed");
      }
      throw error;
    }

    try {
      const reading = parseReading(response);
      logger.info("photo read", { kind, readable: reading.readable, model: response.model });
      return reading;
    } catch (error) {
      logger.error("could not use Claude response", {
        code: error.code ?? "parse",
        stop_reason: response.stop_reason,
      });
      throw new HttpsError("internal", "AI reading unusable");
    }
  },
);
