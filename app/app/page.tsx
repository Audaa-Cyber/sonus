"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownUp, ArrowRight, ArrowUpRight, AudioLines,
  BookOpen, ChevronDown, CircleHelp, Clock3, Command, Compass, Globe2,
  LayoutDashboard, Mic, MicOff, MoreHorizontal, Search, Send, Settings2,
  ShieldCheck, Sparkles, TrendingUp, Wallet, X, Zap,
} from "lucide-react";
import "./workspace.css";

type Message = { role: "assistant" | "user"; text: string; kind?: "plan" };
type NavItem = "Overview" | "Trade" | "Portfolio" | "Explore" | "Yield" | "Learn" | "Activity";

const starterPrompts = [
  "What is my portfolio worth?",
  "Swap $50 USDC to ETH",
  "Find yield opportunities for USDC",
  "Explain what bridging means",
];

const assets = [
  { symbol: "ETH", name: "Ethereum", amount: "1.42", value: "$4,682.10", change: "+2.84%", positive: true, mark: "Ξ" },
  { symbol: "USDC", name: "USD Coin", amount: "1,250.00", value: "$1,250.00", change: "0.01%", positive: true, mark: "$" },
  { symbol: "SOL", name: "Solana", amount: "8.20", value: "$1,394.00", change: "+5.12%", positive: true, mark: "◎" },
];

function answerFor(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("portfolio") || p.includes("balance") || p.includes("worth")) {
    return { text: "Your connected demo portfolio is worth $7,326.10 across 3 assets. ETH is your largest holding at 63.9% of the portfolio. These are sample values for this V1 workspace, not live wallet data." };
  }
  if (p.includes("swap") || p.includes("buy") || p.includes("sell") || p.includes("exchange")) {
    return { text: "I’ve prepared a transaction preview. Review the asset, amount, network, estimated output, fees, and slippage before anything is sent. Live swaps are not connected in this V1 build.", kind: "plan" as const };
  }
  if (p.includes("bridge")) {
    return { text: "A bridge moves assets from one blockchain to another. Routes can differ in cost, speed, and risk. Before bridging, compare the source and destination networks, provider, estimated fees, delivery time, and the exact token you’ll receive." };
  }
  if (p.includes("yield") || p.includes("earn") || p.includes("apy") || p.includes("stake")) {
    return { text: "I can help compare yield opportunities by estimated APY, protocol risk, lockup, liquidity, and smart-contract exposure. Rates change constantly, so this demo uses no live yield feed and does not allocate funds." };
  }
  if (p.includes("send") || p.includes("transfer") || p.includes("pay")) {
    return { text: "Before a transfer, I need a confirmed recipient, asset, amount, and network. I’ll show a review step and require explicit authorization. No transfer is sent from this demo." , kind: "plan" as const};
  }
  if (p.includes("price") || p.includes("trending") || p.includes("market")) {
    return { text: "I can explain market concepts and help you evaluate a token. Live market data is not connected in this preview, so I won’t invent a current price or trending ranking." };
  }
  return { text: "I can help you understand crypto, review a portfolio, plan a swap or transfer, compare yield strategies, explore on-chain opportunities, and learn how things work. Live wallet data and transaction execution are not connected yet." };
}

