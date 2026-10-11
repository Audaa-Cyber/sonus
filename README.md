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
- Local saved-recipient address book with name-to-address matching for explicitly saved contacts.
- Browser-local transaction memory for payments submitted through Sonus, including the transaction hash and initial confirmation status.

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
- Saved recipient names can resolve to addresses explicitly saved in the current browser. This address book is local to that browser, is not synced, and does not verify real-world identity or address ownership. Unknown names still require a wallet address.
- The portfolio chart remains illustrative. Recent activity and the Activity page now show transaction records created by Sonus after a wallet returns a transaction hash; they are stored locally in this browser, not synced, and are not a complete wallet history/indexer. Only the Arc Testnet native-USDC send flow currently writes records.
- A fee estimate is a snapshot, not a guarantee. Balance checks can become stale and do not replace the wallet's final transaction review. Transaction status is polled from the connected wallet provider; if polling times out, check the explorer before retrying.
- This is a testnet implementation. Do not treat testnet assets as real funds or use this as production payment infrastructure.

## Local transaction memory

After the connected wallet returns a valid transaction hash for an Arc Testnet native-USDC payment, Sonus saves the sender, recipient, amount, network, hash, timestamp, and latest status observed by its initial receipt-polling loop. The Overview recent-activity panel and Activity page use these records rather than fabricated sample payments. Records are stored in browser `localStorage` under `sonus:transactions:v1`, capped at 100 entries, and are not uploaded or synced. This is not a full wallet indexer; transactions made elsewhere will not automatically appear. A `pending` status means the initial polling window did not find a receipt or polling was interrupted. The Activity page offers a manual receipt refresh through Sonus's read-only server-side Arc Testnet receipt endpoint, so a wallet does not need to remain connected just to check hashes already recorded locally. The endpoint reports point-in-time receipt state and observed confirmations; it is not a finality guarantee. Verify the latest state in Arcscan before retrying. Browser data can be cleared, and production payment memory should eventually use an authenticated, privacy-conscious persistent store with chain indexing and reorg-aware status reconciliation.

## Server-side Arc Testnet receipt lookup

`GET /api/transactions/receipt?hash=0x...` provides a read-only, server-side receipt snapshot for a valid 32-byte transaction hash. It checks the configured RPC chain ID before interpreting the receipt, reports a missing receipt as pending, distinguishes a successful mined receipt from a reverted one, and returns the observed block number and confirmation count. The endpoint accepts no sender, recipient, or transaction payload and cannot submit or sign transactions.

This is an initial reconciliation building block, not a persistent ledger or a guarantee of finality. A successful receipt can still be affected by a chain reorganization, and a missing receipt does not prove that a transaction was never broadcast. The endpoint is limited to Arc Testnet and depends on its public RPC availability. Always verify important states in Arcscan; do not automatically resend based only on a pending result.

## Searchable payment memory and notes

The Activity page can search locally recorded transactions by recipient address, sender address, amount, asset, network, transaction hash, or personal note, and filter by status. Each record has an optional 240-character note for the payment's purpose or context. Notes are stored only alongside that transaction in the same browser-local `sonus:transactions:v1` record. They are not sent to the chain, wallet, assistant API, or Sonus server. The notes are not synced across devices, and they are lost if the browser's local storage is cleared. The Activity page also provides a user-triggered JSON export of the local transaction records and notes. Sonus also recognizes a small set of payment-history questions in the chat and answers them directly from browser-local records; these queries bypass the assistant API. This is a limited local lookup, not an LLM reading the user's full wallet activity. The export contains wallet addresses and transaction hashes, so users should store the downloaded file carefully. Export does not upload data to Sonus. This feature searches only records Sonus has saved; it does not discover transactions made outside Sonus.


