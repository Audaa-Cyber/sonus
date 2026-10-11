# Sonus — HeyElsa Feature Parity & Integration Plan

Status: implementation plan, not a claim that these features already work.
Target branch: `redesign/dark-signal-landing`. Do not modify `main`.

## Product objective

Build Sonus toward feature parity with the publicly documented HeyElsa experience while keeping Sonus's product focus: payment intent, recipient context, payment memory, permissions, risk, and safe execution.

Parity means working, tested end-to-end capability—not a navigation item, mock price, static response, or demo card.

## Current baseline

The current app has a Next.js workspace, browser speech input, basic regex-based payment parsing, browser EVM wallet connection, Arc Testnet switching, native USDC balance reads, a gas estimate and preflight for Arc Testnet native USDC, wallet-mediated transaction submission, and transaction receipt polling. The send flow has not yet been independently smoke-tested in a browser. Prices, portfolio charts, and activity examples are illustrative. The chat does not yet call a live LLM.

Current limitations:
- No production AI/tool orchestration.
- No recipient/name resolution or verified contact book.
- No payment memory or configurable policy engine.
- No dedicated transaction simulation or comprehensive risk engine.
- No live multi-chain portfolio, market/news, swaps, bridge execution, staking/yield, limit orders, perpetuals, token creation, or developer SDK/API.
- Arc Testnet native USDC support does not imply that third-party data, swap, bridge, or yield providers support Arc Testnet.

## Feature-by-feature maturity targets

Each feature needs a provider adapter, server-side validation, loading/error/empty states, observability, automated tests, and clear status labels. Never represent a mock as live data.

### 1. AI chat and tool orchestration
- Replace hard-coded `buildReply` with a server-side LLM using schema-constrained outputs and tool/function calling.
- Define typed tools for read-only queries and separate tools for transaction preparation/execution.
- The model may propose a tool call; deterministic code validates all parameters and permissions.
- Ask follow-up questions for ambiguous amount, asset, recipient, chain, or action.
- Keep a trace of tool calls and results; never invent balances, prices, or transaction status.
- Add rate limits, abuse controls, prompt-injection boundaries, timeouts, retries, and evaluation tests.

### 2. Voice
- Move from browser-only speech recognition to a provider abstraction for speech-to-text and optional text-to-speech.
- Keep typed chat as a fallback. Voice must produce the same structured intent as text.
- Read back critical transaction details and require explicit approval; never execute a payment from an unconfirmed transcript.
- Provide language selection and microphone permission/error states.

### 3. Wallets and account abstraction
- Keep external wallets as the default initial path; add a wallet connector layer rather than coupling UI to one provider.
- Add EVM wallet connection/network switching and a separate Solana adapter if Solana support is added.
- Never collect or store a user's seed phrase or private key.
- If embedded wallets are added, use a reputable wallet infrastructure provider and document custody, recovery, and key management clearly.
- Re-check account, chain, balance, quote expiry, and transaction details immediately before execution.

### 4. Multi-chain portfolio and history
- Build a normalized portfolio service for native assets, fungible tokens, NFTs if in scope, transactions, DeFi positions, staking, and P&L.
- Show data source, last-updated time, partial chain failures, and unsupported chains.
- Cache safely and avoid treating token-reported prices as guaranteed realizable value.
- Keep a direct RPC fallback for supported chains; portfolio aggregators will not support every testnet.

### 5. Payments and recipient intelligence
- Use a structured payment intent with amount, token, chain, destination, purpose, source, expiry, and authorization state.
- Resolve supported name systems (for example ENS for EVM names; Solana naming needs a separate resolver) but label resolution as address mapping, not proof of a person's identity.
- Add a user-approved address book with recipient aliases, verification method, and change alerts.
- Check chain/token compatibility, checksum/format, zero/self-transfer, amount precision, balance, fee, and simulation result.
- Show the exact destination, chain, asset contract/native asset, amount, fee range, and relevant warnings before wallet authorization.
- Handle rejected, replaced, dropped, reverted, pending, confirmed, and receipt-timeout states without encouraging duplicate sends.

