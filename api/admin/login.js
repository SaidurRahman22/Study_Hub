import { createToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({
      error: 'Server misconfigured: ADMIN_PASSWORD and JWT_SECRET environment variables are required.',
    });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(password);
  const expected = Buffer.from(ADMIN_PASSWORD);
  let match = provided.length === expected.length;
  if (match) {
    let diff = 0;
    for (let i = 0; i < provided.length; i++) {
      diff |= provided[i] ^ expected[i];
    }
    match = diff === 0;
  }

  if (!match) {
    // Add a small delay to further prevent brute force
    await new Promise((r) => setTimeout(r, 500));
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createToken(
    {
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
    },
    JWT_SECRET
  );

  return res.status(200).json({ token, message: 'Login successful' });
}
