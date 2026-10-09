# 21st.dev CLI setup

The repository includes a project-local copy of the 21st CLI usage skill at `.agents/skills/21st-cli-use/SKILL.md`.

On the development machine, run:

```bash
npm i -g @21st-dev/cli
21st login
npx @21st-dev/cli install-skill
```

The login opens a browser and stores a local credential. This step must happen on the machine where you develop; do not commit the resulting token.

After login, start with catalog searches:

```bash
21st whoami
21st usage
21st search "particle orb voice interface" --limit 10
21st search "minimal animated landing page" --limit 10
```

For scripts/CI, set `API_KEY_21ST` as a secret and pass it using the CLI's `--api-key` flag. Never put the key in source code or a committed `.env` file.

The 21st CLI can install components into the current project, but the login and catalog retrieval have not been run from this session because no connected local terminal/browser is available.
