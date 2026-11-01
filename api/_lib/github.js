const GITHUB_API = 'https://api.github.com';

function getConfig() {
  const OWNER = process.env.GITHUB_OWNER;
  const REPO = process.env.GITHUB_REPO;
  const TOKEN = process.env.GITHUB_TOKEN;
  const BRANCH = process.env.GITHUB_BRANCH || 'main';
  if (!OWNER || !REPO || !TOKEN) {
    throw new Error('Missing GitHub configuration: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN are required');
  }
  return { OWNER, REPO, TOKEN, BRANCH };
}

export async function getFile(filePath) {
  const { OWNER, REPO, TOKEN, BRANCH } = getConfig();
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'StudyHubBD-Admin/1.0',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function updateFile(filePath, content, commitMessage, sha, options = {}) {
  const { OWNER, REPO, TOKEN, BRANCH } = getConfig();
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encodedContent = options.isBase64
    ? content
    : Buffer.from(content, 'utf-8').toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'StudyHubBD-Admin/1.0',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encodedContent,
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function createFile(filePath, content, commitMessage, options = {}) {
  const { OWNER, REPO, TOKEN, BRANCH } = getConfig();
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const encodedContent = options.isBase64
    ? content
    : Buffer.from(content, 'utf-8').toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'StudyHubBD-Admin/1.0',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encodedContent,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function deleteFile(filePath, commitMessage, sha) {
  const { OWNER, REPO, TOKEN, BRANCH } = getConfig();
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'StudyHubBD-Admin/1.0',
    },
    body: JSON.stringify({
      message: commitMessage,
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function listDirectory(dirPath) {
  const { OWNER, REPO, TOKEN, BRANCH } = getConfig();
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${dirPath}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'StudyHubBD-Admin/1.0',
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return res.json();
}
