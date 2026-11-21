# Public product website

`/about` is the public, single-page Mind Palace website. `/` remains the usable
application and its existing authentication flow. The sign-in screen links to
the website, and every Open Mind Palace link returns to the app.

The website covers capture, text and meaning search, Books, Tags, Collections,
Ask My Mind with citations, AI consent, export, and deletion controls. It does
not advertise deferred mobile, image, offline, or social features as available.
Pricing and testimonials are intentionally absent until real details exist.

## Product imagery

The five JPEGs in `public/product/` show the actual local UI with synthetic
fixtures from `scripts/product-screenshots.mjs`. They are public marketing
assets, not test evidence or private account screenshots. Captions identify
their sample content. Regenerate against a local frontend with:

```bash
node scripts/product-screenshots.mjs
```

`MIND_PALACE_PREVIEW_URL` can point to another local port. The script mocks auth,
backend data, and the sample Ask answer; it requires no provider key and writes
no thoughts to the database. Browser layout checks should use temporary output
paths, not additional screenshots committed to this directory.

The page uses the existing Instrument Serif/Geist identity. Its semantic color
tokens are namespaced in `tokens.css`; its CSS module does not retheme private
app routes. The tour supports arrow/Home/End keys, and the native FAQ disclosures
work without JavaScript. The public page makes no authenticated API calls.