export default function SonusWorkspace() {
  const [active, setActive] = useState<NavItem>("Overview");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("Demo workspace · No wallet connected");
  const [showChat, setShowChat] = useState(false);

  const total = useMemo(() => "$7,326.10", []);
  const nav: { label: NavItem; icon: typeof LayoutDashboard }[] = [
    { label: "Overview", icon: LayoutDashboard }, { label: "Trade", icon: ArrowDownUp },
    { label: "Portfolio", icon: Wallet }, { label: "Explore", icon: Compass },
    { label: "Yield", icon: TrendingUp }, { label: "Learn", icon: BookOpen },
    { label: "Activity", icon: Activity },
  ];

  function submitMessage(value = prompt) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const answer = answerFor(trimmed);
    setMessages((old) => [...old, { role: "user", text: trimmed }, { role: "assistant", text: answer.text, kind: answer.kind }]);
    setPrompt("");
    setShowChat(true);
    setNotice("AI preview · Actions require review");
  }

  function startVoice() {
    const SpeechRecognitionApi = (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setNotice("Voice input is not supported in this browser. Try Chrome or use the text box.");
      return;
    }
    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setNotice("Listening… speak naturally"); };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setPrompt(transcript);
      setListening(false);
      setNotice("Voice captured · Review the text before sending");
    };
    recognition.onerror = () => { setListening(false); setNotice("Couldn’t capture voice. Check microphone permission or type instead."); };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  const pageCopy: Record<NavItem, { title: string; sub: string }> = {
    Overview: { title: "Your crypto, in context.", sub: "A clearer view of your assets, activity, and what you can do next." },
    Trade: { title: "Trade by intention.", sub: "Describe a swap, transfer, or bridge. Review the plan before you act." },
    Portfolio: { title: "See the whole picture.", sub: "Understand your holdings, allocation, and portfolio changes." },
    Explore: { title: "Find your next move.", sub: "Explore assets and on-chain opportunities with context, not noise." },
    Yield: { title: "Make your assets work.", sub: "Compare yield ideas with risk, liquidity, and protocol context in mind." },
    Learn: { title: "Learn as you go.", sub: "Clear explanations for crypto, DeFi, and on-chain actions." },
    Activity: { title: "Every move, accounted for.", sub: "A history of plans, confirmations, and completed actions." },
  };

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <a href="/" className="workspace-brand"><span className="workspace-symbol"><i /><i /><i /></span><span>SONUS</span><small>V1 PREVIEW</small></a>
        <button className="workspace-switcher" onClick={() => setNotice("Workspace selector is a preview control.")}><span className="workspace-avatar">S</span><span><strong>Personal workspace</strong><small>Standard account</small></span><ChevronDown size={15} /></button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActive(label)} className={active === label ? "active" : ""}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Activity" && <span className="nav-count">0</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card"><span className="network-pulse" /><span><strong>Arc Network</strong><small>Planned first integration</small></span><span className="network-tag">SOON</span></div>
          <button className="side-utility" onClick={() => setNotice("Settings will be available when accounts and wallet integrations are connected.")}><Settings2 size={16} /> Settings</button>
          <button className="side-utility" onClick={() => setNotice("Sonus V1 is currently a local interaction preview.")}><CircleHelp size={16} /> Help & feedback</button>
          <div className="sidebar-user"><div className="user-avatar">G</div><span><strong>Guest user</strong><small>Preview mode</small></span><MoreHorizontal size={18} /></div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{active}</strong></div>
          <div className="topbar-actions"><span className="demo-pill"><i /> DEMO MODE</span><button aria-label="Search" className="icon-button" onClick={() => setNotice("Search is planned for a later iteration.")}><Search size={17} /></button><button className="connect-button" onClick={() => setNotice("Wallet connection is not enabled in this preview.")}><Wallet size={15} /> Connect wallet</button></div>
        </header>

        <div className="workspace-content">
          <div className="welcome-row"><div><div className="date-kicker">YOUR FINANCIAL SIGNAL <span>·</span> V1</div><h1>{pageCopy[active].title}</h1><p>{pageCopy[active].sub}</p></div><button className="quiet-button" onClick={() => { setActive("Activity"); setNotice("Activity log is empty in this demo."); }}><Clock3 size={15} /> View activity</button></div>

          <section className="command-card">
            <div className="command-head"><div className="command-orb"><AudioLines size={20} /></div><div><h2>What would you like to do?</h2><p>Speak or type naturally. Sonus will help you figure out the next step.</p></div><span className="command-ai"><Sparkles size={13} /> SONUS AI</span></div>
            <form className="command-input-wrap" onSubmit={(e) => { e.preventDefault(); submitMessage(); }}>
              <textarea aria-label="Ask Sonus" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); } }} placeholder="Try “Swap $50 USDC to ETH” or ask anything about crypto…" />
              <div className="command-tools"><span><Command size={13} /> Natural language</span><div><button type="button" className={listening ? "voice-button listening" : "voice-button"} onClick={startVoice} aria-label={listening ? "Listening" : "Use voice"}>{listening ? <MicOff size={17} /> : <Mic size={17} />}<span>{listening ? "Listening…" : "Use voice"}</span></button><button className="send-button" type="submit" disabled={!prompt.trim()} aria-label="Send prompt"><ArrowRight size={17} /></button></div></div>
            </form>
            <div className="starter-prompts">{starterPrompts.map((s) => <button key={s} onClick={() => submitMessage(s)}>{s}<ArrowUpRight size={12} /></button>)}</div>
            {showChat && <div className="chat-preview"><div className="chat-preview-head"><span><Sparkles size={14} /> Conversation</span><button onClick={() => { setMessages([]); setShowChat(false); setNotice("Demo workspace · No wallet connected"); }} aria-label="Clear conversation"><X size={15} /></button></div>{messages.map((m, i) => <div className={"chat-message " + m.role} key={i}><div className="chat-avatar">{m.role === "assistant" ? <AudioLines size={15} /> : "Y"}</div><div className="chat-bubble"><p>{m.text}</p>{m.kind === "plan" && <div className="plan-preview"><div><ShieldCheck size={15} /><span>Review required</span></div><strong>Preview only</strong><small>No wallet connected · Nothing will be sent</small></div>}</div></div>)}<form className="followup-form" onSubmit={(e) => { e.preventDefault(); submitMessage(); }}><input aria-label="Follow-up question" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask a follow-up…" /><button disabled={!prompt.trim()} aria-label="Send follow-up"><Send size={15} /></button></form></div>}
          </section>

          <div className="section-title-row"><div><h2>{active === "Overview" ? "Your overview" : active === "Portfolio" ? "Your assets" : active === "Trade" ? "Transaction workspace" : active === "Yield" ? "Yield watchlist" : active === "Explore" ? "Market explorer" : active === "Learn" ? "Learn the essentials" : "Recent activity"}</h2><p>{active === "Overview" ? "A snapshot of your demo portfolio." : "Illustrative V1 content · Live data is not connected."}</p></div><button className="text-action" onClick={() => setNotice("Live data providers will be connected in a later milestone.")}>View details <ArrowRight size={14} /></button></div>

          {active === "Overview" || active === "Portfolio" ? <>
            <div className="metrics-grid">
              <article className="metric-card portfolio-metric"><div className="metric-top"><span>PORTFOLIO VALUE</span><span className="metric-icon"><Wallet size={16} /></span></div><strong>{total}</strong><div className="metric-bottom"><span className="metric-neutral">Sample balance</span><span className="metric-note">DEMO DATA</span></div><div className="portfolio-sparkline" aria-hidden="true"><svg viewBox="0 0 300 48" preserveAspectRatio="none"><path d="M0 38 C18 33 20 38 38 28 S66 34 82 23 S112 27 132 18 S160 24 181 12 S215 22 232 13 S266 16 300 2" /></svg></div></article>
              <article className="metric-card"><div className="metric-top"><span>24H CHANGE</span><span className="metric-icon green"><TrendingUp size={16} /></span></div><strong className="metric-green">+$184.22</strong><div className="metric-bottom"><span className="metric-green">+2.58%</span><span className="metric-note">ILLUSTRATIVE</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>ASSETS HELD</span><span className="metric-icon"><Globe2 size={16} /></span></div><strong>03 <small>assets</small></strong><div className="metric-bottom"><span className="metric-neutral">Across demo holdings</span></div></article>
            </div>
            <section className="assets-card"><div className="card-heading"><div><h3>Assets</h3><p>Your holdings at a glance</p></div><button onClick={() => setActive("Portfolio")}>View portfolio <ArrowRight size={13} /></button></div><div className="asset-table"><div className="asset-table-head"><span>ASSET</span><span>BALANCE</span><span>VALUE</span><span>24H</span><span /></div>{assets.map((a) => <div className="asset-row" key={a.symbol}><div className="asset-name"><span className={"asset-mark " + a.symbol.toLowerCase()}>{a.mark}</span><span><strong>{a.name}</strong><small>{a.symbol}</small></span></div><span className="asset-balance">{a.amount} <small>{a.symbol}</small></span><strong className="asset-value">{a.value}</strong><span className="asset-change">{a.change}</span><button className="asset-more" aria-label={"More about " + a.name} onClick={() => { setPrompt("Explain " + a.name + " and its role in a portfolio"); setShowChat(true); }}> <ArrowUpRight size={15} /></button></div>)}</div><div className="table-footnote"><ShieldCheck size={13} /> Sample balances only. Connect a wallet and data provider for real holdings.</div></section>
          </> : active === "Trade" ? <div className="feature-grid"><Feature icon={ArrowDownUp} title="Swap assets" desc="Plan token swaps with route, price impact, fees, and slippage checks." action="Describe a swap" onClick={() => { setPrompt("Swap $50 USDC to ETH"); window.scrollTo({ top: 0, behavior: "smooth" }); }} /><Feature icon={ArrowDownLeft} title="Send or bridge" desc="Prepare a transfer or cross-chain route with destination checks." action="Plan a transfer" onClick={() => { setPrompt("Send 25 USDC to a recipient"); window.scrollTo({ top: 0, behavior: "smooth" }); }} /><Feature icon={ShieldCheck} title="Review before signing" desc="Clear transaction details and an explicit confirmation step before execution." action="Safety principles" onClick={() => setNotice("V1 rule: never sign or send anything without clear user review and authorization.")} /></div>
          : active === "Yield" ? <div className="feature-grid"><Feature icon={TrendingUp} title="Stablecoin yield" desc="Compare lending and vault strategies by APY, liquidity, and protocol risk. No live rates connected." action="Compare opportunities" onClick={() => submitMessage("Find yield opportunities for USDC")} /><Feature icon={Zap} title="Staking" desc="Understand lockups, validator risk, rewards, and unstaking conditions." action="Learn about staking" onClick={() => submitMessage("Explain staking risks and rewards")} /><Feature icon={ShieldCheck} title="Risk first" desc="Yield is never risk-free. Review smart-contract, liquidity, and market exposure." action="Review risks" onClick={() => submitMessage("What risks should I review before choosing a yield protocol?")} /></div>
          : active === "Explore" ? <div className="feature-grid"><Feature icon={TrendingUp} title="Token insights" desc="Explore token fundamentals, liquidity, volatility, and market context." action="Explore trending tokens" onClick={() => submitMessage("How should I evaluate a trending token?")} /><Feature icon={Compass} title="On-chain opportunities" desc="Learn about protocols and strategies across supported networks." action="Find opportunities" onClick={() => submitMessage("How do I evaluate an on-chain opportunity?")} /><Feature icon={Globe2} title="Cross-chain" desc="Understand bridges, wrapped assets, network fees, and destination risks." action="Explore bridging" onClick={() => submitMessage("Explain bridging and how to compare routes")} /></div>
          : active === "Learn" ? <div className="feature-grid"><Feature icon={BookOpen} title="Crypto basics" desc="Wallets, tokens, networks, gas fees, and self-custody explained clearly." action="Start learning" onClick={() => submitMessage("Teach me the basics of crypto wallets and networks")} /><Feature icon={ArrowDownUp} title="DeFi explained" desc="Understand swaps, liquidity pools, staking, lending, and yield." action="Learn DeFi" onClick={() => submitMessage("Explain DeFi in simple language")} /><Feature icon={ShieldCheck} title="Stay safe" desc="Recognize suspicious approvals, impersonation, malicious tokens, and risky links." action="Learn wallet safety" onClick={() => submitMessage("How do I keep a crypto wallet safe?")} /></div>
          : <section className="empty-activity"><div className="empty-icon"><Activity size={22} /></div><h3>No activity yet</h3><p>Your planned actions and transactions will appear here once connected integrations are enabled.</p><button onClick={() => setActive("Trade")}>Explore actions <ArrowRight size={14} /></button></section>}

          <div className="workspace-footnote"><span><ShieldCheck size={14} /> You stay in control. Actions should always be reviewed before authorization.</span><span>SONUS V1 · EARLY PREVIEW</span></div>
        </div>
        <div className="status-toast" role="status"><span className="toast-dot" />{notice}<button onClick={() => setNotice("Demo workspace · No wallet connected")} aria-label="Dismiss notification"><X size={13} /></button></div>
      </section>
    </main>
  );
}

type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
};

function Feature({ icon: Icon, title, desc, action, onClick }: { icon: typeof Wallet; title: string; desc: string; action: string; onClick: () => void }) {
  return <article className="feature-card"><span className="feature-icon"><Icon size={18} /></span><h3>{title}</h3><p>{desc}</p><button onClick={onClick}>{action}<ArrowRight size={14} /></button></article>;
}
