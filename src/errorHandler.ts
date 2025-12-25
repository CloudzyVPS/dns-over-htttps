/**
 * Centralized error and response helpers
 * Implements RFC 7807 (Problem Details for HTTP APIs) for error responses
 */

import { CONTENT_TYPE_JSON } from "./constants";

/**
 * Returns a 400 Bad Request error in JSON format (RFC 7807)
 * @param msg Descriptive error message
 * @returns Response with 400 status and JSON error details
 */
export function badRequest(msg: string): Response {
  return new Response(JSON.stringify({
    error: "Bad Request",
    message: msg,
    code: 400
  }), {
    status: 400,
    headers: { "content-type": CONTENT_TYPE_JSON },
  });
}

/**
 * Returns a 413 Payload Too Large error in JSON format (RFC 7807)
 * @param msg Descriptive error message
 * @returns Response with 413 status and JSON error details
 */
export function payloadTooLarge(msg: string): Response {
  return new Response(JSON.stringify({
    error: "Payload Too Large",
    message: msg,
    code: 413
  }), {
    status: 413,
    headers: { "content-type": CONTENT_TYPE_JSON },
  });
}

/**
 * Returns a 500 Internal Server Error in JSON format (RFC 7807)
 * @param msg Descriptive error message
 * @returns Response with 500 status and JSON error details
 */
export function internalError(msg: string): Response {
  return new Response(JSON.stringify({
    error: "Internal Server Error",
    message: msg,
    code: 500
  }), {
    status: 500,
    headers: { "content-type": CONTENT_TYPE_JSON },
  });
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