Manual cases to verify locally:
- Search by a recipient address, transaction hash, amount, and saved payment note; clear search and restore all records.
- Filter by confirmed, pending, submitted, and failed status; empty results should show a useful message.
- Add a payment note, reload the page, and confirm the note remains on the same transaction.
- Export JSON and confirm it contains the current local records and notes; no request should be sent to a server.
- Ask about recent payments or a saved payment note and verify the answer is based only on local Sonus records; the assistant API should not be called for these memory questions.
- Enable spending guardrails, set a per-payment limit below the draft amount, and verify Sonus blocks before opening the wallet confirmation; then test a daily cap against recorded same-sender transactions.
- Connect the intended wallet and verify Settings shows the recorded UTC-day total for that sender; failed records should not count toward the displayed total.
- Enable the saved-recipient rule and attempt a payment to an address absent from Contacts; verify Sonus blocks before wallet confirmation. Add the exact address and verify the rule permits proceeding to the normal preflight.
- Confirm the wallet-review dialog states whether amount limits and saved-recipient checks are enabled, before asking the wallet to approve.
- Submit a test payment and verify Activity preserves the policy snapshot from submission when its transaction status later updates.
- Enter an invalid limit and verify it is not persisted; simulate unavailable or malformed rule storage and verify the send flow fails closed.

## Saved recipient address book

The Overview workspace includes a small address book for EVM addresses. Contacts are stored in the current browser's `localStorage` under `sonus:contacts:v1`; they are not sent to Sonus servers or synced across devices. Payment requests can use an exact saved contact name, which is mapped locally to its stored address before the draft is shown. This is convenience-based name resolution only: it does not verify a person's identity or prove they control the address. Always confirm the full destination address before wallet approval. Do not use this local storage as a secure or shared contact database.

## Live market data

The workspace Market Watch panel reads from `GET /api/market`, a server-side adapter for CoinGecko's public simple-price endpoint. It displays USD prices and 24-hour percentage changes for BTC, ETH, SOL, and USDC, updates on a 60-second interval, and shows an unavailable state rather than silently substituting hard-coded prices when the provider fails.

The assistant endpoint can also append a live market snapshot when the detected intent is a market request. If CoinGecko is unavailable or rate-limits the request, Sonus reports that current prices could not be verified. Quotes are informational snapshots, not trading advice or executable swap quotes. Verify current values and fees with the relevant trading venue before taking action.

Provider availability, API terms, and rate limits can change. The current integration uses the public endpoint without a key; production should use an appropriate provider plan or a controlled caching/proxy strategy if usage grows.

## Transaction risk preflight

Before Sonus opens the wallet approval step for its Arc Testnet native-USDC send flow, it calls `POST /api/risk/preflight`. The endpoint reads request bodies with an 8 KB UTF-8 byte ceiling, rejects malformed EVM addresses, zero sender/recipient addresses, self-transfers, invalid/non-positive amounts, amounts above 1,000,000,000 USDC, and unsupported network/asset combinations. It also warns that testnet funds are not real funds and that an address format does not verify recipient identity.

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

## Local spending guardrails

The Settings page offers optional per-payment and daily recorded-spending limits for Arc Testnet native-USDC transfers, plus an option to block recipients not in the local saved-contacts address book. When enabled, Sonus checks these limits before opening the wallet confirmation flow. The daily total uses the UTC calendar day and counts non-failed records for the current sender that are present in the browser's capped local transaction history. Rules are saved under `sonus:spending-rules:v1` in local storage and are disabled by default. Open Sonus tabs listen for changes to that saved rule record and update their local policy state; removed or malformed rule data pauses sending until valid rules are saved. If rule storage is unavailable or contains an invalid saved configuration, Sonus pauses sending until storage is available and the settings can be saved. The Settings screen shows whether the saved rule configuration loaded successfully. When Sonus records a submitted payment, the local transaction entry also preserves a snapshot of which local policy checks were active at submission.

The saved-recipient check compares the exact destination address and does not verify the real-world identity behind a contact name. These are client-side convenience checks, not secure wallet permissions or a production policy engine. Local storage can be modified or cleared, the history is capped at 100 records, and activity from other apps or devices is not included. Do not rely on this feature as the only control for valuable assets. Wallet confirmation and independent transaction review remain required.

## Additional payment-control hardening

The wallet send handler now has an in-memory submission lock to reduce accidental duplicate prompts from rapid repeated clicks in one page instance. It is not a cross-tab or server-side idempotency guarantee; users must still check transaction status before retrying.

