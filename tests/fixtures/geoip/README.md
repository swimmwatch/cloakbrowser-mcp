# Controlled GeoIP fixtures

`GeoIP2-City-Test.mmdb` is synthetic MaxMind test data, not a production database.
Source: https://github.com/maxmind/MaxMind-DB/blob/6a690a705bc6962c0025a32e94a8f0dc8f86418c/test-data/GeoIP2-City-Test.mmdb
Git blob: `e20846ac1757a3745ae41411757ed3817536e3be`; size: 22,569 bytes.
The E2E suite verifies the blob identity and actual `mmdb-lib` lookup for
`81.2.69.160` (GB, Europe/London). Retain the upstream `LICENSE-MIT` notice.
Tests copy the database to a fresh temporary cache, with a fresh mtime.

`echo-cert.pem` and `echo-key.pem` are public, test-only TLS credentials generated
for the three dependency echo authorities. They must never protect a real service.
Only the isolated bridge child trusts this certificate via `NODE_EXTRA_CA_CERTS`.
The proxy routes those authorities exclusively to its local ephemeral TLS server.
No public echo, proxy, or GeoIP database service is contacted by the scenarios.

The missing-database scenario uses a temporary Node preload to reject only the
known database download URL. It is offline failure injection, not successful
network downloading. Other cases use real local CONNECT, TLS and MMDB reads.
Browser navigation and in-page fetch prove routing; Playwright request APIs retain
the documented browser-flag proxy limitation.
