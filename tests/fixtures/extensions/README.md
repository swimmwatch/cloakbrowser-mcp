# Controlled extension fixtures

`content/` is project-owned Manifest V3 test code. Its content script marks only
controlled loopback pages and requests no browser permissions. The existing
TypeScript dependency compiles its source into `content.js` in an owned temporary
directory; the source remains covered by typecheck and ESLint.

The official Playwright Extension is not vendored. The E2E helper fetches the
Playwright source at commit `e8149b8257d32dcf8f72573ecc43e72439da7080`, installs its
exact lockfile without lifecycle scripts, then runs its Vite extension build in
an owned temporary checkout. Its source includes Microsoft's Apache-2.0 LICENSE
and copyright notices; those remain in the checkout until cleanup. Manifest
version is 0.4.0 and the ID is derived from its public manifest key.

Source and installation-state recipe:
https://github.com/microsoft/playwright/blob/e8149b8257d32dcf8f72573ecc43e72439da7080/tests/extension/extension-fixtures.ts

No Web Store installation, personal profile, saved license, private relay adapter,
or extension source mutation is used. UI tokens are synthetic per temporary
profile, passed only via the existing process environment, and redacted from
persisted diagnostics. Screenshots of extension/token UI are prohibited.
