/**
 * Help/documentation endpoint handler
 */

import { ParsedRequest } from "../../utils/requestParser";
import { helpResponse } from "../../responses/help";
import { PATH_ROOT, PATH_HELP } from "../../config/constants";

export async function handleHelp(
  req: ParsedRequest,
  _request: Request,
  _upstreams: string[]
): Promise<Response | null> {
  return req.path === PATH_ROOT || req.path === PATH_HELP ? helpResponse() : null;
}

