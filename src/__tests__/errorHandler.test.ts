import { badRequest, internalError, notFound, healthResponse, helpResponse } from '../errorHandler';

test('badRequest returns 400', () => {
  const resp = badRequest('fail');
  expect(resp.status).toBe(400);
});

test('internalError returns 500', () => {
  const resp = internalError('fail');
  expect(resp.status).toBe(500);
});

test('notFound returns 404', () => {
  const resp = notFound();
  expect(resp.status).toBe(404);
});

test('healthResponse returns ok json', async () => {
  const resp = healthResponse();
  expect(resp.status).toBe(200);
  const json = await resp.json();
  expect(json.ok).toBe(true);
});

test('helpResponse returns text', async () => {
  const resp = helpResponse();
  expect(resp.status).toBe(200);
  expect(resp.headers.get('content-type')).toMatch(/text\/plain/);
});
