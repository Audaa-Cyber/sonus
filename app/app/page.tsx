 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, AudioLines,
  Bell, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, Command,
  Copy, ExternalLink, Eye, EyeOff, Globe2, History, LayoutDashboard,
  LockKeyhole, Mic, MoreHorizontal, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, X, Zap, RefreshCw
} from "lucide-react";

type Message = { role: "assistant" | "user"; text: string };
type Intent = { recipient: string; amount: string; asset: string; network: string; reason: string; feeEstimate?: string };
type WalletBalances = { native: string | null; status: string; updatedAt: number | null };
type PaymentTx = { hash: string; status: "submitted" | "confirmed" | "failed" | "pending"; detail: string };
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SUPPORTED_DRAFT_ASSETS = new Set(["USDC", "USDT", "ETH", "SOL"]);
type Eip1193Provider = { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>; on?: (event: string, handler: (...args: unknown[]) => void) => void; removeListener?: (event: string, handler: (...args: unknown[]) => void) => void };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
declare global { interface Window { ethereum?: Eip1193Provider } }
const ARC_TESTNET_CHAIN_ID = 5042002;

const markets = [
  { symbol: "ETH", name: "Ethereum", mark: "Ξ" },
  { symbol: "SOL", name: "Solana", mark: "◎" },
  { symbol: "BTC", name: "Bitcoin", mark: "₿" },
  { symbol: "USDC", name: "USD Coin", mark: "$" },
];
type MarketQuote = { symbol: string; name: string; priceUsd: number; change24h: number };
type MarketApiResponse = { assets?: MarketQuote[]; source?: string; updatedAt?: string; error?: string };
type SwapCapabilityResponse = { provider?: { name?: string }; status?: "not_ready" | "ready"; quoteAvailable?: boolean; executionAvailable?: boolean; reason?: string; supportedEnvironment?: { arcTestnet?: { supportedTokens?: string[]; caveat?: string } } };

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6 }).format(value);
}

const activity = [
  { icon: ArrowUpRight, title: "Sent to Maya", detail: "Today, 10:42 AM · Arc", amount: "− 125.00 USDC", kind: "sent" },
  { icon: ArrowDownLeft, title: "Received from Daniel", detail: "Yesterday, 4:18 PM · Ethereum", amount: "+ 0.42 ETH", kind: "received" },
  { icon: ArrowLeftRight, title: "Swap USDC → SOL", detail: "Oct 08, 2026 · Solana", amount: "− 250.00 USDC", kind: "swap" },
];

const starters = [
  { icon: ArrowUpRight, label: "Send money", prompt: "Prepare to send 25 USDC to Alex for lunch" },
  { icon: ArrowLeftRight, label: "Swap tokens", prompt: "Help me swap 100 USDC for SOL" },
  { icon: ChartNoAxesCombined, label: "Market check", prompt: "Give me a quick crypto market overview" },
  { icon: ShieldCheck, label: "Check a wallet", prompt: "What should I check before sending crypto to a new address?" },
];

function buildReply(input: string): { reply: string; intent?: Intent } {
  const text = input.trim();
  const send = /\b(send|pay|transfer)\b/i.test(text);
  if (send) {
    const amountMatch = text.match(/(?:\$\s*)?((?:\d+(?:\.\d+)?|\.\d+))\s*(usdc|usdt|eth|sol|usd)?/i);
    const recipientMatch = text.match(/\b(?:to|for)\s+(0x[a-fA-F0-9]{40}|[a-z][a-z0-9_.-]*)/i);
    const asset = (amountMatch?.[2] || "USDC").toUpperCase();
    const amount = amountMatch?.[1] ? (amountMatch[1].startsWith(".") ? "0" + amountMatch[1] : amountMatch[1]) : "";
    const recipient = recipientMatch?.[1] || "";
    if (!amount || !recipient || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !SUPPORTED_DRAFT_ASSETS.has(asset)) {
      return { reply: "I can help prepare that, but I need a valid positive amount, a supported token (USDC, USDT, ETH, or SOL), and a recipient. For example: “Send 25 USDC to Alex for lunch.”" };
    }
    const reasonMatch = text.match(/\bfor\s+(.+)$/i);
    return {
      reply: EVM_ADDRESS_RE.test(recipient) ? "I’ve drafted the transfer. The address format looks like an EVM address, but Sonus has not verified ownership, token support, or the destination network." : "I’ve drafted the transfer, but this recipient is only a name or handle. Sonus has not resolved it to a wallet address, so do not treat the recipient as verified.",
      intent: { recipient, amount, asset, network: "Choose network", reason: reasonMatch?.[1] || "Not specified" }
    };
  }
  if (/swap|exchange|trade/i.test(text)) return { reply: "I can help plan a swap. Choose the token you’re spending, the token you want, and your preferred network. Live quotes and execution are not connected in this preview." };
  if (/market|price|trend|overview/i.test(text)) return { reply: "I couldn't retrieve verified live market data from the assistant service just now. The market panel may still load separately; please retry before relying on current prices." };
  if (/wallet|address|safe|risk|scam/i.test(text)) return { reply: "Before sending: verify the address through a trusted channel, check the network and asset, review the amount and fees, and start with a small test transfer if appropriate. Never share your recovery phrase." };
  return { reply: "I can help you plan a transfer, think through a swap, review wallet safety, or explain a market concept. For any transaction, I’ll show the details for review first." };
}

