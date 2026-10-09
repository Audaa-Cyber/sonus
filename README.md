# Sonus

Sonus is a premium crypto payment-intelligence platform exploring a more human way to understand and authorize digital payments.

## Design direction

- Midnight canvas, warm sand, porcelain typography, restrained signal blue.
- Spacious editorial layout with intentional negative space.
- A particle-based voice orb, wind-shaped dune landscape, murmuration, and one continuous signal thread connecting the page.
- Typography roles: display, body, and mono labels. The original Sonus font asset is not present yet; replace the provisional type stack when the approved font files are available.

## 21st.dev setup

Install the 21st CLI and its agent skill in a local development environment:

```bash
npm i -g @21st-dev/cli
21st login
npx @21st-dev/cli install-skill
```

The login command opens a browser and saves a local token. Do not commit the token or an API key. For CI, use the `API_KEY_21ST` environment variable or pass `--api-key` to the CLI.

## Development

```bash
npm install
npm run dev
```
