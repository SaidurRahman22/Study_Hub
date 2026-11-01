import { requireAuth } from '../_lib/auth.js';
import { createFile, updateFile, getFile } from '../_lib/github.js';

const IMAGES_DIR = 'client/public/images';
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_MB = 5;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { filename, mimeType, data, folder } = req.body || {};

  if (!filename || !mimeType || !data) {
    return res.status(400).json({ error: 'filename, mimeType, and data (base64) are required' });
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` });
  }

  // Sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const subfolder = folder ? folder.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const filePath = subfolder
    ? `${IMAGES_DIR}/${subfolder}/${safeName}`
    : `${IMAGES_DIR}/${safeName}`;

  // Check file size from base64
  const base64Data = data.includes(',') ? data.split(',')[1] : data;
  const sizeBytes = (base64Data.length * 3) / 4;
  if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    return res.status(400).json({ error: `File too large. Max ${MAX_SIZE_MB}MB allowed.` });
  }

  try {
    // Check if file exists (for update)
    let sha;
    try {
      const existing = await getFile(filePath);
      sha = existing.sha;
    } catch {
      sha = null;
    }

    const commitMsg = `[Admin] Upload image: ${safeName} - ${new Date().toISOString()}`;

    if (sha) {
      await updateFile(filePath, base64Data, commitMsg, sha, { isBase64: true });
    } else {
      await createFile(filePath, base64Data, commitMsg, { isBase64: true });
    }

    // Public path as served by the website
    const publicPath = subfolder
      ? `/images/${subfolder}/${safeName}`
      : `/images/${safeName}`;

    return res.status(200).json({
      message: 'Image uploaded successfully!',
      path: publicPath,
      filename: safeName,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
