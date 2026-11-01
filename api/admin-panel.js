import fs from 'node:fs';
import path from 'node:path';

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Study Hub Admin"');
  return res.status(401).send('Authentication required');
}

function safeEqual(a, b) {
  const left = Buffer.from(a || '');
  const right = Buffer.from(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

export default function handler(req, res) {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    return res.status(500).send('Missing ADMIN_USERNAME or ADMIN_PASSWORD');
  }

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return unauthorized(res);

  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  if (!safeEqual(username, adminUser) || !safeEqual(password, adminPassword)) {
    return unauthorized(res);
  }

  const filePath = path.join(process.cwd(), 'admin', 'panel.html');
  const html = fs.readFileSync(filePath, 'utf-8');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.status(200).send(html);
}
