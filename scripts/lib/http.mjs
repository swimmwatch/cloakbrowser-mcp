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
  const fetchOptions = { headers };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const message = `Failed to fetch ${url}: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}
export async function fetchText(url, { userAgent = defaultUserAgent } = {}) {
  const fetchOptions2 = {
    headers: {
      Accept: 'text/plain, application/xml, text/xml, */*',
      'User-Agent': userAgent,
    },
  };
  const response = await fetch(url, fetchOptions2);
  if (!response.ok) {
    const message2 = `Failed to fetch ${url}: ${response.status} ${response.statusText}`;
    throw new Error(message2);
  }
  return response.text();
}
