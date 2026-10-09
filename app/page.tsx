import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Fingerprint,
  LockKeyhole,
  MessageSquareText,
  Users,
  Wallet,
  Waypoints,
} from "lucide-react";
import DarkGradientBg from "@/components/ui/elegant-dark-pattern";

const steps = [
  { number: "01", title: "Describe it", detail: "Say what you need in plain language." },
  { number: "02", title: "Review it", detail: "Check the recipient, amount, and rules." },
  { number: "03", title: "Authorize it", detail: "Confirm securely through your wallet." },
];

const capabilities = [
  { icon: MessageSquareText, title: "Intent intelligence", detail: "Turn a request into a clear payment plan." },
  { icon: Fingerprint, title: "Recipient context", detail: "Resolve who you mean, not just an address." },
  { icon: Waypoints, title: "Payment memory", detail: "Keep useful context visible and editable." },
];

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Sonus home">
          <span className="sonus-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">SONUS</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
          <a href="#developers">Developers</a>
        </nav>
        <a className="header-link" href="#demo">Get started <ArrowUpRight size={14} /></a>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">Menu <span>＋</span></summary>
          <nav aria-label="Mobile navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
            <a href="#groups">Groups</a>
            <a href="#developers">Developers</a>
            <a href="#roadmap">Roadmap</a>
          </nav>
        </details>
      </header>

      <section className="hero-section" aria-labelledby="hero-title">
        <DarkGradientBg className="hero-background" />
        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-dot" /> SONUS · PAYMENT INTELLIGENCE</p>
          <h1 id="hero-title">Money should<br />understand <em>you.</em></h1>
          <p className="hero-description">Send crypto with a simple conversation. Sonus understands who you’re paying, why you’re paying, and what needs to happen before money moves.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#demo">Try Sonus <ArrowRight size={16} /></a>
            <a className="secondary-link" href="#product">Explore the platform <ArrowDownRight size={15} /></a>
          </div>
          <p className="trust-note"><span /> Built for clarity. Designed for control.</p>
        </div>
        <div className="hero-index"><span>SONUS / 001</span><span>INTENT → UNDERSTANDING → ACTION</span></div>
      </section>

      <section className="product-section section-wrap" id="product" aria-labelledby="product-title">
        <div className="section-copy">
          <p className="eyebrow">THE IDEA</p>
          <h2 id="product-title">Less wallet work.<br /><em>More human sense.</em></h2>
          <p>Sonus is being designed to turn natural language into payment actions you can understand and control.</p>
        </div>
        <div className="signal-visual" aria-hidden="true">
          <div className="signal-ring signal-ring-one" />
          <div className="signal-ring signal-ring-two" />
          <div className="signal-core"><span /><span /><span /><span /><span /></div>
          <span className="signal-caption">INTENT SIGNAL / 01</span>
        </div>
      </section>

      <section className="demo-section section-wrap" id="demo" aria-labelledby="demo-title">
        <div className="section-copy">
          <p className="eyebrow">A PAYMENT, MADE CLEAR</p>
          <h2 id="demo-title">From words<br />to <em>what matters.</em></h2>
          <p>A concept preview of how a request could become a structured payment plan.</p>
        </div>
        <div className="payment-preview">
          <div className="preview-topline"><span>SONUS / PAYMENT PLAN</span><span className="demo-pill">DEMO ONLY</span></div>
          <div className="preview-request"><span className="preview-label">YOUR REQUEST</span><p>“Send $100 to Alex for dinner.”</p></div>
          <div className="preview-fields">
            <div><span className="preview-label">RECIPIENT</span><strong>Alex</strong></div>
            <div><span className="preview-label">AMOUNT</span><strong>100.00 USDC</strong></div>
            <div><span className="preview-label">NETWORK</span><strong>Arc</strong></div>
            <div><span className="preview-label">CONTEXT</span><strong>Dinner</strong></div>
          </div>
          <div className="preview-state"><span className="state-icon"><Check size={14} /></span><div><strong>Ready for review</strong><small>Details prepared · No transaction sent</small></div><span className="state-tag">NOT AUTHORIZED</span></div>
          <p className="preview-disclaimer">Illustrative interface only. Recipient resolution, risk checks, and wallet authorization are not connected in this demo.</p>
        </div>
      </section>

      <section className="flow-section section-wrap" id="how-it-works" aria-labelledby="flow-title">
        <div className="section-heading-row">
          <div><p className="eyebrow">HOW IT WORKS</p><h2 id="flow-title">A simple conversation.<br /><em>You stay in control.</em></h2></div>
          <span className="section-count">01 — 03</span>
        </div>
        <div className="steps-list">
          {steps.map((step) => <div className="step-row" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.detail}</p><ArrowUpRight size={17} /></div>)}
        </div>
      </section>

      <section className="capabilities-section section-wrap" aria-labelledby="capabilities-title">
        <div className="section-copy">
          <p className="eyebrow">PAYMENT INTELLIGENCE</p>
          <h2 id="capabilities-title">Context is<br /><em>the difference.</em></h2>
        </div>
        <div className="capability-list">
          {capabilities.map(({ icon: Icon, title, detail }, index) => <div className="capability-row" key={title}><span className="capability-index">0{index + 1}</span><Icon size={20} strokeWidth={1.4} /><div><h3>{title}</h3><p>{detail}</p></div><ArrowUpRight size={15} className="capability-arrow" /></div>)}
          <div className="capability-row planned-row"><span className="capability-index">04</span><LockKeyhole size={20} strokeWidth={1.4} /><div><h3>Rules and risk checks</h3><p>Apply spending limits and review signals before authorization.</p></div><span className="planned-label">PLANNED</span></div>
        </div>
      </section>

      <section className="groups-section" id="groups" aria-labelledby="groups-title">
        <div className="groups-art" aria-hidden="true"><div className="group-orbit orbit-a" /><div className="group-orbit orbit-b" /><Users size={40} strokeWidth={1} /></div>
        <div className="groups-copy"><p className="eyebrow">SONUS GROUPS · PLANNED</p><h2 id="groups-title">Money moves<br /><em>better together.</em></h2><p>Coordinate shared expenses, payment requests, and group approvals without losing track of who owes what.</p><a className="text-link" href="#roadmap">Explore the roadmap <ArrowRight size={15} /></a></div>
      </section>

      <section className="security-section section-wrap" id="security" aria-labelledby="security-title">
        <div className="section-copy"><p className="eyebrow">BUILT FOR CONTROL</p><h2 id="security-title">AI prepares.<br /><em>You authorize.</em></h2><p>Sonus is designed to explain a transaction—not control your keys.</p></div>
        <div className="security-points"><div><Wallet size={19} /><span>Wallet authorization stays with you.</span></div><div><LockKeyhole size={19} /><span>Policies can define limits and approvals.</span></div><div><Check size={19} /><span>Review details before money moves.</span></div></div>
      </section>

      <section className="developers-section section-wrap" id="developers" aria-labelledby="developers-title">
        <div className="developers-copy"><p className="eyebrow">FOR BUILDERS · PLANNED</p><h2 id="developers-title">Payment context,<br /><em>in your product.</em></h2><p>A future integration layer for apps and agents that need payment intent, context, and controls.</p><a className="secondary-link" href="#roadmap">View roadmap <ArrowRight size={15} /></a></div>
        <div className="code-window" aria-label="Illustrative code sample"><div className="code-window-top"><span /><span /><span /><small>sonus / concept</small></div><pre><code><span className="code-muted">{"// Conceptual API — not live"}</span>{"\n"}<span className="code-key">const</span> payment = {"{"}{"\n"}  intent: <span className="code-string">"send"</span>,{"\n"}  recipient: <span className="code-string">"Alex"</span>,{"\n"}  amount: <span className="code-number">100</span>,{"\n"}  asset: <span className="code-string">"USDC"</span>{"\n"}{"}"}{";"}</code></pre></div>
      </section>

      <section className="roadmap-section section-wrap" id="roadmap" aria-labelledby="roadmap-title">
        <div><p className="eyebrow">WHAT’S NEXT</p><h2 id="roadmap-title">Built in stages.</h2></div>
        <p className="roadmap-note">Sonus is in development. These are planned milestones, not available features.</p>
        <div className="roadmap-line"><div><span>01</span><strong>Core payment flow</strong><small>Intent and transaction preview</small></div><div><span>02</span><strong>Rules and safety</strong><small>Policies and risk signals</small></div><div><span>03</span><strong>Groups and SDK</strong><small>Shared payments and integrations</small></div></div>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title"><div className="cta-light" aria-hidden="true" /><p className="eyebrow">SONUS · PAYMENT INTELLIGENCE</p><h2 id="final-cta-title">Make every payment<br /><em>make sense.</em></h2><p>More understanding. More context. More control.</p><a className="primary-link" href="#top">Get started <ArrowUpRight size={16} /></a></section>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand-column"><a className="brand-lockup" href="#top" aria-label="Sonus home"><span className="sonus-symbol" aria-hidden="true"><i /><i /><i /></span><span className="brand-name">SONUS</span></a><p>The intelligence layer<br />for crypto payments.</p><span className="footer-note">Built for clarity. Designed for control.</span></div>
          <div className="footer-links"><div><h3>PRODUCT</h3><a href="#product">Overview</a><a href="#how-it-works">How it works</a><a href="#demo">Payment preview</a><a href="#security">Security</a></div><div><h3>PLATFORM</h3><a href="#groups">Sonus Groups</a><a href="#developers">Developers</a><a href="#roadmap">Roadmap</a></div><div><h3>RESOURCES</h3><a href="#security">User control</a><a href="#demo">Demo disclaimer</a><a href="mailto:hello@sonus.example">Contact</a></div></div>
        </div>
        <div className="footer-bottom"><span>© 2026 SONUS</span><span>PAYMENT INTELLIGENCE</span><a href="#top">BACK TO TOP ↑</a></div>
        <div className="footer-wordmark" aria-label="Sonus">SONUS<span>.</span></div>
      </footer>
    </main>
  );
}