The risk preflight endpoint rejects malformed JSON, oversized requests, and non-object JSON payloads with client errors rather than dereferencing `null` or array input. It enforces the 8 KB body ceiling while streaming the request, rather than buffering an arbitrarily large body first. Amount validation matches the workspace's configured 1,000,000,000 USDC maximum and blocks the zero sender address. These are input-hardening measures, not a substitute for a transaction simulator, address reputation service, or server-enforced spending policy.

## Verification

GitHub Actions runs typecheck, lint, and production build checks. Check the workflow status on the Sonus branch and pull request before deploying.

Manual checks for the latest payment-control changes:
- Rapidly click Send twice and verify only one wallet approval attempt opens.
- While the review confirmation is open, switch the wallet account or network; Sonus should recheck immediately before submission and stop without sending.
- Send malformed preflight bodies (`null`, `[]`, invalid JSON, and oversized JSON) and verify they return a controlled 400/413 response rather than a server error.
- Test both guardrails independently: amount caps enabled with saved-recipient disabled, then saved-recipient enabled with amount caps disabled.
- Confirm policy status in Settings and verify the payment review dialog describes the active local rules.
- Change the spending rules in a second Sonus tab and verify the first tab updates; remove or corrupt the stored rule record and verify payment submission is paused.


## Automated risk preflight tests

Run `npm test` to execute the built-in Node test suite. The suite covers request parsing (malformed JSON, null, arrays, missing fields, oversized payloads), valid Arc Testnet review warnings, malformed/zero/self addresses, invalid amounts, and unsupported assets/networks/chain IDs. The deterministic rules live in `lib/risk-preflight.mjs` and are shared by the API route and tests, so the test suite exercises the same validation logic used by the endpoint. These tests do not simulate a real wallet, execute a transaction, or prove the transfer is safe.


## Server-side receipt reconciliation

`GET /api/transactions/receipt?hash=<transaction-hash>` accepts a 32-byte transaction hash and only queries the fixed Arc Testnet RPC. When a receipt exists, the server also checks its block hash against the block currently returned at that height, and reports `pending`, `confirmed`, `failed`, `reorged`, or an error when the RPC data cannot be verified. Responses are not cached. A successful receipt is an observation from one RPC provider, not a guarantee of irreversible finality. An unavailable or malformed canonical block is not treated as confirmed. This endpoint does not persist records, discover transactions, or replace checking Arcscan.


## Persistent transaction ledger foundation

A Supabase SQL migration is included at `supabase/migrations/20261011000000_transaction_ledger.sql`. It creates a per-user transaction table, a duplicate guard on `(user, chain, transaction hash)`, query indexes, an `updated_at` trigger, and row-level security. Authenticated users can read their own rows and insert only `submitted` records; they cannot update or delete ledger rows directly. It also creates an append-only receipt-observation table linked to each transaction and owner, so future reconciliation can preserve status changes (including reorganization observations) instead of overwriting history. Only the trusted server role can append those events or update ledger status.

**This is a schema foundation, not a live database integration.** Sonus does not yet initialize Supabase Auth or a database client, and the Activity UI still uses browser-local storage. Before enabling this ledger, create a Supabase project with Auth, apply the migration, configure server-only credentials, wire sign-in/session handling, and add a server route that verifies the signed-in user before inserting or reading rows. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. Do not accept a client-supplied `user_id` as proof of identity; derive it from the verified Supabase session. Do not grant browser users update permissions for reconciliation fields.


## AI assistant provider configuration

The assistant supports providers that implement OpenAI-compatible Chat Completions and JSON mode. Copy `.env.example` to `.env.local` and configure these server-only variables:

```env
SONUS_AI_API_KEY=your_provider_api_key
SONUS_AI_BASE_URL=https://api.openai.com/v1
SONUS_AI_MODEL=gpt-4.1-mini
```

For Clean APIs, use the API root and exact model ID shown in your provider dashboard. For example, if your account supports the model, set `SONUS_AI_BASE_URL=https://cleanapis.com/v1` and `SONUS_AI_MODEL=gemini-3.7-flash`. The existing `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` names remain supported as fallback aliases. Never use a `NEXT_PUBLIC_` prefix for an API key. Restart the development server after changing environment variables.

The route validates the assistant output and only prepares payment intent; it does not sign or execute transactions. Providers must support the OpenAI Chat Completions message format and JSON mode. A successful build does not prove that a particular model is enabled for the configured account.
