import { helpResponse } from '../help';

describe('help', () => {
  it('helpResponse returns text', async () => {
    const resp = helpResponse();
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toMatch(/text\/plain/);
  });

  it('helpResponse contains expected content', async () => {
    const resp = helpResponse();
    const text = await resp.text();
    
    // Check for key sections
    expect(text).toContain('DNS-over-HTTPS');
    expect(text).toContain('Wire-format POST');
    expect(text).toContain('Wire-format GET');
    expect(text).toContain('JSON API GET');
    expect(text).toContain('Health Check');
    expect(text).toContain('FEATURES');
    expect(text).toContain('UPSTREAM PROVIDERS');
    expect(text).toContain('ERROR RESPONSES');
    expect(text).toContain('CORS SUPPORT');
    expect(text).toContain('VALIDATION');
    expect(text).toContain('EXAMPLES');
    
    // Check for endpoints
    expect(text).toContain('/dns-query');
    expect(text).toContain('/dns-json');
    expect(text).toContain('/resolve');
    expect(text).toContain('/health');
    
    // Check for technical details
    expect(text).toContain('4096 bytes');
    expect(text).toContain('60 seconds');
    expect(text).toContain('Cloudflare');
    expect(text).toContain('Google');
    expect(text).toContain('Quad9');
  });
});

