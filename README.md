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

## V1 payment workspace status

All work in this iteration is on `redesign/dark-signal-landing`. The `main` branch is not modified by these changes.

Implemented in the workspace:
- Browser EVM wallet connection and account/network change listeners.
- Arc Testnet network switch/add flow.
- Live native USDC balance read through `eth_getBalance` when a wallet is connected to Arc Testnet.
- Natural-language payment drafts with basic amount/token validation.
- Recipient-format warning: a 40-byte EVM address shape is not proof of identity or ownership.
- Native USDC fee estimate using `eth_estimateGas` and `eth_gasPrice` on Arc Testnet.
- Basic comparison of the draft amount plus estimated fee against the wallet's current native balance.
- Voice input through the browser's speech-recognition API where supported.

### Arc Testnet configuration

- Network: Arc Testnet
- Chain ID: `5042002` (`0x4cef52`)
- RPC: `https://rpc.testnet.arc.network`
- Native currency: USDC, 18 decimals
- Explorer: `https://testnet.arcscan.app`

The balance reader uses the connected wallet's RPC provider. It does not require an RPC API key.

### Current limitations

- A wallet-approved native USDC transfer can be submitted on Arc Testnet after an in-page review and the wallet's own confirmation. Sonus does not receive or store private keys. This path is testnet-only.
- Fee estimation and submission are currently limited to native USDC transfers on Arc Testnet.
- Recipient names are not resolved. Users must supply a wallet address; an address-format match does not verify who controls it.
- The dashboard's portfolio chart and activity examples are illustrative, not live. The Market Watch panel uses a separate live market-data endpoint when the provider is available.
- A fee estimate is a snapshot, not a guarantee. Balance checks can become stale and do not replace the wallet's final transaction review. Transaction status is polled from the connected wallet provider; if polling times out, check the explorer before retrying.
- This is a testnet implementation. Do not treat testnet assets as real funds or use this as production payment infrastructure.

## Live market data

The workspace Market Watch panel reads from `GET /api/market`, a server-side adapter for CoinGecko's public simple-price endpoint. It displays USD prices and 24-hour percentage changes for BTC, ETH, SOL, and USDC, updates on a 60-second interval, and shows an unavailable state rather than silently substituting hard-coded prices when the provider fails.

The assistant endpoint can also append a live market snapshot when the detected intent is a market request. If CoinGecko is unavailable or rate-limits the request, Sonus reports that current prices could not be verified. Quotes are informational snapshots, not trading advice or executable swap quotes. Verify current values and fees with the relevant trading venue before taking action.

Provider availability, API terms, and rate limits can change. The current integration uses the public endpoint without a key; production should use an appropriate provider plan or a controlled caching/proxy strategy if usage grows.

## Transaction risk preflight

Before Sonus opens the wallet approval step for its Arc Testnet native-USDC send flow, it calls `POST /api/risk/preflight`. The endpoint blocks malformed EVM addresses, the zero address, self-transfers, invalid/non-positive amounts, and unsupported network/asset combinations. It also warns that testnet funds are not real funds and that an address format does not verify recipient identity.

This is a **deterministic parameter check only**, not a security scanner. It does not query phishing lists, inspect token contracts, simulate execution, verify recipient ownership, or guarantee safety. The endpoint returns `securityProviderConnected: false` to make that limitation explicit. The send flow fails closed if the endpoint is unavailable, and the wallet still presents the final transaction for user authorization.

Manual cases to verify locally:
- Valid non-zero recipient, positive USDC amount, Arc Testnet chain ID `5042002`: review warnings returned; wallet confirmation remains required.
- Zero recipient, self-transfer, malformed address, zero/negative/over-precision amount, wrong chain or unsupported asset: blocked; no transaction submitted.
- Preflight endpoint returns an error: send stops before wallet authorization.
- User rejects the final wallet request: no transaction should be reported as sent.

## Swap provider decision

Sonus's preference is an Arc/Circle first-party swap path, and it will not silently fall back to 0x or LI.FI.

- `GET /api/swap/capabilities` reports the provider investigation and readiness boundary without fabricating a quote.
- Current public Arc App Kit documentation demonstrates bridging USDC between supported networks. We have not verified a supported public same-chain swap API in those docs.
- Arc Portal's official FAQ says swap token availability is sourced by LI.FI. That means the Portal's routing should not be represented as a Circle-owned swap provider.
- Therefore, live quotes and execution remain disabled until an official Arc/Circle first-party swap API, supported networks/tokens, and a compatible user-authorization model are verified.
- Sonus must not ask users to paste private keys or quietly use a Sonus-controlled wallet to trade on their behalf.

Official references: Arc App Kit bridge quickstart at `https://docs.arc.network/app-kit/quickstarts/bridge-tokens-across-blockchains`; Arc Portal FAQ at `https://help.arc.io/support_arc/en/arc-portal-faqs?id=arc_article_view&sysparm_article=KB0011405`.

## AI assistant API

The workspace chat now calls a server-side `POST /api/assistant` route. When configured, it uses the OpenAI Responses API with a strict JSON schema so the UI receives a bounded reply and a typed intent draft. The model cannot sign transactions or call wallet methods; wallet signing remains in the browser and requires the wallet's own confirmation.

### Configure locally

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` to your own key. Optionally set `OPENAI_MODEL`; the default is `gpt-4.1-mini`.
3. Restart the dev server after changing environment variables.

The key is read only by the server route. Do not add it to client-side code, commit `.env.local`, or paste it into chat. Without a key, the endpoint uses a clearly marked limited local fallback so the workspace still works. This fallback is not an LLM.

### Current AI limits

- The model produces intent drafts and explanatory text only. It cannot send a transaction, resolve a name to a verified identity, fetch live balances, or claim a quote/simulation was performed.
- Structured output is validated server-side before being returned to the UI.
- The route limits request/message size and history length, applies a 25-second upstream timeout, and includes a basic in-memory limit of 30 requests per IP per minute. This limit is process-local and can reset or differ across serverless instances; it is not production-grade protection. Production still needs durable per-user/IP rate limiting, usage budgets, authentication, request monitoring, and abuse protection.
- Do not treat model interpretation as authorization. The UI and wallet must continue to validate the exact transaction independently.

## Verification

GitHub Actions runs typecheck, lint, and production build checks. Check the workflow status on the Sonus branch and pull request before deploying.
