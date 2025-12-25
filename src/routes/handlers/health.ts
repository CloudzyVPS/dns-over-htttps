/**
 * Health check endpoint handler
 */

import { ParsedRequest } from "../../utils/requestParser";
import { healthResponse } from "../../responses/errorHandler";
import { PATH_HEALTH } from "../../config/constants";

export async function handleHealth(
  req: ParsedRequest,
  _request: Request,
  _upstreams: string[]
): Promise<Response | null> {
  return req.path === PATH_HEALTH ? healthResponse() : null;
}

