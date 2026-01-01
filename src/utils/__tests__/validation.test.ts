import { validateBase64Url, validateDomainName, validateDnsType, validateBodySize } from '../validation';
import { MAX_DNS_MESSAGE_SIZE } from '../../config/constants';

describe('validateBase64Url', () => {
  it('accepts valid base64url strings', () => {
    expect(validateBase64Url('dGVzdA')).toBe(true);
    expect(validateBase64Url('dGVzdA-_')).toBe(true);
    expect(validateBase64Url('ABC123xyz-_')).toBe(true);
  });

  it('rejects invalid base64url strings', () => {
    expect(validateBase64Url('test+++')).toBe(false);
    expect(validateBase64Url('test///')).toBe(false);
    expect(validateBase64Url('test===')).toBe(false);
    expect(validateBase64Url('test space')).toBe(false);
    expect(validateBase64Url('')).toBe(false);
  });
});

describe('validateDomainName', () => {
  it('accepts valid domain names', () => {
    expect(validateDomainName('example.com')).toBe(true);
    expect(validateDomainName('sub.example.com')).toBe(true);
    expect(validateDomainName('example.co.uk')).toBe(true);
    expect(validateDomainName('a.b.c.example.com')).toBe(true);
  });

  it('rejects invalid domain names', () => {
    expect(validateDomainName('')).toBe(false);
    expect(validateDomainName('..example.com')).toBe(false);
    expect(validateDomainName('example..com')).toBe(false);
    expect(validateDomainName('.example.com')).toBe(false);
    expect(validateDomainName('example.com.')).toBe(false);
    expect(validateDomainName('a'.repeat(254))).toBe(false);
  });
});

describe('validateDnsType', () => {
  it('accepts valid numeric DNS types', () => {
    expect(validateDnsType('1')).toBe(true);
    expect(validateDnsType('28')).toBe(true);
    expect(validateDnsType('65535')).toBe(true);
  });

  it('accepts valid DNS type names', () => {
    expect(validateDnsType('A')).toBe(true);
    expect(validateDnsType('AAAA')).toBe(true);
    expect(validateDnsType('MX')).toBe(true);
    expect(validateDnsType('TXT')).toBe(true);
    expect(validateDnsType('a')).toBe(true);
  });

  it('rejects invalid DNS types', () => {
    expect(validateDnsType('')).toBe(false);
    expect(validateDnsType('0')).toBe(false);
    expect(validateDnsType('65536')).toBe(false);
    expect(validateDnsType('INVALID')).toBe(false);
  });
});

describe('validateBodySize', () => {
  it('accepts valid body sizes', () => {
    expect(validateBodySize(1)).toBe(true);
    expect(validateBodySize(512)).toBe(true);
    expect(validateBodySize(MAX_DNS_MESSAGE_SIZE)).toBe(true);
  });

  it('rejects invalid body sizes', () => {
    expect(validateBodySize(0)).toBe(false);
    expect(validateBodySize(-1)).toBe(false);
    expect(validateBodySize(MAX_DNS_MESSAGE_SIZE + 1)).toBe(false);
  });
});


