/**
 * Centralized error and response helpers
 * Implements RFC 7807 (Problem Details for HTTP APIs) for error responses
 */

import { CONTENT_TYPE_JSON } from "../config/constants";

function errorResponse(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message, code: status }), {
    status,
    headers: { "content-type": CONTENT_TYPE_JSON },
  });
}

export function badRequest(msg: string): Response {
  return errorResponse(400, "Bad Request", msg);
}

export function payloadTooLarge(msg: string): Response {
  return errorResponse(413, "Payload Too Large", msg);
}

export function internalError(msg: string): Response {
  return errorResponse(500, "Internal Server Error", msg);
}

/**
 * Returns a 404 Not Found error
 * @returns Response with 404 status and plain text message
 */
export function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

/**
 * Health check endpoint response (non-standard, for monitoring)
 * @returns Response with JSON containing health status and timestamp
 */
export function healthResponse(): Response {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { "content-type": CONTENT_TYPE_JSON },
  });
}

