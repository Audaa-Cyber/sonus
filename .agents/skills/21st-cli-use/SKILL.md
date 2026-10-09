---
name: 21st-cli-use
description: Search, install and pull code from the 21st.dev catalog with the 21st CLI.
---

# 21st CLI — find, install and generate

Use the `21st` CLI (`npx @21st-dev/cli`) to search the 21st.dev catalog for React/shadcn components, themes and templates before hand-writing a component that might already exist. Adapt catalog code to the Sonus design system instead of importing a component's original styling wholesale.

## Authentication

- Interactive development: `npx @21st-dev/cli login` opens the browser and saves a local token.
- CI/scripts: use `--api-key "$API_KEY_21ST"` or set `API_KEY_21ST` / `TWENTYFIRST_TOKEN`.
- Never commit the token or API key.
- Check `21st whoami` and `21st usage` after login.

## Search first

```bash
21st search "particle orb voice interface" --limit 10
21st search "animated hero background" --limit 10
21st search "minimal editorial landing page" --limit 10
21st search "fine line animation" --limit 10
21st search dark --type theme --limit 10
``

Use `21st get <id>` to inspect code and `21st add <user>/<slug>` to install a component into the current project. Review its dependencies, accessibility, performance and license before adopting it.

## Design rules for Sonus

- Preserve the midnight / porcelain / sand / signal-blue palette.
- Keep layouts sparse and typography-led, with intentional negative space.
- Avoid generic glass cards, neon gradients, stock illustrations, and noisy dashboards.
- Prefer one strong custom particle orb and one continuous signal thread over many decorative effects.
- Support reduced motion and small screens.
- Never represent the orb as a working voice agent unless actual audio capture and speech understanding are implemented.
- Use the repository's typography tokens and CSS variables; don't let catalog defaults override the brand.

## Generate only when useful

Check `21st usage` first. Hosted AI generation requires the account to explicitly have generation enabled and may consume credits. If unavailable, search and adapt catalog code instead.