### 6. Swaps — Circle App Kit selected
- Use Circle's App Kit Swap integration as the intended provider. Do not silently fall back to 0x or LI.FI.
- Circle's current App Kit documentation describes Swap as server-side only today. It requires a server-side wallet adapter and a Circle API/Kit key; the current Sonus browser-wallet flow is not yet compatible with swap execution.
- Arc Testnet swap coverage is limited to USDC, EURC, and cirBTC, and testnet liquidity can be thin. Check the current Circle supported-chain/token matrix before exposing any pair.
- Before enabling execution, solve the wallet model transparently without asking users to submit private keys or using a Sonus-owned wallet to trade on a user's behalf without explicit disclosure and consent.
- Add quote preview with estimated output, minimum received, fees, gas, approval requirements, quote expiry, and slippage controls. Never fabricate an estimate when Circle cannot return one.
- Keep quote and execution separate; require explicit human approval of the exact transaction and test provider failure, unsupported pairs, quote expiry, and receipt recovery.

### 7. Bridges and cross-chain swaps
- Use a cross-chain routing provider with explicit source/destination chain and token support.
- Show source amount, estimated destination amount, bridge/provider, fees, minimum received, route duration, and failure/refund conditions.
- Treat source-chain submission and destination-chain completion as separate states.
- Add route timeout handling, status polling, and recovery/support links. Never imply that a bridge is atomic.

### 8. Staking and yield
- Initially provide read-only opportunity discovery and comparisons; execution is a later stage.
- Show APY/APR source and timestamp, lockup/unbonding period, withdrawal conditions, protocol/contract risk, liquidity, and reward-token volatility.
- Do not rank by APY alone. Do not promise returns.
- Execution must use vetted protocol integrations and explicit approval. Automated allocation requires a separate permission and spending-policy design.

### 9. Market and token intelligence
- Use live token search, price, liquidity/volume, historical data, and news sources.
- Display provider and timestamp; handle stale/missing data.
- Distinguish market facts from LLM-generated explanations.
- Add trending-token and meme-token discovery only with token safety checks and clear manipulation/scam warnings.

### 10. Security and transaction simulation
- Combine address/token/approval/phishing intelligence with transaction simulation where supported.
- Return evidence-based findings, confidence, provider, and timestamp. Treat missing results as unknown, not safe.
- Provide a risk summary before authorization and block only according to explicit policy; let users understand the reason.
- Never market a third-party scanner as a guarantee that an asset or transaction is safe.

### 11. Limit orders and automation
- Persist order intent, trigger, expiry, chain, token pair, max slippage, and cancellation state.
- Use a supported execution venue/provider. Add server-side monitoring, retries, alerting, idempotency, and cancellation.
- Keep user permissions narrow; define whether execution is user-signed per action, delegated, or smart-account-based.
- Do not store user private keys to enable automation.

### 12. Perpetuals and advanced trading
- Separate from spot swaps because leverage/liquidation risk is materially different.
- If included, use supported exchange/protocol APIs and show collateral, leverage, liquidation price, funding, fees, stop-loss/take-profit, and position status.
- Require explicit opt-in and risk acknowledgement. Do not launch until order-state recovery and risk controls are tested.

### 13. Education and personalization
- Build an educational answer mode grounded in curated sources and live product data where appropriate.
- Payment memory should store only useful, user-visible, editable context such as approved recipient aliases, preferences, and purpose history.
- Do not infer a verified real-world identity from an ENS/SNS name or transaction history.
- Give users controls to inspect, correct, export, and delete memory.

### 14. Rules, groups, and shared payments
- Add user-defined limits, allowlists, approval thresholds, recurring schedules, and per-action consent.
- Groups need participant invitations, payment requests, amount allocation, status tracking, and dispute/error handling.
- Rules must be evaluated by deterministic backend code, not only by the LLM.

### 15. Developer API / SDK
- Expose a versioned server API for intent parsing, recipient resolution, risk reports, payment preparation, quotes, and transaction status.
- Do not expose provider secrets to the browser.
- Publish typed SDKs only after API schemas and error semantics stabilize.
- Add authentication, quotas, idempotency, audit logs, API versioning, and developer docs.

## External services and APIs

