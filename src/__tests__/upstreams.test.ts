import { getUpstreams, DEFAULT_UPSTREAMS } from '../upstreams';

describe('upstreams', () => {
  it('returns default upstreams if no env.UPSTREAM', () => {
    expect(getUpstreams({})).toEqual(DEFAULT_UPSTREAMS);
  });

  it('returns custom upstream if env.UPSTREAM is set', () => {
    const env = { UPSTREAM: 'https://custom.example.com' };
    const result = getUpstreams(env);
    expect(result).toEqual(['https://custom.example.com']);
  });

  it('trims whitespace from custom upstream', () => {
    const env = { UPSTREAM: '  https://custom.example.com  ' };
    const result = getUpstreams(env);
    expect(result).toEqual(['https://custom.example.com']);
  });
});
