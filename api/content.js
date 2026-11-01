import { getFile } from './_lib/github.js';

export default async function handler(req, res) {
  // Allow CORS for same-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fileData = await getFile('content/site-content.json');
    const content = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    );
    return res.status(200).json(content);
  } catch (err) {
    console.error('Failed to fetch content:', err.message);
    // Return 503 so client knows to use fallback
    return res.status(503).json({ error: err.message });
  }
}
