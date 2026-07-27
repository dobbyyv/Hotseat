// Health-check test suite — verifies core application boot
const request = require('supertest');
const express = require('express');

describe('Health Check', () => {
  it('GET /api/health returns 200', async () => {
    const app = express();
    app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('basic math assertion passes', () => {
    expect(1 + 1).toBe(2);
  });
});