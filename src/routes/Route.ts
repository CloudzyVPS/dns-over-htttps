/**
 * Route class for defining routes
 */

import { ParsedRequest } from "../utils/requestParser";

/**
 * Route handler function
 * Returns Response if route matches, null if it doesn't
 */
export type RouteHandler = (
  req: ParsedRequest,
  request: Request,
  upstreams: string[]
) => Promise<Response | null>;

/**
 * Route definition
 */
export type RouteDefinition = {
  method: string | string[];
  path: string | ((path: string, req?: ParsedRequest) => boolean);
  handler: RouteHandler;
  name?: string;
};

/**
 * Route registry
 */
class RouteRegistry {
  private routes: RouteDefinition[] = [];

  /**
   * Register a route
   */
  private register(method: string | string[], path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    this.routes.push({ method, path, handler, name });
  }

  /**
   * Register a GET route
   */
  get(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    this.register("GET", path, handler, name);
  }

  /**
   * Register a POST route
   */
  post(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    this.register("POST", path, handler, name);
  }

  /**
   * Register a route that matches any method
   */
  any(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    this.register(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], path, handler, name);
  }

  /**
   * Match a request to a route
   */
  match(req: ParsedRequest, request: Request, upstreams: string[]): Promise<Response | null> {
    for (const route of this.routes) {
      // Check method match
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      if (!methods.includes(req.method)) continue;

      // Check path match
      let pathMatches = false;
      if (typeof route.path === "string") {
        pathMatches = req.path === route.path || req.path.startsWith(route.path);
      } else {
        pathMatches = route.path(req.path, req);
      }

      if (pathMatches) {
        return route.handler(req, request, upstreams);
      }
    }
    return Promise.resolve(null);
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }
}

/**
 * Singleton route registry instance
 */
const router = new RouteRegistry();

/**
 * Route facade - static methods
 */
export class Route {
  /**
   * Register a GET route
   */
  static get(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    router.get(path, handler, name);
  }

  /**
   * Register a POST route
   */
  static post(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    router.post(path, handler, name);
  }

  /**
   * Register a route that matches any method
   */
  static any(path: string | ((path: string, req?: ParsedRequest) => boolean), handler: RouteHandler, name?: string): void {
    router.any(path, handler, name);
  }

  /**
   * Match a request to a route
   */
  static async match(req: ParsedRequest, request: Request, upstreams: string[]): Promise<Response | null> {
    return router.match(req, request, upstreams);
  }

  /**
   * Get all registered routes (for debugging)
   */
  static getRoutes(): RouteDefinition[] {
    return router.getRoutes();
  }
}

