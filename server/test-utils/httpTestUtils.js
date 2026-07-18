import http from 'node:http';
import { once } from 'node:events';

export async function withServer(app, fn) {
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const { port } = server.address();
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

export async function closeServer(server) {
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
}

export async function rawRequest(url, options = {}) {
  const target = new URL(url);
  const body = options.body ?? null;
  const headers = {
    connection: 'close',
    ...(options.headers || {})
  };

  if (body !== null && !hasHeader(headers, 'content-length')) {
    headers['content-length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: options.method || 'GET',
        headers,
        agent: false
      },
      response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const textBody = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: response.statusCode,
            headers: {
              get(name) {
                return response.headers[name.toLowerCase()] ?? null;
              }
            },
            text: async () => textBody,
            json: async () => JSON.parse(textBody)
          });
        });
      }
    );

    request.on('error', reject);
    if (body !== null) request.write(body);
    request.end();
  });
}

export async function jsonRequest(url, options = {}) {
  const response = await rawRequest(url, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

function hasHeader(headers, name) {
  return Object.keys(headers).some(header => header.toLowerCase() === name.toLowerCase());
}