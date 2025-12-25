/**
 * Input validation functions for DoH requests
 */

import { MAX_DNS_MESSAGE_SIZE } from "./constants";

/**
 * Validates if a string is valid base64url encoding (RFC 4648 Section 5)
 * Base64url uses - instead of + and _ instead of /, and omits padding
 */
export function validateBase64Url(str: string): boolean {
  if (!str || str.length === 0) return false;
  // Base64url pattern: A-Za-z0-9_- (no padding =)
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  return base64urlPattern.test(str);
}

/**
 * Validates if a string is a valid domain name
 * Basic validation - allows most common domain name formats
 */
export function validateDomainName(domain: string): boolean {
  if (!domain || domain.length === 0) return false;
  if (domain.length > 253) return false; // RFC 1035 max length
  
  // Basic domain name pattern: allows letters, numbers, dots, hyphens
  // More permissive than strict RFC, but catches obvious errors
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/;
  return domainPattern.test(domain);
}

/**
 * Validates DNS record type (common types)
 * Returns true if type is a valid DNS record type number or common name
 */
export function validateDnsType(type: string): boolean {
  if (!type) return false;
  
  // Check if it's a number (1-65535)
  const numType = parseInt(type, 10);
  if (!isNaN(numType) && numType >= 1 && numType <= 65535) {
    return true;
  }
  
  // Check common DNS type names (case-insensitive)
  const validTypes = [
    'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV',
    'CAA', 'DNSKEY', 'DS', 'NAPTR', 'SSHFP', 'TLSA'
  ];
  return validTypes.includes(type.toUpperCase());
}

/**
 * Validates request body size
 * @param size Size in bytes
 * @returns true if size is within limits
 */
export function validateBodySize(size: number): boolean {
  return size > 0 && size <= MAX_DNS_MESSAGE_SIZE;
}

