import { requireAuth } from '../_lib/auth.js';
import { listDirectory, deleteFile, getFile } from '../_lib/github.js';

const IMAGES_DIR = 'client/public/images';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

async function listImagesRecursive(dir, prefix = '') {
  try {
    const items = await listDirectory(dir);
    const images = [];

    for (const item of items) {
      if (item.type === 'dir') {
        const subImages = await listImagesRecursive(item.path, `${item.name}/`);
        images.push(...subImages);
      } else if (item.type === 'file') {
        const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          const folder = dir.replace(IMAGES_DIR, '').replace(/^\//, '');
          const publicPath = folder
            ? `/images/${folder}/${item.name}`
            : `/images/${item.name}`;
          images.push({
            name: item.name,
            path: item.path,
            publicPath,
            size: item.size,
            sha: item.sha,
            url: item.download_url,
            folder: folder || '/',
          });
        }
      }
    }
    return images;
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const user = requireAuth(req, res);
  if (!user) return;

  // GET - List all images
  if (req.method === 'GET') {
    try {
      const images = await listImagesRecursive(IMAGES_DIR);
      return res.status(200).json({ images });
    } catch (err) {
      console.error('Error listing images:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE - Delete an image
  if (req.method === 'DELETE') {
    const { path: filePath, sha } = req.body || {};

    if (!filePath) {
      return res.status(400).json({ error: 'path is required' });
    }

    // Security: only allow deleting from the images directory
    if (!filePath.startsWith(IMAGES_DIR) && !filePath.startsWith('client/public/images')) {
      return res.status(403).json({ error: 'Can only delete files from the images directory' });
    }

    try {
      let fileSha = sha;
      if (!fileSha) {
        const fileData = await getFile(filePath);
        fileSha = fileData.sha;
      }

      const commitMsg = `[Admin] Delete image: ${filePath.split('/').pop()} - ${new Date().toISOString()}`;
      await deleteFile(filePath, commitMsg, fileSha);

      return res.status(200).json({ message: 'Image deleted successfully!' });
    } catch (err) {
      console.error('Error deleting image:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
