---
description: Search engine indexing, sitemap submission, webmaster verification, and IndexNow setup for the CloakBrowser MCP documentation site.
icon: material/magnify
tags:
  - Project Internals
  - Documentation
---

# Search Engine Indexing

The documentation site is built with MkDocs Material and published to GitHub Pages. Search visibility depends on clear page content, crawlable HTML, accurate metadata, and search-engine discovery. No ranking position is guaranteed.

This project uses only free indexing and webmaster tooling. Do not connect paid SEO suites, paid indexing tools, advertising products, or third-party analytics for documentation search visibility.

## Built-In Signals

The site publishes the standard files and metadata that search engines expect:

- `robots.txt` allows crawling and points to the XML sitemap.
- `sitemap.xml` lists canonical documentation URLs.
- `llms.txt` gives AI/search crawlers a concise project summary and important documentation links.
- every page has a canonical URL, meta description, Open Graph metadata, Twitter card metadata, and JSON-LD structured data.
- the home page describes the project as a CloakBrowser MCP server, Playwright MCP bridge, Model Context Protocol browser automation tool, npm CLI package, and Docker image.

## Free Setup Checklist

Use the published documentation URL:

```text
https://swimmwatch.github.io/cloakbrowser-mcp/
```

Use the sitemap URL:

```text
https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml
```

Recommended free setup order:

1. Add Google Search Console.
2. Add Bing Webmaster Tools.
3. Add Yandex Webmaster if Yandex visibility matters.
4. Add Naver Search Advisor if Korea visibility matters.
5. Add Baidu Search Resource Platform only if China visibility matters and the free account flow is available to you.
6. Add `INDEXNOW_KEY` to notify IndexNow-compatible engines after documentation deployment.

Skip any product, prompt, or wizard that asks for payment, billing, ads, premium SEO reports, backlink purchases, sponsored placement, or paid indexing. None of those are required for this project.

## GitHub Settings

Webmaster verification tokens are rendered as public meta tags, so repository variables are preferred. Repository secrets also work if you prefer to keep the value out of normal settings screens.

Add verification variables here:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions -> Variables -> New repository variable
```

Add the IndexNow key here:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions -> Secrets -> New repository secret
```

After adding or changing verification variables, publish the documentation again so the new meta tags are deployed.

## Webmaster Verification Variables

Set these GitHub Actions variables or secrets when a search engine gives you a verification token:

| Search engine | Free setup URL | Variable or secret | Meta tag emitted |
| --- | --- | --- | --- |
| Google Search Console | `https://search.google.com/search-console` | `GOOGLE_SITE_VERIFICATION` | `google-site-verification` |
| Bing Webmaster Tools | `https://www.bing.com/webmasters` | `BING_SITE_VERIFICATION` | `msvalidate.01` |
| Yandex Webmaster | `https://webmaster.yandex.com/` | `YANDEX_SITE_VERIFICATION` | `yandex-verification` |
| Naver Search Advisor | `https://searchadvisor.naver.com/` | `NAVER_SITE_VERIFICATION` | `naver-site-verification` |
| Baidu Search Resource Platform | `https://ziyuan.baidu.com/` | `BAIDU_SITE_VERIFICATION` | `baidu-site-verification` |

Verification tokens are site-specific. They are not required for local builds and are omitted when unset.

## Search Engine Steps

### Google Search Console

1. Open `https://search.google.com/search-console`.
2. Add a URL-prefix property for `https://swimmwatch.github.io/cloakbrowser-mcp/`.
3. Select the HTML tag verification method.
4. Copy only the token from the `content="..."` value.
5. Add it as `GOOGLE_SITE_VERIFICATION`.
6. Redeploy the documentation.
7. Return to Google Search Console and click Verify.
8. Open Sitemaps and submit `https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml`.

Google Search Console is free. Do not enable Google Ads, paid campaigns, or paid SEO products for this setup.

### Bing Webmaster Tools

1. Open `https://www.bing.com/webmasters`.
2. Add the site `https://swimmwatch.github.io/cloakbrowser-mcp/`.
3. Either import from Google Search Console or choose HTML meta tag verification.
4. For meta tag verification, copy only the `msvalidate.01` token.
5. Add it as `BING_SITE_VERIFICATION`.
6. Redeploy the documentation.
7. Return to Bing Webmaster Tools and verify the site.
8. Submit `https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml`.

Bing Webmaster Tools is free and also helps discovery for search surfaces that use Bing results, including Yahoo and DuckDuckGo.

### Yandex Webmaster

1. Open `https://webmaster.yandex.com/`.
2. Add `https://swimmwatch.github.io/cloakbrowser-mcp/`.
3. Select meta tag verification.
4. Copy only the `yandex-verification` token.
5. Add it as `YANDEX_SITE_VERIFICATION`.
6. Redeploy the documentation.
7. Return to Yandex Webmaster and verify the site.
8. Submit `https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml`.

Yandex Webmaster is free. Yandex may also offer other ecosystem products; they are not required.

### Naver Search Advisor

1. Open `https://searchadvisor.naver.com/`.
2. Add `https://swimmwatch.github.io/cloakbrowser-mcp/`.
3. Select HTML meta tag verification.
4. Copy only the `naver-site-verification` token.
5. Add it as `NAVER_SITE_VERIFICATION`.
6. Redeploy the documentation.
7. Return to Naver Search Advisor and verify the site.
8. Submit `https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml` if the dashboard allows sitemap submission for the verified property.

Naver setup is optional unless Korean search visibility matters.

### Baidu Search Resource Platform

1. Open `https://ziyuan.baidu.com/`.
2. Add `https://swimmwatch.github.io/cloakbrowser-mcp/`.
3. Select meta tag verification if available.
4. Copy only the `baidu-site-verification` token.
5. Add it as `BAIDU_SITE_VERIFICATION`.
6. Redeploy the documentation.
7. Return to Baidu and verify the site.
8. Submit `https://swimmwatch.github.io/cloakbrowser-mcp/sitemap.xml` if the dashboard enables sitemap submission for the verified property.

Baidu setup is optional. It can require China-specific account requirements. Skip it if the account flow is blocked or asks for paid services.

## IndexNow

The docs release workflow can notify IndexNow-compatible search engines after GitHub Pages deployment. This helps Bing, Yandex, Naver, Seznam, Yep, and other participating engines discover changed documentation URLs faster.

To enable it:

1. Generate a random IndexNow key with 8 to 128 hexadecimal characters.
2. Add it to GitHub repository secrets as `INDEXNOW_KEY`.
3. Publish a documentation release.

When `INDEXNOW_KEY` is absent, the workflow skips IndexNow without failing.

You can generate a key locally without a paid service:

```bash
openssl rand -hex 32
```

The key file becomes public after deployment because IndexNow requires it to be reachable by search engines. Keeping it in GitHub Secrets still avoids accidental exposure in workflow configuration and logs before deployment.

## What Not To Use

Do not add these for this project unless there is a separate explicit decision later:

- paid SEO crawlers or rank trackers;
- paid indexing APIs or “instant indexing” SaaS;
- paid backlink tools, backlink marketplaces, or sponsored placement;
- Google Ads, Yandex Direct, Microsoft Advertising, or other ad products;
- Google Analytics, Yandex Metrica, or third-party analytics for ranking purposes.

The current setup uses static metadata, `robots.txt`, `sitemap.xml`, official free webmaster tools, and the open IndexNow protocol.

## Validation

Run the local SEO checks after building the documentation:

```bash
npm run docs:build
npm run docs:seo:validate
```

The validator checks the built site for metadata, canonical links, social images, JSON-LD, sitemap, and robots configuration.
