# Sonus V1: HeyElsa capability parity + voice-first access

## Goal
Build Sonus as a conversational crypto copilot with both text and voice access. The V1 target is capability parity with the publicly documented HeyElsa product, not a pixel-for-pixel copy of its brand or interface.

## Publicly documented HeyElsa capability set
Based on HeyElsa's official website and docs reviewed on 2026-10-11:
- Conversational crypto education and general questions.
- Portfolio balance, holdings, allocation, and personalized portfolio suggestions.
- Token swaps and trades.
- Cross-chain bridging and transfers.
- Staking and yield opportunity discovery/optimization.
- Market and token insights, including trending tokens and prices.
- Limit orders / conditional trade automation.
- Risk checks and safeguards for transactions.
- Voice and text interaction, including multiple languages.
- Smart wallet plus connect-your-own-wallet flows, across multiple chains.
- Widget / SDK embedding for partner apps, including knowledge queries and send/swap actions.
- Public-facing Elsa materials also describe more advanced risk, hedging, and automated strategy features. Treat these as separate milestones until provider integrations and exact availability are verified.

Sources:
- https://www.heyelsa.ai/
- https://docs.heyelsa.ai/a-field-guide-to-heyelsa
- https://docs.heyelsa.ai/elsa-widget/sample-implementation
- https://beta.heyelsa.ai/

## Sonus-specific foundation
Preserve the wider Sonus vision: intent understanding, identity/recipient resolution, payment memory, permissions, risk-aware planning, transaction previews, group payments, rules, and eventually SDK/API access. Voice is an input surface, not the product moat.

## V1 interaction loop
1. Accept typed input or browser voice transcription.
2. Interpret the requested task and gather missing details.
3. Return a grounded explanation or a typed action plan.
4. For financial actions, show asset, amount, destination, chain, route, fees, slippage, and risk details when integrations provide them.
5. Require explicit confirmation and wallet authorization.
6. Execute via audited providers/adapters and record the result.
7. Show transaction state and history.

## Current branch implementation
Branch: `feature/v1-agentic-crypto-assistant`

This branch adds an early workspace at `/app` with:
- Sidebar navigation for Overview, Trade, Portfolio, Explore, Yield, Learn, and Activity.
- Natural-language command input, starter prompts, conversation preview, and browser SpeechRecognition input where supported.
- Demo asset cards and portfolio metrics.
- Feature entry points for swaps, transfers/bridges, yield, token exploration, education, and safety.
- Explicit demo-mode messaging; sample balances and local responses are not live data.
- No actual wallet connection, live market data, signing, swaps, bridge, staking, yield allocation, or transaction execution.

## Delivery stages
### Stage 1 — Interaction shell
- [x] Workspace UI and navigation
- [x] Text prompt and local response preview
- [x] Browser voice transcription input (browser support and microphone permission required)
- [x] Clear disclosure that current figures/actions are illustrative
- [ ] Add unit and browser tests

### Stage 2 — Real assistant
- [ ] Server-side model integration with structured tool calling
- [ ] Streaming responses and conversation persistence
- [ ] Grounded live market/on-chain data providers
- [ ] Typed intent schema, clarification prompts, and refusal for unsupported actions
- [ ] Retrieval/knowledge base for crypto education

### Stage 3 — Wallet and execution
- [ ] Wallet connection and session lifecycle
- [ ] Network/token metadata and balances
- [ ] Quotes and transaction simulation
- [ ] Approval/confirmation UI and deterministic policy gate
- [ ] Transaction signing, submission, receipt tracking, and activity history
- [ ] Start with Arc + USDC where supported, without hard-coding the architecture to a single chain

### Stage 4 — Advanced HeyElsa parity
- [ ] Swap routing and cross-chain bridge adapters
- [ ] Staking and yield comparison / execution
- [ ] Token and market discovery with current data
- [ ] Limit orders and user-approved automations
- [ ] Portfolio construction, allocation, and rebalancing
- [ ] Risk signals and transaction simulation
- [ ] Multilingual voice, mobile/responsive polish
- [ ] Embeddable SDK/widget and API
- [ ] More advanced hedging and leveraged products only after strong risk controls, provider validation, and explicit opt-in

## Architecture guardrails
- The model proposes structured intent; deterministic code enforces policies.
- No private keys or seed phrases in model prompts, logs, or browser storage.
- No automatic signing solely because voice was detected.
- Never silently guess a recipient, network, token, amount, slippage, or leverage.
- Consequential actions require a readable transaction summary and explicit confirmation.
- Dry-run/simulation first; live execution only after a supported wallet/provider path exists.
- Risk and yield data must show source and freshness; never promise profit or perfect scam detection.
- Keep chain integrations modular and wallet-agnostic.

## Acceptance criteria for a usable first release
- A user can type or speak a supported request and see the interpreted intent.
- Ambiguous requests trigger clarification rather than a guessed transaction.
- Read-only questions return grounded, source-aware answers.
- Every financial action has a review step and a clear authorization boundary.
- Unsupported or disconnected capabilities are clearly disclosed.
- No transaction is represented as completed unless a real provider receipt confirms it.
- Automated tests cover parsing, policy checks, and transaction state transitions.
