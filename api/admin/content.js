import { requireAuth } from '../_lib/auth.js';
import { getFile, updateFile } from '../_lib/github.js';

const CONTENT_PATH = 'content/site-content.json';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // GET - Read current content
  if (req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
      const fileData = await getFile(CONTENT_PATH);
      const content = JSON.parse(
        Buffer.from(fileData.content, 'base64').toString('utf-8')
      );
      return res.status(200).json({
        content,
        sha: fileData.sha,
      });
    } catch (err) {
      console.error('Error reading content:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Update content
  if (req.method === 'PUT') {
    const user = requireAuth(req, res);
    if (!user) return;

    const { content, sha, message } = req.body || {};

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    if (!sha) {
      return res.status(400).json({ error: 'SHA is required for update' });
    }

    try {
      const contentStr = JSON.stringify(content, null, 2);
      const commitMsg = message || `[Admin] Update site content - ${new Date().toISOString()}`;
      const result = await updateFile(CONTENT_PATH, contentStr, commitMsg, sha);
      return res.status(200).json({
        message: 'Content updated successfully! Website will update shortly.',
        commit: result.commit?.sha,
        newSha: result.content?.sha,
      });
    } catch (err) {
      console.error('Error updating content:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
