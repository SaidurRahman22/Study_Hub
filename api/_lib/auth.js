import crypto from 'node:crypto';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function createToken(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expected) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('Token expired');
  return payload;
}

export function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function requireAuth(req, res) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    res.status(500).json({ error: 'Server misconfigured: JWT_SECRET missing' });
    return null;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return null;
  }
  try {
    return verifyToken(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: `Unauthorized: ${err.message}` });
    return null;
  }
}
