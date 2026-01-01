/**
 * Constants used throughout the DoH worker
 */

/** Default cache TTL in seconds for DNS responses */
export const CACHE_TTL = 60;

/** Maximum DNS message size for DoH (RFC 8484 recommends up to 4096 bytes) */
export const MAX_DNS_MESSAGE_SIZE = 4096;

/** Maximum DNS message size for UDP (traditional DNS) */
export const MAX_DNS_UDP_SIZE = 512;

/** DoH endpoint paths */
export const PATH_DNS_QUERY = "/dns-query";
export const PATH_DNS_JSON = "/dns-json";
export const PATH_RESOLVE = "/resolve";
export const PATH_HEALTH = "/health";
export const PATH_HELP = "/help";
export const PATH_ROOT = "/";

/** Content types */
export const CONTENT_TYPE_DNS_MESSAGE = "application/dns-message";
export const CONTENT_TYPE_DNS_JSON = "application/dns-json";
export const CONTENT_TYPE_JSON = "application/json";
export const CONTENT_TYPE_TEXT_PLAIN = "text/plain; charset=utf-8";

/** Query parameter names */
export const PARAM_DNS = "dns";
export const PARAM_NAME = "name";
export const PARAM_TYPE = "type";
export const PARAM_CT = "ct";