export default function SonusWorkspace() {
  const [active, setActive] = useState("Overview");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hey. I’m Sonus. What would you like to do with your crypto today?" }
  ]);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [listening, setListening] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [notice, setNotice] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [balanceBusy, setBalanceBusy] = useState(false);
  const [paymentTx, setPaymentTx] = useState<PaymentTx | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ native: null, status: "Not loaded", updatedAt: null });
  const [marketQuotes, setMarketQuotes] = useState<MarketQuote[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketRefreshNonce, setMarketRefreshNonce] = useState(0);
  const [swapCapabilities, setSwapCapabilities] = useState<SwapCapabilityResponse | null>(null);
  const [swapCapabilitiesError, setSwapCapabilitiesError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const marketRows = markets.map(asset => {
    const quote = marketQuotes.find(item => item.symbol === asset.symbol);
    return {
      ...asset,
      price: quote ? formatUsd(quote.priceUsd) : marketLoading ? "Loading…" : "Unavailable",
      change: quote ? (quote.change24h > 0 ? "+" : "") + quote.change24h.toFixed(2) + "%" : "—",
      up: quote ? quote.change24h >= 0 : true
    };
  });

  useEffect(() => {
    let active = true;
    fetch("/api/swap/capabilities", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as SwapCapabilityResponse;
        if (!response.ok) throw new Error("Swap provider status is unavailable.");
        if (active) { setSwapCapabilities(data); setSwapCapabilitiesError(""); }
      })
      .catch(error => { if (active) setSwapCapabilitiesError(error instanceof Error ? error.message : "Swap provider status is unavailable."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let requestController: AbortController | null = null;
    const loadMarket = async () => {
      requestController?.abort();
      requestController = new AbortController();
      try {
        const response = await fetch("/api/market", { signal: requestController.signal, cache: "no-store" });
        const data = await response.json() as MarketApiResponse;
        if (!response.ok || !Array.isArray(data.assets)) throw new Error(data.error || "Market data is unavailable.");
        if (!active) return;
        setMarketQuotes(data.assets.filter(item => Number.isFinite(item.priceUsd) && Number.isFinite(item.change24h)));
        setMarketUpdatedAt(data.updatedAt || new Date().toISOString());
        setMarketError("");
      } catch (error) {
        if (!active || (error instanceof Error && error.name === "AbortError")) return;
        setMarketQuotes([]);
        setMarketUpdatedAt(null);
        setMarketError(error instanceof Error ? error.message : "Market data is unavailable.");
      } finally {
        if (active) setMarketLoading(false);
      }
    };
    void loadMarket();
    const timer = window.setInterval(loadMarket, 60_000);
    return () => {
      active = false;
      requestController?.abort();
      window.clearInterval(timer);
    };
  }, [marketRefreshNonce]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setWalletAddress(accounts?.[0] || null);
      setWalletBalances({ native: null, status: accounts?.[0] ? "Refresh required" : "Not connected", updatedAt: null });
    };
    const handleChain = (...args: unknown[]) => {
      const value = args[0];
      const parsed = typeof value === "string" ? Number.parseInt(value, 16) : Number(value);
      setWalletChainId(Number.isFinite(parsed) ? parsed : null);
      setWalletBalances({ native: null, status: "Network changed · refresh required", updatedAt: null });
    };
    provider.on("accountsChanged", handleAccounts);
    provider.on("chainChanged", handleChain);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  async function connectWallet() {
    if (walletAddress) {
      setNotice("Wallet connected: " + walletAddress + (walletChainId ? " · Chain ID " + walletChainId : "") + ". Sonus has not requested a signature or moved funds.");
      return;
    }
    const provider = window.ethereum;
    if (!provider) {
      setNotice("No browser wallet was detected. Install or open a compatible EVM wallet such as MetaMask, then reload Sonus.");
      return;
    }
    setWalletBusy(true);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      const parsedChain = Number.parseInt(chain, 16);
      setWalletAddress(accounts?.[0] || null);
      setWalletChainId(Number.isFinite(parsedChain) ? parsedChain : null);
      setWalletBalances({ native: null, status: "Connected · balance not loaded", updatedAt: null });
      setNotice(accounts?.[0] ? "Wallet connected. Sonus can read your public address and network. No transaction has been signed or sent." : "The wallet did not return an account.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection was cancelled or failed.";
      setNotice(message.toLowerCase().includes("user rejected") ? "Wallet connection cancelled. Nothing was signed." : "Could not connect wallet: " + message);
    } finally {
      setWalletBusy(false);
    }
  }


  async function switchToArcTestnet() {
    const provider = window.ethereum;
    if (!provider) { setNotice("Open Sonus in a browser with an EVM wallet to switch networks."); return; }
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x4cef52" }] });
    } catch (error) {
      if ((error as { code?: number })?.code === 4902) {
        try {
          await provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x4cef52", chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] });
        } catch (addError) { setNotice("Could not add Arc Testnet: " + (addError instanceof Error ? addError.message : "request failed")); }
      } else { setNotice("Network switch cancelled or failed: " + (error instanceof Error ? error.message : "request failed")); }
    }
  }

  async function refreshWalletBalances() {
    const provider = window.ethereum;
    if (!provider || !walletAddress) { setNotice("Connect a browser wallet before reading balances."); return; }
    setBalanceBusy(true);
    setWalletBalances(current => ({ ...current, status: "Reading wallet…" }));
    try {
      const chainValue = await provider.request({ method: "eth_chainId" }) as string;
      const chainId = Number.parseInt(chainValue, 16);
      if (chainId !== ARC_TESTNET_CHAIN_ID) {
        setWalletChainId(Number.isFinite(chainId) ? chainId : null);
        setWalletBalances({ native: null, status: "Switch to Arc Testnet to read native USDC.", updatedAt: null });
        return;
      }
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const account = accounts?.[0];
      if (!account || account.toLowerCase() !== walletAddress.toLowerCase()) {
        setWalletBalances({ native: null, status: "Wallet account changed. Reconnect and retry.", updatedAt: null });
        return;
      }
      const raw = await provider.request({ method: "eth_getBalance", params: [account, "latest"] }) as string;
      const wei = BigInt(raw);
      const whole = wei / 1000000000000000000n;
      const fractional = (wei % 1000000000000000000n) / 1000000000000n;
      const fractionalText = fractional.toString().padStart(6, "0").replace(/0+$/, "");
      const balance = Number(whole).toLocaleString() + (fractionalText ? "." + fractionalText : "");
      setWalletChainId(chainId);
      setWalletBalances({ native: balance, status: "Live native USDC balance · Arc Testnet", updatedAt: Date.now() });
    } catch (error) {
      setWalletBalances({ native: null, status: "Could not read balance: " + (error instanceof Error ? error.message : "request failed"), updatedAt: null });
    } finally { setBalanceBusy(false); }
  }

  async function estimatePaymentFee() {
    if (!intent) return;
    const provider = window.ethereum;
    if (!provider || !walletAddress) { setNotice("Connect a wallet before estimating a transaction fee."); return; }
    if (!EVM_ADDRESS_RE.test(intent.recipient)) { setNotice("Recipient is not a wallet address. Resolve it before estimating fees."); return; }
    if (intent.network !== "Arc Testnet" || intent.asset !== "USDC") { setNotice("Fee estimation currently supports native USDC transfers on Arc Testnet only."); return; }
    const match = intent.amount.match(/^(\d+)(?:\.(\d{1,6}))?$/);
    if (!match) { setNotice("Enter a positive USDC amount with no more than 6 decimal places."); return; }
    const units6 = BigInt(match[1]) * 1000000n + BigInt((match[2] || "").padEnd(6, "0") || "0");
    if (units6 <= 0n) { setNotice("Enter a positive USDC amount with no more than 6 decimal places."); return; }
    const value = "0x" + (units6 * 1000000000000n).toString(16);
    setBalanceBusy(true);
    setNotice("Estimating gas on Arc Testnet. No transaction will be sent.");
    try {
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(chain, 16) !== ARC_TESTNET_CHAIN_ID) { setNotice("Switch the wallet to Arc Testnet before estimating this payment."); return; }
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const from = accounts?.[0];
      if (!from || from.toLowerCase() !== walletAddress.toLowerCase()) { setNotice("The active wallet account changed. Reconnect before estimating."); return; }
      const gasHex = await provider.request({ method: "eth_estimateGas", params: [{ from, to: intent.recipient, value }, "latest"] }) as string;
      const priceHex = await provider.request({ method: "eth_gasPrice" }) as string;
      const feeWei = BigInt(gasHex) * BigInt(priceHex);
      const feeWhole = feeWei / 1000000000000000000n;
      const feeFraction = (feeWei % 1000000000000000000n) / 1000000000000n;
      const fee = Number(feeWhole) + Number(feeFraction) / 1000000;
      const balanceHex = await provider.request({ method: "eth_getBalance", params: [from, "latest"] }) as string;
      const enoughFunds = BigInt(balanceHex) >= BigInt(value) + feeWei;
      const label = fee.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " USDC (estimated)" + (enoughFunds ? "" : " · insufficient for amount + fee");
      setIntent(current => current ? { ...current, feeEstimate: label } : current);
      setWalletBalances(current => ({ ...current, native: (Number(BigInt(balanceHex) / 1000000000000n) / 1000000).toLocaleString(undefined, { maximumFractionDigits: 6 }), status: enoughFunds ? "Balance covers amount + estimated fee at time of check" : "Warning: balance may not cover amount + estimated fee", updatedAt: Date.now() }));
      setNotice((enoughFunds ? "Estimated fee received. " : "Warning: wallet balance appears insufficient for the amount plus estimated fee. ") + "This estimate can change; nothing was signed or sent.");
    } catch (error) { setNotice("Could not estimate fee: " + (error instanceof Error ? error.message : "request failed") + ". No transaction was sent."); }
    finally { setBalanceBusy(false); }
  }

  async function sendArcTestnetPayment() {
    if (!intent) return;
    const provider = window.ethereum;
    if (!provider || !walletAddress) { setNotice("Connect a wallet before sending."); return; }
    if (intent.network !== "Arc Testnet" || intent.asset !== "USDC") { setNotice("Sending is enabled only for native USDC on Arc Testnet in this V1 preview."); return; }
    if (!EVM_ADDRESS_RE.test(intent.recipient)) { setNotice("Recipient must be a wallet address. Names are not resolved yet."); return; }
    const match = intent.amount.match(/^(\d+)(?:\.(\d{1,6}))?$/);
    if (!match) { setNotice("Enter a positive USDC amount with up to 6 decimal places."); return; }
    const amountUnits6 = BigInt(match[1]) * 1000000n + BigInt((match[2] || "").padEnd(6, "0") || "0");
    if (amountUnits6 <= 0n) { setNotice("Enter an amount greater than zero."); return; }
    const value = amountUnits6 * 1000000000000n;
    setBalanceBusy(true);
    setNotice("Rechecking network, recipient, balance, and fees before wallet approval.");
    try {
      const chain = await provider.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(chain, 16) !== ARC_TESTNET_CHAIN_ID) { setNotice("Wrong network. Switch to Arc Testnet before sending."); return; }
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      const from = accounts?.[0];
      if (!from || from.toLowerCase() !== walletAddress.toLowerCase()) { setNotice("The active wallet account changed. Reconnect before sending."); return; }
      const preflightResponse = await fetch("/api/risk/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: from, recipient: intent.recipient, amount: intent.amount, asset: intent.asset, network: intent.network, chainId: Number.parseInt(chain, 16) }),
        cache: "no-store",
      });
      if (!preflightResponse.ok) { setNotice("Transaction preflight is unavailable. No transaction was sent; try again later."); return; }
      const preflight = await preflightResponse.json() as { status: string; allowedToContinue: boolean; checks?: { severity: string; message: string }[]; disclaimer?: string };
      if (!preflight.allowedToContinue) {
        const blocking = (preflight.checks || []).filter(check => check.severity === "block").map(check => check.message);
        setNotice("Preflight blocked this payment: " + blocking.join(" "));
        return;
      }
      const warnings = (preflight.checks || []).filter(check => check.severity === "warning").map(check => check.message);
      if (from.toLowerCase() === intent.recipient.toLowerCase()) { setNotice("Recipient and sender are the same wallet. Check the address before proceeding."); return; }
      const gasHex = await provider.request({ method: "eth_estimateGas", params: [{ from, to: intent.recipient, value: "0x" + value.toString(16) }, "latest"] }) as string;
      const gasLimit = (BigInt(gasHex) * 120n + 99n) / 100n;
      const priceHex = await provider.request({ method: "eth_gasPrice" }) as string;
      const feeWei = gasLimit * BigInt(priceHex);
      const balanceHex = await provider.request({ method: "eth_getBalance", params: [from, "latest"] }) as string;
      if (BigInt(balanceHex) < value + feeWei) {
        setNotice("Insufficient native USDC for the amount plus estimated fee. No transaction was sent.");
        return;
      }
      const feeWhole = feeWei / 1000000000000000000n;
      const feeFraction = (feeWei % 1000000000000000000n) / 1000000000000n;
      const fee = (Number(feeWhole) + Number(feeFraction) / 1000000).toLocaleString(undefined, { maximumFractionDigits: 6 });
      const amountLabel = intent.amount + " USDC";
      const warningText = warnings.length ? "\n\nPreflight warnings:\n• " + warnings.join("\n• ") : "";
      const confirmed = window.confirm("Review Arc Testnet payment\n\nFrom: " + from + "\nTo: " + intent.recipient + "\nAmount: " + amountLabel + "\nEstimated network fee: " + fee + " USDC" + warningText + "\n\nBasic parameter checks only; no phishing scanner or transaction simulation is connected. This will open your wallet for final approval. Only approve if these details are correct.");
      if (!confirmed) { setNotice("Payment cancelled before opening the wallet. Nothing was sent."); return; }
      const hash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to: intent.recipient, value: "0x" + value.toString(16), gas: "0x" + gasLimit.toString(16) }] }) as string;
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("Wallet returned an invalid transaction hash.");
      setPaymentTx({ hash, status: "submitted", detail: "Submitted to your wallet. Waiting for Arc Testnet confirmation." });
      setNotice("Transaction submitted. Your wallet approved it; waiting for on-chain status.");
      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] }) as { status?: string; blockNumber?: string } | null;
        if (receipt) {
          const success = receipt.status === "0x1";
          setPaymentTx({ hash, status: success ? "confirmed" : "failed", detail: success ? "Confirmed in block " + (receipt.blockNumber ? BigInt(receipt.blockNumber).toString() : "unknown") + "." : "The network reported a failed transaction." });
          setNotice(success ? "Arc Testnet payment confirmed." : "Transaction was mined but failed. Check the explorer for details.");
          if (success) { setIntent(null); void refreshWalletBalances(); }
          return;
        }
      }
      setPaymentTx({ hash, status: "pending", detail: "Still pending. You can check the transaction on Arcscan." });
      setNotice("Transaction is still pending. Do not resend until you check its status.");
    } catch (error) {
      setNotice("Payment was not confirmed as submitted: " + (error instanceof Error ? error.message : "wallet request failed") + ". Check your wallet and transaction history before retrying.");
    } finally { setBalanceBusy(false); }
  }

  function disconnectWalletView() {
    setWalletAddress(null);
    setWalletChainId(null);
    setWalletBalances({ native: null, status: "Not connected", updatedAt: null });
    setNotice("Wallet disconnected from this Sonus view. To revoke site access completely, manage connected sites in your wallet.");
  }

  const sectionSubtitle = useMemo(() => ({
    Overview: "Your money, in context.",
    Portfolio: "A clearer view of what you hold.",
    Activity: "Every move, in one place.",
    Swap: "Plan an exchange with confidence.",
    Bridge: "Move assets across networks.",
    Stake: "Put eligible assets to work.",
    Intelligence: "Signals, context, and wallet safety.",
    Settings: "Make Sonus work your way."
  } as Record<string, string>)[active] || "Your money, in context.", [active]);

  async function submitMessage(value = input) {
    const clean = value.trim();
    if (!clean || assistantBusy) return;
    setInput("");
    setActive("Overview");
    setAssistantBusy(true);
    setMessages(current => [...current, { role: "user", text: clean }]);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, history: messages.slice(-8).map(message => ({ role: message.role, content: message.text })) })
      });
      const data = await response.json() as {
        reply?: string;
        intent?: { action?: string; amount?: string | null; asset?: string | null; recipient?: string | null; chain?: string | null; purpose?: string | null; needsClarification?: boolean; clarificationQuestion?: string | null };
        mode?: "ai" | "fallback";
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Assistant request failed.");
      setMessages(current => [...current, { role: "assistant", text: data.reply || "I couldn't produce a useful response. Please try rephrasing that." }]);
      const parsed = data.intent;
      if (parsed?.action === "transfer" && parsed.amount && parsed.recipient && parsed.asset && SUPPORTED_DRAFT_ASSETS.has(parsed.asset.toUpperCase())) {
        setIntent({
          recipient: parsed.recipient,
          amount: parsed.amount,
          asset: parsed.asset.toUpperCase(),
          network: parsed.chain === "Arc Testnet" ? "Arc Testnet" : "Choose network",
          reason: parsed.purpose || "Not specified"
        });
        setPaymentTx(null);
      } else if (parsed?.action === "transfer" && (parsed.amount || parsed.recipient)) {
        setNotice(parsed.clarificationQuestion || "Sonus identified a possible transfer, but the draft is incomplete. Provide a valid amount, asset, recipient, and network.");
      }
      if (data.mode === "fallback") setNotice("AI mode is not configured yet. Sonus used its local assistant fallback; responses are limited.");
    } catch (error) {
      const result = buildReply(clean);
      setMessages(current => [...current, { role: "assistant", text: result.reply + "\\n\\nThe AI service is unavailable right now, so this response came from the local fallback." }]);
      if (result.intent) { setIntent(result.intent); setPaymentTx(null); }
      setNotice("Assistant API unavailable: " + (error instanceof Error ? error.message : "request failed"));
    } finally {
      setAssistantBusy(false);
    }
  }

  function startVoice() {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Voice input is not supported in this browser. Try a recent version of Chrome.");
      return;
    }
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const engine = new SpeechRecognition();
    engine.lang = "en-US";
    engine.interimResults = false;
    engine.maxAlternatives = 1;
    engine.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      setListening(false);
      if (transcript) submitMessage(transcript);
    };
    engine.onerror = () => { setListening(false); setNotice("Could not capture speech. Check microphone permission and try again."); };
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setListening(true);
    setNotice("Listening… speak your request.");
    engine.start();
  }

  function navigate(label: string) {
    setActive(label);
    setIntent(null);
  }

  return (
    <main className="ws-root">
      <aside className="ws-sidebar">
        <Link href="/" className="ws-brand" aria-label="Sonus home">
          <span className="ws-brand-mark"><i /><i /><i /></span><span>SONUS<span className="ws-brand-period">.</span></span>
        </Link>
        <div className="ws-workspace-label">WORKSPACE <ChevronDown size={13} /></div>
        <nav className="ws-nav" aria-label="Workspace navigation">
          <p className="ws-nav-caption">YOUR SPACE</p>
          {[
            { label: "Overview", icon: LayoutDashboard },
            { label: "Portfolio", icon: Wallet },
            { label: "Activity", icon: History },
          ].map(({ label, icon: Icon }) => <button key={label} className={active === label ? "ws-nav-item active" : "ws-nav-item"} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span>{label === "Activity" && <span className="ws-nav-count">3</span>}</button>)}
          <p className="ws-nav-caption ws-nav-caption-gap">EXPLORE</p>
          {[
            { label: "Swap", icon: ArrowLeftRight },
            { label: "Bridge", icon: Globe2 },
            { label: "Stake", icon: Zap },
            { label: "Intelligence", icon: Sparkles },
          ].map(({ label, icon: Icon }) => <button key={label} className={active === label ? "ws-nav-item active" : "ws-nav-item"} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span>{["Bridge", "Stake"].includes(label) && <span className="ws-soon">SOON</span>}</button>)}
        </nav>
        <div className="ws-sidebar-bottom">
          <div className="ws-network-status"><span className="ws-status-dot" /><div><strong>{walletChainId === ARC_TESTNET_CHAIN_ID ? "Arc testnet" : walletChainId ? "Chain " + walletChainId : "Wallet not connected"}</strong><small>{walletAddress ? walletChainId === ARC_TESTNET_CHAIN_ID ? "Connected · testnet" : "Connected · network unverified" : "Connect to begin"}</small></div><MoreHorizontal size={16} /></div>
          <button className="ws-nav-item" onClick={() => navigate("Settings")}><Settings2 size={17} /><span>Settings</span></button>
          <button className="ws-help-link" onClick={() => setNotice("Sonus V1 preview. Native USDC transfers are enabled on Arc Testnet only, after explicit review and wallet approval.")}><CircleHelp size={16} /> Help & feedback <ArrowUpRight size={13} /></button>
          <div className="ws-profile"><div className="ws-avatar">O</div><div><strong>Offline</strong><small>Personal workspace</small></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <section className="ws-main">
        <header className="ws-topbar">
          <div className="ws-breadcrumb"><span>Workspace</span><span className="ws-slash">/</span><strong>{active}</strong></div>
          <div className="ws-top-actions">
            <button className="ws-icon-btn" aria-label="Search" onClick={() => setSearchOpen(v => !v)}><Search size={17} /></button>
            <button className="ws-icon-btn" aria-label="Notifications" onClick={() => setNotice("You’re all caught up.")}><Bell size={17} /><i /></button>
            <span className="ws-top-divider" />
            <button className="ws-connect-btn" onClick={walletAddress ? disconnectWalletView : connectWallet} disabled={walletBusy}><Wallet size={15} /> {walletBusy ? "Connecting…" : walletAddress ? walletAddress.slice(0, 6) + "…" + walletAddress.slice(-4) : "Connect wallet"} {walletAddress ? <X size={13} /> : <ArrowUpRight size={13} />}</button>
          </div>
        </header>

        {searchOpen && <div className="ws-search-pop"><Search size={16} /><input autoFocus placeholder="Search assets, activity, or ask Sonus…" onKeyDown={e => { if (e.key === "Enter") { submitMessage((e.target as HTMLInputElement).value); setSearchOpen(false); } }} /><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={15} /></button></div>}
        {notice && <div className="ws-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={14} /></button></div>}

        <div className="ws-content">
          <div className="ws-page-heading">
            <div><p className="ws-eyebrow"><span /> YOUR FINANCIAL OVERVIEW</p><h1>{active === "Overview" ? <>Good afternoon<span className="ws-period">.</span></> : active}<span className="ws-period">{active === "Overview" ? "" : "."}</span></h1><p>{sectionSubtitle}</p></div>
            <div className="ws-date"><span className="ws-live-dot" /> SUNDAY, OCTOBER 11, 2026</div>
          </div>

          {active === "Overview" ? <>
            <div className="ws-overview-grid">
              <section className="ws-balance-panel">
                <div className="ws-panel-top"><span>ARC TESTNET NATIVE USDC</span><button onClick={() => setBalanceVisible(v => !v)} aria-label={balanceVisible ? "Hide balance" : "Show balance"}>{balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                <div className="ws-balance-number">{balanceVisible ? (walletAddress ? walletBalances.native ?? "—" : "Connect wallet") : "••••••"}{balanceVisible && walletBalances.native !== null ? <span className="ws-balance-usd"> USDC</span> : null}</div>
                <div className="ws-balance-change"><span><Activity size={14} /> Testnet balance only</span><small>{walletBalances.native !== null ? "Live RPC read · not real funds" : "Connect and refresh to load balance"}</small></div>
                {walletAddress && <div className="ws-chain-balance"><div><span>WALLET READ STATUS</span><strong>{walletBalances.status}</strong></div><button onClick={walletChainId === ARC_TESTNET_CHAIN_ID ? refreshWalletBalances : switchToArcTestnet} disabled={balanceBusy}>{balanceBusy ? "Reading…" : walletChainId === ARC_TESTNET_CHAIN_ID ? "Refresh live balance" : "Switch to Arc Testnet"} <ArrowRight size={12} /></button><small>{walletBalances.updatedAt ? "Last read " + new Date(walletBalances.updatedAt).toLocaleTimeString() : "No live balance has been read yet."}</small></div>}
                <div className="ws-chart" aria-label="Illustrative portfolio performance chart">
                  <div className="ws-chart-grid"><i /><i /><i /><i /></div>
                  <svg viewBox="0 0 720 135" preserveAspectRatio="none" role="img" aria-label="Illustrative upward portfolio line"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a8d7c4" stopOpacity=".2" /><stop offset="100%" stopColor="#a8d7c4" stopOpacity="0" /></linearGradient></defs><path d="M0 108 C24 104 32 88 52 93 S87 108 108 86 S139 75 160 82 S187 55 210 66 S245 83 266 58 S301 70 323 52 S359 68 380 41 S418 58 439 45 S471 60 495 35 S529 47 548 29 S581 49 603 22 S642 38 661 17 S696 23 720 7 L720 135 L0 135Z" fill="url(#chartFill)" /><path d="M0 108 C24 104 32 88 52 93 S87 108 108 86 S139 75 160 82 S187 55 210 66 S245 83 266 58 S301 70 323 52 S359 68 380 41 S418 58 439 45 S471 60 495 35 S529 47 548 29 S581 49 603 22 S642 38 661 17 S696 23 720 7" fill="none" stroke="#a8d7c4" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
                </div>
                <div className="ws-chart-labels"><span>SEP 12</span><span>SEP 19</span><span>SEP 26</span><span>OCT 03</span><span>OCT 11</span></div>
              </section>
              <section className="ws-actions-panel">
                <div className="ws-panel-top"><span>QUICK ACTIONS</span><span className="ws-mini-label">YOUR CALL</span></div>
                <div className="ws-action-grid">
                  <button onClick={() => { setInput("Prepare to send 25 USDC to Alex for lunch"); document.getElementById("ws-assistant-input")?.focus(); }}><span className="ws-action-icon"><ArrowUpRight size={18} /></span><strong>Send</strong><small>Transfer assets</small></button>
                  <button onClick={() => navigate("Swap")}><span className="ws-action-icon"><ArrowLeftRight size={18} /></span><strong>Swap</strong><small>Exchange tokens</small></button>
                  <button onClick={() => navigate("Bridge")}><span className="ws-action-icon"><Globe2 size={18} /></span><strong>Bridge</strong><small>Move networks</small></button>
                  <button onClick={() => navigate("Portfolio")}><span className="ws-action-icon"><Plus size={18} /></span><strong>Receive</strong><small>Get an address</small></button>
                </div>
                <div className="ws-safety-note"><ShieldCheck size={16} /><span><strong>You’re in control.</strong> Every transaction should be reviewed before approval.</span></div>
              </section>
            </div>

            <div className="ws-lower-grid">
              <section className="ws-market-panel">
                <div className="ws-section-heading"><div><h2>Market watch</h2><p>A quick read on selected assets</p></div><div className="ws-section-actions"><button className="ws-view-link" onClick={() => { setMarketLoading(true); setMarketRefreshNonce(value => value + 1); }} disabled={marketLoading} aria-label="Refresh live market data"><RefreshCw size={13} /> Refresh</button><button className="ws-view-link" onClick={() => navigate("Intelligence")}>View intelligence <ArrowRight size={14} /></button></div></div>
                <div className="ws-market-table"><div className="ws-table-head"><span>ASSET</span><span>PRICE</span><span>24H</span><span /></div>{marketRows.map(asset => <div className="ws-market-row" key={asset.symbol}><span className={"ws-coin ws-coin-" + asset.symbol.toLowerCase()}>{asset.mark}</span><div className="ws-asset-name"><strong>{asset.symbol}</strong><small>{asset.name}</small></div><strong className="ws-asset-price">{asset.price}</strong><span className={asset.up ? "ws-change up" : "ws-change down"}>{asset.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{asset.change}</span><button className="ws-row-more" aria-label={"More about " + asset.symbol} onClick={() => { setInput("Give me a quick crypto market overview"); document.getElementById("ws-assistant-input")?.focus(); }}><ArrowUpRight size={14} /></button></div>)}</div>
                <p className="ws-data-disclaimer"><Activity size={12} /> {marketError ? marketError + " Market prices are not available." : marketLoading ? "Loading live market quotes…" : "Live prices from CoinGecko · refreshes every 60 seconds."}{marketUpdatedAt && !marketError ? " Updated " + new Date(marketUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "." : ""}</p>
              </section>

              <section className="ws-activity-panel">
                <div className="ws-section-heading"><div><h2>Recent activity</h2><p>Your latest moves</p></div><button className="ws-icon-btn ws-subtle-icon" aria-label="Activity options" onClick={() => navigate("Activity")}><ArrowUpRight size={16} /></button></div>
                <div className="ws-activity-list">{activity.map((item, index) => <div className="ws-activity-row" key={item.title}><span className={"ws-activity-icon " + item.kind}><item.icon size={15} /></span><div className="ws-activity-info"><strong>{item.title}</strong><small>{item.detail}</small></div><div className={"ws-activity-amount " + item.kind}>{item.amount}</div>{index < activity.length - 1 && <span className="ws-activity-divider" />}</div>)}</div>
                <button className="ws-full-activity" onClick={() => navigate("Activity")}>View all activity <ArrowRight size={14} /></button>
              </section>
            </div>

            <section className="ws-assistant-panel" id="ws-assistant">
              <div className="ws-assistant-heading"><div className="ws-assistant-symbol"><AudioLines size={19} /></div><div><span className="ws-eyebrow">YOUR PAYMENT INTELLIGENCE</span><h2>Ask Sonus<span className="ws-period">.</span></h2><p>Type it or say it. Start with what you want to do.</p></div><span className="ws-assistant-beta">PREVIEW</span></div>
              <div className="ws-chat-window" aria-live="polite">{messages.slice(-4).map((message, i) => <div key={messages.length + "-" + i} className={"ws-message " + message.role}><span className="ws-message-avatar">{message.role === "assistant" ? <AudioLines size={14} /> : "O"}</span><p>{message.text}</p></div>)}{assistantBusy && <div className="ws-message assistant"><span className="ws-message-avatar"><AudioLines size={14} /></span><p>Thinking through your request…</p></div>}</div>
              {intent && <div className="ws-intent-card"><div className="ws-intent-header"><span><ShieldCheck size={15} /> PAYMENT DRAFT</span><span>NOT SENT</span></div><div className="ws-intent-main"><div><small>FROM WALLET</small><strong>{walletAddress ? walletAddress.slice(0, 9) + "…" + walletAddress.slice(-7) : "Connect wallet"}</strong>{walletAddress && <button className="ws-copy-address" onClick={async () => { try { await navigator.clipboard.writeText(walletAddress); setNotice("Connected wallet address copied."); } catch { setNotice("Could not copy automatically. Wallet address: " + walletAddress); } }}><Copy size={11} /> Copy address</button>}</div><div><small>RECIPIENT</small><strong>{intent.recipient}</strong><small className={EVM_ADDRESS_RE.test(intent.recipient) ? "ws-recipient-status valid" : "ws-recipient-status"}>{EVM_ADDRESS_RE.test(intent.recipient) ? "Address format only · not verified" : "Unresolved name · address required"}</small>{EVM_ADDRESS_RE.test(intent.recipient) && intent.network === "Arc Testnet" && <a className="ws-explorer-link" href={"https://testnet.arcscan.app/address/" + intent.recipient} target="_blank" rel="noreferrer">View address on Arcscan <ExternalLink size={11} /></a>}</div><div><small>AMOUNT</small><strong>{intent.amount} {intent.asset}</strong></div><div><small>NETWORK</small><select aria-label="Choose transaction network" value={intent.network} onChange={e => setIntent(current => current ? { ...current, network: e.target.value } : current)}><option>Choose network</option><option>Arc Testnet</option><option>Ethereum</option><option>Arbitrum</option><option>Base</option></select></div><div><small>NOTE</small><strong>{intent.reason}</strong></div>{intent.feeEstimate && <div><small>NETWORK FEE</small><strong>{intent.feeEstimate}</strong></div>}</div><div className="ws-preview-checks"><strong>Before this can be sent</strong><span><Check size={13} /> Confirm the recipient address through a trusted channel</span><span><Check size={13} /> Confirm token and network compatibility</span><span><Check size={13} /> Load live balance and estimate network fees</span><span><Check size={13} /> Review the exact transaction in your wallet</span></div><p><LockKeyhole size={13} /> {paymentTx?.status === "submitted" || paymentTx?.status === "pending" ? "Transaction submitted; do not resend while its status is pending. Check the transaction status below." : "This is a draft until you choose “Send test payment” and approve the exact transaction in your wallet. Names are not resolved. Sending is restricted to native USDC on Arc Testnet."}</p><div className="ws-intent-buttons"><button onClick={() => { setNotice("Payment draft dismissed."); setIntent(null); }}>Dismiss draft</button><button onClick={() => { if (!EVM_ADDRESS_RE.test(intent.recipient)) setNotice("Recipient is unresolved. Enter a wallet address before proceeding."); else if (intent.network === "Choose network") setNotice("Choose a network before reviewing this payment."); else if (intent.network === "Arc Testnet" && intent.asset === "USDC") void estimatePaymentFee(); else setNotice("Fee estimation currently supports native USDC transfers on Arc Testnet only. Nothing was sent."); }} disabled={balanceBusy || paymentTx?.status === "submitted" || paymentTx?.status === "pending"}>{paymentTx?.status === "submitted" || paymentTx?.status === "pending" ? "Transaction pending" : balanceBusy ? "Checking…" : "Estimate fee"} <ArrowRight size={13} /></button>{intent.feeEstimate && EVM_ADDRESS_RE.test(intent.recipient) && intent.network === "Arc Testnet" && intent.asset === "USDC" && paymentTx?.status !== "submitted" && paymentTx?.status !== "pending" && paymentTx?.status !== "confirmed" && <button className="ws-send-payment-btn" onClick={() => void sendArcTestnetPayment()} disabled={balanceBusy}>{balanceBusy ? "Working…" : "Send test payment"} <ArrowUpRight size={13} /></button>}</div></div>}
              {paymentTx && <div className={"ws-payment-result " + paymentTx.status} role="status" aria-live="polite"><div><span className="ws-eyebrow">ON-CHAIN TRANSACTION</span><strong>{paymentTx.status === "confirmed" ? "Payment confirmed" : paymentTx.status === "failed" ? "Transaction failed" : paymentTx.status === "pending" ? "Confirmation pending" : "Transaction submitted"}</strong><small>{paymentTx.detail}</small><a href={"https://testnet.arcscan.app/tx/" + paymentTx.hash} target="_blank" rel="noreferrer">View transaction on Arcscan <ExternalLink size={12} /></a></div><button onClick={() => navigator.clipboard.writeText(paymentTx.hash).then(() => setNotice("Transaction hash copied.")).catch(() => setNotice(paymentTx.hash))} aria-label="Copy transaction hash"><Copy size={15} /></button></div>}<div className="ws-prompt-chips">{starters.map(({ icon: Icon, label, prompt }) => <button key={label} onClick={() => submitMessage(prompt)}><Icon size={14} />{label}<ArrowUpRight size={12} /></button>)}</div>
              <form className="ws-composer" onSubmit={e => { e.preventDefault(); submitMessage(); }}><button type="button" className={listening ? "ws-mic-btn listening" : "ws-mic-btn"} aria-label={listening ? "Stop voice input" : "Use voice input"} onClick={startVoice}><Mic size={17} /></button><input id="ws-assistant-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Sonus to send, swap, or explain…" aria-label="Message Sonus" /><span className="ws-composer-hint"><Command size={11} /> Enter</span><button type="submit" className="ws-send-btn" aria-label="Send message" disabled={!input.trim() || assistantBusy}><Send size={16} /></button></form>
              <div className="ws-assistant-foot"><span><LockKeyhole size={12} /> You review before anything moves.</span><span>{listening ? "Listening…" : "Voice input uses your browser’s speech recognition."}</span></div>
            </section>
            <footer className="ws-footer"><span>SONUS / PRIVATE WORKSPACE</span><span>BUILT FOR CLARITY. DESIGNED FOR CONTROL.</span><button onClick={() => setNotice("Dashboard prices and portfolio examples are illustrative. Native USDC transfers are connected on Arc Testnet only; swaps, bridges, and other networks are not live.")}>What’s live? <ExternalLink size={12} /></button></footer>
          </> : <section className="ws-placeholder-page"><div className="ws-placeholder-icon">{active === "Portfolio" ? <Wallet size={24} /> : active === "Activity" ? <History size={24} /> : active === "Intelligence" ? <Sparkles size={24} /> : active === "Settings" ? <Settings2 size={24} /> : <ArrowLeftRight size={24} />}</div><span className="ws-eyebrow">SONUS / V1 PREVIEW</span><h2>{active}<span className="ws-period">.</span></h2><p>{active === "Portfolio" ? "Your assets will appear here after wallet connections and live balance indexing are integrated." : active === "Activity" ? "Your confirmed transactions will appear here after wallet and chain indexing are connected." : active === "Swap" ? (swapCapabilities?.reason || (swapCapabilitiesError ? "Circle App Kit status could not be loaded. No swap quote or execution is available." : "Checking Circle App Kit swap readiness…")) : active === "Bridge" ? "Cross-chain routes, bridge providers, fee estimates, and settlement tracking will be integrated here." : active === "Stake" ? "Staking opportunities, protocol risk information, and position tracking will appear here when supported integrations are selected." : active === "Intelligence" ? "A home for market context, wallet-risk signals, transaction explanations, and portfolio insights. Live BTC, ETH, SOL, and USDC spot-price snapshots are connected; portfolio and wallet-risk intelligence still need integrations." : "Manage wallet connections, networks, permissions, privacy, and spending rules as those controls are implemented."}</p><div className="ws-placeholder-status"><span className="ws-status-dot" /> {active === "Swap" ? (swapCapabilities?.quoteAvailable && swapCapabilities?.executionAvailable ? "Circle App Kit ready" : swapCapabilitiesError ? "Provider status unavailable" : "Circle App Kit selected · Not ready") : "Interface scaffolded"} <span className="ws-status-separator">·</span> {active === "Swap" ? (swapCapabilities?.supportedEnvironment?.arcTestnet?.supportedTokens ? "Arc Testnet pairs: " + swapCapabilities.supportedEnvironment.arcTestnet.supportedTokens.join(", ") : "No live quote") : "Integration pending"}</div><button className="ws-connect-btn" onClick={() => navigate("Overview")}><ArrowRight size={15} /> Back to overview</button></section>}
        </div>
      </section>
    </main>
  );
}