Treat these as candidate integrations to evaluate, not commitments. Pricing, free tiers, geographic availability, chain coverage, and terms must be checked before selection. Keep adapters replaceable.

| Capability | Candidate service(s) | What it provides | Key caveat |
|---|---|---|---|
| LLM, structured intent, tool calling | OpenAI Responses API; alternatively Anthropic or Google models | Natural-language understanding, structured JSON, tool calls | Server-side secret; validate every output in deterministic code |
| Speech-to-text / text-to-speech | Deepgram, OpenAI audio APIs, or browser speech fallback | Better voice UX, transcription and optional spoken responses | Cost, language coverage, latency, and recording consent |
| EVM wallet connectivity | wagmi + viem; Reown AppKit or RainbowKit for connection UI | Wallet discovery, chain switching, typed EVM calls | Wallet UI library does not provide portfolio or transaction safety by itself |
| RPC / node access | Arc's official RPC for Arc Testnet; Alchemy, QuickNode, or another provider for supported production chains | Reads, simulation support where available, broadcast/receipts | Chain coverage differs; Arc Testnet support must be verified separately |
| Portfolio and token balances | Alchemy Portfolio APIs; compare with other multi-chain indexers | Token balances, metadata, transactions across supported chains | Partial failures and chain gaps; API key required for production usage |
| Market prices and metadata | CoinGecko API; optionally DefiLlama for protocol/yield context | Prices, token metadata, market data | Rate limits, attribution/terms, token mapping quality |
| EVM swaps | Circle App Kit Swap | Same-chain swap routing and transaction workflow on supported chains | Server-side wallet adapter required today; Arc Testnet pair/liquidity support is limited; current external browser-wallet flow cannot execute through it yet |
| Cross-chain routes / bridges | Circle CCTP / App Kit Bridge | Native USDC cross-chain transfer via Circle infrastructure | Supported chains, transfer mode, destination completion, and fees must be checked |
| EVM transaction simulation | Tenderly Simulation API; also evaluate GoPlus simulation/security APIs | Dry-run execution and decoded effects where supported | Verify Arc Testnet support and coverage before depending on it |
| Token/address/approval security | GoPlus Security APIs; consider Blockaid or another commercial scanner | Token, address, approval, phishing and transaction-risk signals | Not a safety guarantee; coverage differs by chain |
| EVM name resolution | ENS libraries/contracts; viem/wagmi integrations | ENS name-to-address and reverse resolution | ENS is not universal identity verification; other namespaces need adapters |
| Solana names / transactions | Solana RPC plus a selected Solana naming/transaction provider | Solana address resolution and chain-specific actions | Separate chain adapter; not covered by EVM-only services |
| Yield discovery | DefiLlama Yields API and/or vetted protocol-specific APIs | Opportunity metadata and APY estimates | Yield data does not itself execute or validate a strategy |
| Staking | Protocol-specific integrations for each supported chain/protocol | Stake, unstake, rewards, position data | Unbonding periods, validator/protocol risks, and chain-specific transactions |
| Limit orders / perpetuals | A specific venue/protocol API such as supported Hyperliquid/Avantis integrations, only after due diligence | Order creation, status, positions, execution | Separate risk class; venue and region restrictions may apply |
| Database, auth, memory, jobs | Supabase (Postgres/Auth) or equivalent; Redis/managed queue if needed | User settings, contacts, policies, audit events, scheduled jobs | RLS/security design and secrets handling are essential |
| Error monitoring / product analytics | Sentry and privacy-conscious analytics | Errors, performance, product reliability | Redact wallet-sensitive data and never log secrets/signatures unnecessarily |
| Email/push notifications | Resend and a push provider when needed | Transaction/order/bridge status alerts | Notification is not proof of transaction completion |

## Suggested provider strategy for the first production-shaped release

1. LLM: one provider with structured output/tool calling.
2. Wallets: wagmi + viem, external wallet first.
3. RPC: Arc Testnet for current test flow, plus a production-chain RPC provider after chain choice.
4. Portfolio: one indexer with explicit partial-failure handling.
5. Prices: one market-data provider.
6. Swap: Circle App Kit selected; enable only after wallet-model compatibility and supported-chain validation.
7. Bridge: Circle CCTP / App Kit Bridge for supported USDC routes.
8. Security: GoPlus plus transaction simulation where supported.
9. Identity: ENS for ENS names, with a resolver interface for other namespaces.
10. Persistence: Supabase/Postgres for editable contacts, policies, and payment memory.
11. Monitoring: Sentry or equivalent.

