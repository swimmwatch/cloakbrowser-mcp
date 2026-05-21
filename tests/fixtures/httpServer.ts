import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';

export interface FixtureServer {
  readonly url: string;
  close(): Promise<void>;
}

const HTML_HEAD = '<!doctype html><meta charset="utf-8">';

function html(body: string): string {
  return `${HTML_HEAD}${body}`;
}

const PAGES: Record<string, string> = {
  '/': html('<title>Fixture</title><h1>Fixture root</h1>'),
  '/form': html(
    '<title>Form</title><form id="f" method="post" action="/healthz">' +
      '<input id="user" name="user" type="text">' +
      '<input id="pass" name="pass" type="password">' +
      '<button id="submit" type="submit">Go</button>' +
      '</form>',
  ),
  '/buttons': html(
    '<title>Buttons</title>' +
      '<button id="primary">Primary</button>' +
      '<button id="secondary">Secondary</button>',
  ),
  '/select': html(
    '<title>Select</title>' +
      '<select id="role" name="role">' +
      '<option value="admin">Admin</option>' +
      '<option value="user">User</option>' +
      '<option value="guest">Guest</option>' +
      '</select>',
  ),
  '/console': html(
    '<title>Console</title><script>setTimeout(()=>console.error("hello from fixture"),50);</script><p>console page</p>',
  ),
  '/dialog': html(
    '<title>Dialog</title><script>setTimeout(()=>{try{confirm("go?")}catch(e){}},0);</script><p>dialog page</p>',
  ),
};

export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    if (pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }

    if (pathname === '/delayed') {
      const ms = Number(url.searchParams.get('ms') ?? '250');
      const wait = Number.isFinite(ms) && ms >= 0 && ms <= 5000 ? ms : 250;
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html(`<title>Delayed</title><p>delayed ${wait}ms</p>`));
      }, wait);
      return;
    }

    const page = PAGES[pathname];
    if (page) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page);
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
