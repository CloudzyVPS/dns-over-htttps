import { getUpstreams, buildUpstreamUrl, DEFAULT_UPSTREAMS } from '../upstreams';

describe('upstreams', () => {
  it('returns default upstreams if no env.UPSTREAM', () => {
    expect(getUpstreams({})).toEqual(DEFAULT_UPSTREAMS);
  });

  it('returns custom upstream if env.UPSTREAM is set', () => {
    const env = { UPSTREAM: 'https://custom.example.com' };
    const result = getUpstreams(env);
    expect(result[0].base).toBe('https://custom.example.com');
    expect(result[0].provider).toBe('custom');
  });

  it('builds wire and json URLs correctly', () => {
    const up = DEFAULT_UPSTREAMS[0];
    expect(buildUpstreamUrl(up, 'wire').pathname).toBe(up.wirePath);
    expect(buildUpstreamUrl(up, 'json').pathname).toBe(up.jsonPath);
  });
});
