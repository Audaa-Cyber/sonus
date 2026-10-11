 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, AudioLines,
  Bell, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, Command, Compass,
  Copy, CreditCard, ExternalLink, Eye, EyeOff, Globe2, History, LayoutDashboard,
  LockKeyhole, MessageCircle, Mic, MoreHorizontal, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet, X, Zap
} from "lucide-react";

type Message = { role: "assistant" | "user"; text: string };
type Intent = { recipient: string; amount: string; asset: string; network: string; reason: string };
type WalletBalances = { native: string | null; usdc: string | null; status: string; updatedAt: number | null };
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SUPPORTED_DRAFT_ASSETS = new Set(["USDC", "USDT", "ETH", "SOL"]);
type Eip1193Provider = { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>; on?: (event: string, handler: (...args: unknown[]) => void) => void; removeListener?: (event: string, handler: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: Eip1193Provider } }
const ARC_TESTNET_CHAIN_ID = 5042002;

const markets = [
  { symbol: "ETH", name: "Ethereum", price: "$3,842.19", change: "+2.84%", up: true, mark: "Ξ" },
  { symbol: "SOL", name: "Solana", price: "$182.46", change: "+5.21%", up: true, mark: "◎" },
  { symbol: "BTC", name: "Bitcoin", price: "$108,420.00", change: "-0.74%", up: false, mark: "₿" },
  { symbol: "USDC", name: "USD Coin", price: "$1.00", change: "0.01%", up: true, mark: "$" },
];

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
    const amountMatch = text.match(/(?:\$\s*)?(\d+(?:\.\d+)?)\s*(usdc|usdt|eth|sol|usd)?/i);
    const recipientMatch = text.match(/\b(?:to|for)\s+(0x[a-fA-F0-9]{40}|[a-z][a-z0-9_.-]*)/i);
    const asset = (amountMatch?.[2] || "USDC").toUpperCase();
    const amount = amountMatch?.[1] || "";
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
  if (/market|price|trend|overview/i.test(text)) return { reply: "Market snapshot is illustrative in this build. ETH and SOL are shown as positive, while BTC is slightly down. Connect a market data provider before relying on live prices." };
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
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({ native: null, usdc: null, status: "Not loaded", updatedAt: null });
  const recognition = useRef<any>(null);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setWalletAddress(accounts?.[0] || null);
      setWalletBalances({ native: null, usdc: null, status: accounts?.[0] ? "Refresh required" : "Not connected", updatedAt: null });
    };
    const handleChain = (...args: unknown[]) => {
      const value = args[0];
      const parsed = typeof value === "string" ? Number.parseInt(value, 16) : Number(value);
      setWalletChainId(Number.isFinite(parsed) ? parsed : null);
      setWalletBalances({ native: null, usdc: null, status: "Network changed · refresh required", updatedAt: null });
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
      setWalletBalances({ native: null, usdc: null, status: "Connected · balance not loaded", updatedAt: null });
      setNotice(accounts?.[0] ? "Wallet connected. Sonus can read your public address and network. No transaction has been signed or sent." : "The wallet did not return an account.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection was cancelled or failed.";
      setNotice(message.toLowerCase().includes("user rejected") ? "Wallet connection cancelled. Nothing was signed." : "Could not connect wallet: " + message);
    } finally {
      setWalletBusy(false);
    }
  }


  async function refreshWalletBalances() {
    const provider = window.ethereum;
    if (!provider || !walletAddress) {
      setNotice("Connect a browser wallet before reading balances.");
      return;
    }
    setBalanceBusy(true);
    setWalletBalances(current => ({ ...current, status: "Reading wallet…" }));
    try {
      const chainValue = await provider.request({ method: "eth_chainId" }) as string;
      const chainId = Number.parseInt(chainValue, 16);
      if (chainId !== ARC_TESTNET_CHAIN_ID) {
        setWalletChainId(Number.isFinite(chainId) ? chainId : null);
        setWalletBalances({ native: null, usdc: null, status: "Switch to Arc Testnet to read this balance.", updatedAt: null });
        return;
      }
      const accountValue = await provider.request({ method: "eth_accounts" }) as string[];
      const account = accountValue?.[0];
      if (!account || account.toLowerCase() !== walletAddress.toLowerCase()) {
        setWalletBalances({ native: null, usdc: null, status: "Wallet account changed. Reconnect and retry.", updatedAt: null });
        return;
      }
      const nativeHex = await provider.request({ method: "eth_getBalance", params: [account, "latest"] }) as string;
      const nativeWei = BigInt(nativeHex);
      const nativeBalance = (Number(nativeWei / 1000000000000n) / 1000000).toLocaleString(undefined, { maximumFractionDigits: 6 });
      let usdc: string | null = null;
      const tokenAddress = process.env.NEXT_PUBLIC_ARC_TESTNET_USDC_ADDRESS;
      if (tokenAddress && EVM_ADDRESS_RE.test(tokenAddress)) {
        const paddedAddress = account.slice(2).toLowerCase().padStart(64, "0");
        const data = "0x70a08231" + paddedAddress;
        const raw = await provider.request({ method: "eth_call", params: [{ to: tokenAddress, data }, "latest"] }) as string;
        const tokenUnits = BigInt(raw);
        let decimals = 6;
        try {
          const rawDecimals = await provider.request({ method: "eth_call", params: [{ to: tokenAddress, data: "0x313ce567" }, "latest"] }) as string;
          const parsedDecimals = Number(BigInt(rawDecimals));
          if (Number.isInteger(parsedDecimals) && parsedDecimals >= 0 && parsedDecimals <= 18) decimals = parsedDecimals;
        } catch { /* use the conventional USDC precision only when the configured token omits decimals */ }
        const divisor = 10n ** BigInt(decimals);
        usdc = (Number(tokenUnits / (divisor / (10n ** BigInt(Math.min(decimals, 6))))) / (10 ** Math.min(decimals, 6))).toLocaleString(undefined, { maximumFractionDigits: 6 });
      }
      setWalletChainId(chainId);
      setWalletBalances({ native: nativeBalance, usdc, status: tokenAddress ? "Live on-chain reads · Arc Testnet" : "Live native balance · USDC contract not configured", updatedAt: Date.now() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Balance read failed.";
      setWalletBalances({ native: null, usdc: null, status: "Could not read balance: " + message, updatedAt: null });
    } finally {
      setBalanceBusy(false);
    }
  }

  function disconnectWalletView() {
    setWalletAddress(null);
    setWalletChainId(null);
    setWalletBalances({ native: null, usdc: null, status: "Not connected", updatedAt: null });
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

  function submitMessage(value = input) {
    const clean = value.trim();
    if (!clean) return;
    const result = buildReply(clean);
    setMessages(current => [...current, { role: "user", text: clean }, { role: "assistant", text: result.reply }]);
    if (result.intent) setIntent(result.intent);
    setInput("");
    setActive("Overview");
  }

  function startVoice() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    engine.onresult = (event: any) => {
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
        <a href="/" className="ws-brand" aria-label="Sonus home">
          <span className="ws-brand-mark"><i /><i /><i /></span><span>SONUS<span className="ws-brand-period">.</span></span>
        </a>
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
          <button className="ws-help-link" onClick={() => setNotice("Sonus V1 preview. Wallet connections and transaction execution are not enabled yet.")}><CircleHelp size={16} /> Help & feedback <ArrowUpRight size={13} /></button>
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
                <div className="ws-panel-top"><span>TOTAL PORTFOLIO VALUE</span><button onClick={() => setBalanceVisible(v => !v)} aria-label={balanceVisible ? "Hide balance" : "Show balance"}>{balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                <div className="ws-balance-number">{balanceVisible ? "$24,680" : "••••••"}<span>.52</span><span className="ws-balance-usd"> USD</span></div>
                <div className="ws-balance-change"><span><TrendingUp size={14} /> +$1,284.30 (5.49%)</span><small>Past 30 days · illustrative</small></div>
                {walletAddress && <div className="ws-chain-balance"><div><span>ARC TESTNET NATIVE BALANCE</span><strong>{walletBalances.native === null ? "—" : walletBalances.native + " ARC"}</strong></div><div><span>USDC BALANCE</span><strong>{walletBalances.usdc === null ? "Not configured" : walletBalances.usdc + " USDC"}</strong></div><button onClick={refreshWalletBalances} disabled={balanceBusy}>{balanceBusy ? "Reading…" : "Refresh on-chain balances"} <ArrowRight size={12} /></button><small>{walletBalances.status}{walletBalances.updatedAt ? " · " + new Date(walletBalances.updatedAt).toLocaleTimeString() : ""}</small></div>}
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
                <div className="ws-section-heading"><div><h2>Market watch</h2><p>A quick read on selected assets</p></div><button className="ws-view-link" onClick={() => navigate("Intelligence")}>View intelligence <ArrowRight size={14} /></button></div>
                <div className="ws-market-table"><div className="ws-table-head"><span>ASSET</span><span>PRICE</span><span>24H</span><span /></div>{markets.map(asset => <div className="ws-market-row" key={asset.symbol}><span className={"ws-coin ws-coin-" + asset.symbol.toLowerCase()}>{asset.mark}</span><div className="ws-asset-name"><strong>{asset.symbol}</strong><small>{asset.name}</small></div><strong className="ws-asset-price">{asset.price}</strong><span className={asset.up ? "ws-change up" : "ws-change down"}>{asset.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{asset.change}</span><button className="ws-row-more" aria-label={"More about " + asset.symbol} onClick={() => { setInput("Give me a quick crypto market overview"); document.getElementById("ws-assistant-input")?.focus(); }}><ArrowUpRight size={14} /></button></div>)}</div>
                <p className="ws-data-disclaimer"><Activity size={12} /> Illustrative data for UI preview. Prices and portfolio values are not live.</p>
              </section>

              <section className="ws-activity-panel">
                <div className="ws-section-heading"><div><h2>Recent activity</h2><p>Your latest moves</p></div><button className="ws-icon-btn ws-subtle-icon" aria-label="Activity options" onClick={() => navigate("Activity")}><ArrowUpRight size={16} /></button></div>
                <div className="ws-activity-list">{activity.map((item, index) => <div className="ws-activity-row" key={item.title}><span className={"ws-activity-icon " + item.kind}><item.icon size={15} /></span><div className="ws-activity-info"><strong>{item.title}</strong><small>{item.detail}</small></div><div className={"ws-activity-amount " + item.kind}>{item.amount}</div>{index < activity.length - 1 && <span className="ws-activity-divider" />}</div>)}</div>
                <button className="ws-full-activity" onClick={() => navigate("Activity")}>View all activity <ArrowRight size={14} /></button>
              </section>
            </div>

            <section className="ws-assistant-panel" id="ws-assistant">
              <div className="ws-assistant-heading"><div className="ws-assistant-symbol"><AudioLines size={19} /></div><div><span className="ws-eyebrow">YOUR PAYMENT INTELLIGENCE</span><h2>Ask Sonus<span className="ws-period">.</span></h2><p>Type it or say it. Start with what you want to do.</p></div><span className="ws-assistant-beta">PREVIEW</span></div>
              <div className="ws-chat-window" aria-live="polite">{messages.slice(-4).map((message, i) => <div key={messages.length + "-" + i} className={"ws-message " + message.role}><span className="ws-message-avatar">{message.role === "assistant" ? <AudioLines size={14} /> : "O"}</span><p>{message.text}</p></div>)}</div>
              {intent && <div className="ws-intent-card"><div className="ws-intent-header"><span><ShieldCheck size={15} /> PAYMENT DRAFT</span><span>NOT SENT</span></div><div className="ws-intent-main"><div><small>RECIPIENT</small><strong>{intent.recipient}</strong><small className={EVM_ADDRESS_RE.test(intent.recipient) ? "ws-recipient-status valid" : "ws-recipient-status"}>{EVM_ADDRESS_RE.test(intent.recipient) ? "Address format only · not verified" : "Unresolved name · address required"}</small></div><div><small>AMOUNT</small><strong>{intent.amount} {intent.asset}</strong></div><div><small>NETWORK</small><select aria-label="Choose transaction network" value={intent.network} onChange={e => setIntent(current => current ? { ...current, network: e.target.value } : current)}><option>Choose network</option><option>Arc Testnet</option><option>Ethereum</option><option>Arbitrum</option><option>Base</option></select></div><div><small>NOTE</small><strong>{intent.reason}</strong></div></div><div className="ws-preview-checks"><strong>Before this can be sent</strong><span><Check size={13} /> Confirm the recipient address through a trusted channel</span><span><Check size={13} /> Confirm token and network compatibility</span><span><Check size={13} /> Load live balance and estimate network fees</span><span><Check size={13} /> Review the exact transaction in your wallet</span></div><p><LockKeyhole size={13} /> This is a draft only. Selecting a network does not verify the recipient or check token availability. No transaction can be signed or sent from this preview.</p><div className="ws-intent-buttons"><button onClick={() => { setNotice("No transaction was sent. Wallet execution is not enabled in this preview."); setIntent(null); }}>Dismiss draft</button><button onClick={() => setNotice(!EVM_ADDRESS_RE.test(intent.recipient) ? "Recipient is unresolved. Enter a wallet address or integrate a trusted name-resolution service before proceeding." : intent.network === "Choose network" ? "Choose a network before reviewing this payment." : "Draft checks are incomplete: live balance, token contract, fees, simulation, and wallet transaction signing are not integrated. Nothing was sent.")}>Validate draft <ArrowRight size={13} /></button></div></div>}
              <div className="ws-prompt-chips">{starters.map(({ icon: Icon, label, prompt }) => <button key={label} onClick={() => submitMessage(prompt)}><Icon size={14} />{label}<ArrowUpRight size={12} /></button>)}</div>
              <form className="ws-composer" onSubmit={e => { e.preventDefault(); submitMessage(); }}><button type="button" className={listening ? "ws-mic-btn listening" : "ws-mic-btn"} aria-label={listening ? "Stop voice input" : "Use voice input"} onClick={startVoice}><Mic size={17} /></button><input id="ws-assistant-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Sonus to send, swap, or explain…" aria-label="Message Sonus" /><span className="ws-composer-hint"><Command size={11} /> Enter</span><button type="submit" className="ws-send-btn" aria-label="Send message" disabled={!input.trim()}><Send size={16} /></button></form>
              <div className="ws-assistant-foot"><span><LockKeyhole size={12} /> You review before anything moves.</span><span>{listening ? "Listening…" : "Voice input uses your browser’s speech recognition."}</span></div>
            </section>
            <footer className="ws-footer"><span>SONUS / PRIVATE WORKSPACE</span><span>BUILT FOR CLARITY. DESIGNED FOR CONTROL.</span><button onClick={() => setNotice("Sonus V1 is a functional interface preview. Live financial integrations are not yet connected.")}>What’s live? <ExternalLink size={12} /></button></footer>
          </> : <section className="ws-placeholder-page"><div className="ws-placeholder-icon">{active === "Portfolio" ? <Wallet size={24} /> : active === "Activity" ? <History size={24} /> : active === "Intelligence" ? <Sparkles size={24} /> : active === "Settings" ? <Settings2 size={24} /> : <ArrowLeftRight size={24} />}</div><span className="ws-eyebrow">SONUS / V1 PREVIEW</span><h2>{active}<span className="ws-period">.</span></h2><p>{active === "Portfolio" ? "Your assets will appear here after wallet connections and live balance indexing are integrated." : active === "Activity" ? "Your confirmed transactions will appear here after wallet and chain indexing are connected." : active === "Swap" ? "Swap planning is part of the V1 direction. Live quotes, slippage checks, routing, and wallet signing still need integration." : active === "Bridge" ? "Cross-chain routes, bridge providers, fee estimates, and settlement tracking will be integrated here." : active === "Stake" ? "Staking opportunities, protocol risk information, and position tracking will appear here when supported integrations are selected." : active === "Intelligence" ? "A home for market context, wallet-risk signals, transaction explanations, and portfolio insights. Live data sources are not connected yet." : "Manage wallet connections, networks, permissions, privacy, and spending rules as those controls are implemented."}</p><div className="ws-placeholder-status"><span className="ws-status-dot" /> Interface scaffolded <span className="ws-status-separator">·</span> Integration pending</div><button className="ws-connect-btn" onClick={() => navigate("Overview")}><ArrowRight size={15} /> Back to overview</button></section>}
        </div>
      </section>
    </main>
  );
}
