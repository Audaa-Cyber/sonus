import { ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines } from "lucide-react";
import ParticleOrb from "@/components/particle-orb";
import BirdFlock from "@/components/bird-flock";
import DuneLandscape from "@/components/dune-landscape";
import ContinuousThread from "@/components/continuous-thread";
import Feather from "@/components/feather";

const principles = [
  { number: "01", title: "Intent", copy: "Say what you mean." },
  { number: "02", title: "Context", copy: "Know what happens next." },
  { number: "03", title: "Control", copy: "Stay in charge of every move." },
];

export default function Home() {
  return (
    <main className="site-shell" id="top">
      <ContinuousThread />

      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Sonus home">
          <span className="sonus-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">SONUS</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#approach">Approach</a>
          <a href="#experience">Experience</a>
        </nav>
        <a className="header-link" href="#experience">Enter Sonus <ArrowUpRight size={14} strokeWidth={1.6} /></a>
      </header>

      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-atmosphere" aria-hidden="true" />
        <BirdFlock />
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> PAYMENT INTELLIGENCE, REIMAGINED</p>
          <h1 id="hero-title">Money,<br /><em>understood.</em></h1>
          <p className="hero-description">Speak naturally. See what happens.<br className="desktop-break" /> Stay in control.</p>
          <a className="primary-link" href="#experience">Meet Sonus <ArrowRight size={16} strokeWidth={1.7} /></a>
          <div className="hero-footnote"><span className="footnote-line" /> A clearer signal for moving money</div>
        </div>
        <div className="orb-composition">
          <div className="orb-caption orb-caption-top"><span>01 / INTENT</span><span>LIVE SYSTEM</span></div>
          <ParticleOrb />
          <div className="orb-caption orb-caption-bottom"><AudioLines size={15} strokeWidth={1.5} /><span>Listen for what matters.</span></div>
        </div>
        <DuneLandscape />
        <div className="hero-index"><span>SONUS / 001</span><span>MADE FOR HUMAN INTENT</span></div>
      </section>

      <section className="brand-reveal" aria-label="Sonus brand statement">
        <div className="brand-reveal-inner">
          <Feather />
          <p className="brand-overline">A DIFFERENT KIND OF FINANCIAL INTERFACE</p>
          <h2 className="sonus-wordmark">SONUS<span className="wordmark-period">.</span></h2>
          <p className="brand-statement">Sound becomes signal.<br />Signal becomes action.</p>
        </div>
        <span className="section-index">S / 02</span>
      </section>

      <section className="approach-section" id="approach" aria-labelledby="approach-title">
        <div className="approach-heading">
          <p className="eyebrow">THE PRINCIPLE</p>
          <h2 id="approach-title">Less friction.<br /><em>More understanding.</em></h2>
        </div>
        <div className="principle-list">
          {principles.map((item) => (
            <div className="principle-row" key={item.number}>
              <span className="principle-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <ArrowDownRight className="principle-arrow" size={17} strokeWidth={1.4} />
            </div>
          ))}
        </div>
        <p className="approach-aside">A payment should feel as clear as the intention behind it.</p>
      </section>

      <section className="experience-section" id="experience" aria-labelledby="experience-title">
        <div className="experience-copy">
          <p className="eyebrow">BEFORE MONEY MOVES</p>
          <h2 id="experience-title">Your intent.<br /><em>Made tangible.</em></h2>
          <p>Sonus brings the important details into focus, before a payment is authorized.</p>
          <a className="text-link" href="#top">Back to the signal <ArrowUpRight size={15} strokeWidth={1.5} /></a>
        </div>
        <div className="payment-preview" aria-label="Illustrative payment preview">
          <div className="preview-topline"><span className="preview-status"><i /> PREVIEW</span><span>PAYMENT PLAN / 001</span></div>
          <div className="preview-request">
            <span className="preview-label">YOU SAID</span>
            <p>“Send $100 to Alex.”</p>
          </div>
          <div className="preview-divider"><span /><span /><span /></div>
          <div className="preview-recipient">
            <div className="recipient-monogram">A</div>
            <div><span className="preview-label">RECIPIENT</span><strong>Alex Morgan</strong><small>Recognized contact</small></div>
            <span className="verified-mark">✓</span>
          </div>
          <div className="preview-amount"><span className="preview-label">PAYMENT AMOUNT</span><strong>$100<span>.00</span></strong><small>USDC · illustrative preview</small></div>
          <div className="preview-bottom"><span><i /> Details ready to review</span><span>NOT SENT</span></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-topline"><span>THE FUTURE SHOULD FEEL HUMAN.</span><span>SONUS / END TRANSMISSION</span></div>
        <div className="footer-main">
          <div><p className="footer-kicker">A clearer way forward.</p><h2>Let intent<br /><em>lead the way.</em></h2></div>
          <a className="footer-cta" href="#top" aria-label="Return to top"><ArrowUpRight size={25} strokeWidth={1.4} /></a>
        </div>
        <div className="footer-bottom"><a className="footer-brand" href="#top">SONUS<span>.</span></a><span>PAYMENT INTELLIGENCE</span><span>© SONUS 2026</span></div>
      </footer>
    </main>
  );
}
