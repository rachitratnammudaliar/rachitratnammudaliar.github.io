# rachitratnammudaliar.github.io

Personal site of **Rachit Ratnam Mudaliar**, Software Systems student at Kauno Kolegija, Kaunas.

Hand-written HTML, CSS and JavaScript. No framework, no build step, no trackers, no third-party requests.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole page, plus SEO tags and schema.org data |
| `assets/css/site.css` | All styles. Colours are tokens at the top |
| `assets/js/theme.js` | Applies the saved light/dark theme before paint |
| `assets/js/site.js` | Theme switch, copy email, clock, sticky card, Inspect mode |
| `rachit-ratnam-mudaliar.vcf` | The "Save contact" card. Keep it in sync with the links |
| `assets/img/qr-site.svg` | QR code to this page, shown on big screens and in print |
| `assets/img/` | Photo, share card, app icons |
| `assets/fonts/` | Self-hosted Inter Display and Lora (OFL) |
| `404.html` | Not-found page |
| `sitemap.xml`, `robots.txt` | For search engines |

## Common edits

**Add a journey step.** In `index.html`, copy one `<li>` in `<ol class="journey">`. The last step has `class="journey__now"`; move that class to the newest step.

**Update courses.** Edit the `<ul class="tags">` list in the Education section.

**Change a profile link.** Update it in **two** places in `index.html`:
1. the `<ul class="links">` list in the profile card, and
2. `"sameAs"` in the `application/ld+json` block in `<head>`.

Search engines use `sameAs` to connect your profiles to you, so they must match.

**After any content change**, update `<lastmod>` in `sitemap.xml` and `"dateModified"` in the schema.

## Security

GitHub Pages can't set HTTP headers, so the Content-Security-Policy is a `<meta>` tag. It allows resources from this site only and blocks inline scripts and styles. If you add an external script, image or font, you must add its host to the policy, or it will be blocked. Check the browser console after changes.

## Moving to a custom domain

1. Add a `CNAME` file with the domain (for example `rachitratnammudaliar.com`).
2. Set the domain under **Settings → Pages** and tick **Enforce HTTPS**.
3. Replace `https://rachitratnammudaliar.github.io` everywhere (canonical, og:url, og:image, schema `@id`s, sitemap, robots).
4. Update the website field on LinkedIn, GitHub, YouTube and Blogger.

## Test

- Rich Results Test: https://search.google.com/test/rich-results
- Share preview: https://www.linkedin.com/post-inspector/
- Speed and accessibility: Chrome DevTools → Lighthouse
