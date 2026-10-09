# Sonus font assets

Place approved, licensed Sonus font files in this directory when available.

Recommended naming convention:
- `sonus-display.woff2` — primary display / wordmark style
- `sonus-text.woff2` — secondary body style
- `sonus-mono.woff2` — tertiary metadata / numbers style

Then define local `@font-face` declarations in `app/globals.css` and update the `--font-display`, `--font-body`, and `--font-meta` tokens. The repository currently uses provisional web-font fallbacks because the original font files were not present.
