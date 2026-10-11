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
- The dashboard's portfolio chart, market prices, and activity examples are illustrative, not live.
- A fee estimate is a snapshot, not a guarantee. Balance checks can become stale and do not replace the wallet's final transaction review. Transaction status is polled from the connected wallet provider; if polling times out, check the explorer before retrying.
- This is a testnet implementation. Do not treat testnet assets as real funds or use this as production payment infrastructure.

## Verification

GitHub Actions runs typecheck, lint, and production build checks. Check the workflow status on the [Sonus checks page](https://github.com/Audaa-Cyber/sonus/actions/workflows/ci.yml).


### Manual Arc Testnet smoke test

1. Open the workspace in a desktop browser with an EVM wallet extension.
2. Connect a wallet and use the network control to add/switch to Arc Testnet.
3. If you need test funds, use the [Circle testnet faucet](https://faucet.circle.com). Never use a mainnet wallet balance for this test.
4. Refresh the live native USDC balance.
5. Ask Sonus to prepare a payment to a wallet address you control on Arc Testnet, for example `Send 0.01 USDC to 0x<your-test-wallet-address>`.
6. Select **Arc Testnet**, then choose **Estimate fee**. Confirm the estimated fee and balance warning.
7. Only if you intentionally want to test a transfer, choose **Send test payment**, verify the sender, recipient, amount, and fee in Sonus, then verify the same details again in the wallet popup.
8. Follow the transaction status and verify the result on [Arcscan Testnet](https://testnet.arcscan.app).

Use a test wallet and testnet funds only. A valid address format does not prove that the address belongs to the intended recipient.
