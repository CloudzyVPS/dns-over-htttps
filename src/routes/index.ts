/**
 * Request router for DoH worker
 * Routing system
 */

import { ParsedRequest } from "../utils/requestParser";
import { notFound } from "../responses/errorHandler";
import { Route } from "./Route";
import { defineRoutes, setRequestContext } from "./web";

// Initialize routes on first import
defineRoutes();

/**
 * Routes a parsed request to the appropriate handler
 */
export async function route(
  req: ParsedRequest,
  request: Request,
  upstreams: string[]
): Promise<Response> {
  // Set request context for route matchers that need it
  setRequestContext(req);

  // Try to match route
  const response = await Route.match(req, request, upstreams);
  
  if (response !== null) {
    return response;
  }

  return notFound();
}