Do not integrate every provider at once. Implement each behind an internal interface so Sonus can replace providers without rewriting the product.

## Required secrets/configuration (server-side only)

Use environment variables, never hard-code keys or commit actual secrets:
- `OPENAI_API_KEY` or the chosen LLM provider key
- `ALCHEMY_API_KEY` or the chosen RPC/indexer key
- `COINGECKO_API_KEY` if the selected plan requires it
- `CIRCLE_API_KEY` or the current Circle App Kit key format, only when the Circle swap adapter is actually enabled
- `TENDERLY_ACCOUNT_SLUG`, `TENDERLY_PROJECT_SLUG`, `TENDERLY_ACCESS_KEY` if Tenderly is selected
- Provider-specific security API credentials if required
- Supabase project URL and public client key for the browser; service-role key only on the server
- `SENTRY_DSN` if monitoring is enabled
- Voice provider credentials only if using a hosted voice API

Exact environment variable names should match the selected provider SDK and must be documented in a local `.env.example` with placeholders only. Never ask the user to paste secrets into chat.

## Architecture requirements

- Keep all provider API keys on the server.
- Separate read-only tools, transaction preparation, and transaction execution.
- Treat LLM output as untrusted input.
- Use explicit schemas and deterministic validators.
- Use idempotency keys for writes and scheduled jobs.
- Require wallet authorization for user-controlled transfers unless a separately designed and clearly disclosed smart-account/delegation model is introduced.
- Persist transaction/order/bridge states and reconcile them against authoritative chain/provider status.
- Use per-provider timeouts, bounded retries, rate limits, and partial-result handling.
- Record audit events without exposing private keys, seed phrases, auth tokens, or unnecessary personal data.
- Add unit, integration, provider-mock, and end-to-end tests for every money-moving capability.
- Display unsupported/unknown/stale data explicitly.
- Never claim exact HeyElsa parity until each relevant capability has been implemented and tested.

## Acceptance gates

A feature is not complete until:
1. Its real provider integration works in a controlled environment.
2. Its unsupported-chain and provider-failure behavior is tested.
3. Its result is clearly distinguished from illustrative/demo data.
4. Money-moving paths show a human-readable preview and require the designed authorization.
5. Transaction states can recover after refresh/reconnect.
6. Unit and integration tests pass.
7. Documentation identifies chain/provider limitations and any cost.

## Recommended build order

1. Replace hard-coded chat replies with a typed LLM tool orchestrator.
2. Formalize payment-intent schemas and tests.
3. Test and harden the current Arc Testnet native-USDC transfer flow.
4. Add editable recipient contacts and supported name resolution.
5. Add security checks and transaction simulation on supported chains.
6. Add real portfolio and transaction history.
7. Implement Circle App Kit swap only after the wallet model and supported networks are validated.
8. Add Circle CCTP / App Kit Bridge with status recovery.
9. Add policy engine and payment memory.
10. Add voice-provider abstraction and language options.
11. Add staking/yield discovery, then separately vetted execution.
12. Add limit orders and advanced trading only after risk/permission infrastructure.
13. Publish the developer API/SDK after internal contracts stabilize.

## Reference links

- HeyElsa feature guide: https://docs.heyelsa.ai/a-field-guide-to-heyelsa
- HeyElsa public X402 API overview: https://x402.heyelsa.ai/
- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Alchemy Portfolio APIs: https://www.alchemy.com/docs/reference/portfolio-apis
- 0x Swap API: https://docs.0x.org/docs/introduction/quickstart/swap-tokens-with-0x-swap-api
- GoPlus Security API: https://docs.gopluslabs.io/docs/getting-started
- Tenderly Simulation API: https://docs.tenderly.co/simulations-and-forks/simulation-api
- ENS resolution: https://docs.ens.domains/learn/resolution/
