const defaultUserAgent = 'cloakbrowser-mcp-upstream-monitor';

export async function fetchJson(url, { githubToken, userAgent = defaultUserAgent } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json, application/json',
    'User-Agent': userAgent,
  };

  if (url.startsWith('https://api.github.com/') && githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchText(url, { userAgent = defaultUserAgent } = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain, application/xml, text/xml, */*',
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
