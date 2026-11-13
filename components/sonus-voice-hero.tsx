"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, AudioLines, ChevronDown, Command, Mic, Paperclip, Plus, Send, Sparkles } from "lucide-react";

const BACKDROP = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/35281788-af1d-4637-b2bf-24ebe55f11bb.png";
const PROFILE = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/b5703dce-12a2-4177-8b07-8c158121d986.png";

function VoiceEqualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = document.documentElement.animate(
      [{ opacity: 1 }, { opacity: 1 }],
      { duration: 1_000_000_000, iterations: Infinity },
    );
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let frame = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(40, Math.floor(width / 8));
      rows = Math.max(10, Math.floor(height / 8));
    };

    const draw = () => {
      if (!running) return;
      const t = Number(clock.currentTime || 0) / 1000;
      context.clearRect(0, 0, width, height);
      const cell = width / columns;
      const dot = Math.max(1.6, Math.min(3.2, cell * 0.42));
      const center = columns * 0.53;
      const phrase = t % 4.1;
      const speaking = phrase < 2.35;
      const phraseStrength = speaking ? 0.58 + 0.42 * Math.sin(Math.PI * phrase / 2.35) : 0;
      const micPulse = reduced ? 0 : phraseStrength * (0.28 + 0.72 * Math.pow(Math.max(0, Math.sin((Math.max(0, phrase) * 6.2) * Math.PI)), 1.6));
      canvas.closest(".sonus-voice-page")?.style.setProperty("--voice-level", micPulse.toFixed(3));
      for (let x = 0; x < columns; x++) {
        const distance = Math.abs(x - center) / columns;
        const delay = distance * 0.32;
        const local = Math.max(0, phrase - delay);
        const syllable = Math.pow(Math.max(0, Math.sin((local * 6.2 + Math.sin(x * 0.12) * 0.32) * Math.PI)), 1.8);
        const spectral = 0.5 + 0.5 * Math.sin(t * 2.1 + x * 0.085);
        const ripple = Math.max(0, Math.sin(t * 3.1 - distance * 11));
        const energy = reduced ? 0 : phraseStrength * (0.22 + syllable * 0.7) * (0.7 + spectral * 0.3) + ripple * 0.08;
        const base = 2.1 + 1.7 * (0.5 + 0.5 * Math.sin(x * 0.065 + 0.8));
        const count = Math.min(rows - 1, Math.round(base + energy * 5.5));
        const slant = Math.round((x / columns) * 2);
        for (let y = 0; y < count; y++) {
          const progress = y / rows;
          const alpha = Math.min(0.94, 0.2 + progress * 0.62 + energy * 0.15);
          const hue = 187 + progress * 8;
          context.fillStyle = `hsla(${hue}, 83%, ${76 + progress * 13}%, ${alpha})`;
          const px = x * cell + (cell - dot) / 2;
          const py = height - (y + 1 + slant * 0.18) * (height / rows);
          context.fillRect(px, py, dot, dot);
        }
      }
      frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draw();
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        draw();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      clock.cancel();
    };
  }, []);

  return <canvas ref={canvasRef} className="voice-equalizer" aria-hidden="true" />;
}

export default function SonusVoiceHero() {
  return (
    <main className="sonus-voice-page">
      <div className="voice-sky" aria-hidden="true">
        <div className="voice-sky-top" />
        <div className="voice-sky-middle" />
        <div className="voice-sky-bottom" />
        <div className="voice-horizon-glow" />
      </div>
      <VoiceEqualizer />
      <img className="voice-profile" src={PROFILE} alt="" />

      <header className="voice-nav">
        <a className="voice-brand" href="/" aria-label="Sonus home">
          <span className="voice-brand-mark"><i /><i /><i /></span>
          <span>sonus</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#product">Product <ChevronDown size={13} /></a>
          <a href="#developers">Developers</a>
          <a href="#resources">Resources</a>
          <a href="#use-cases">Use cases</a>
        </nav>
        <a className="voice-nav-cta" href="/app">Open Sonus <ArrowUpRight size={15} /></a>
        <button className="voice-menu" aria-label="Open menu"><span /><span /></button>
      </header>

      <section className="voice-hero-copy">
        <p className="voice-kicker"><span /> PAYMENT INTELLIGENCE, IN A NATURAL VOICE</p>
        <h1>Payments that understand<br /><em>what you mean.</em></h1>
        <p className="voice-subline">Sonus brings language, recipient identity, and payment context together, so every transaction is clear before you authorize it.</p>
        <div className="voice-actions">
          <a className="voice-button-primary" href="/app">Try Sonus <ArrowUpRight size={16} /></a>
          <a className="voice-button-quiet" href="#product">Explore the platform</a>
        </div>
      </section>

      <div className="voice-card create-agent-card">
        <div className="voice-card-heading">
          <span className="mini-sonus-mark"><i /><i /><i /></span>
          <span><strong>Create Agent</strong><small>Payment assistant</small></span>
          <span className="voice-card-status" />
        </div>
        <div className="voice-field"><span>Select model</span><ChevronDown size={14} /></div>
        <button className="voice-deploy">Configure agent <ArrowUpRight size={14} /></button>
      </div>

      <div className="voice-card chat-card">
        <div className="chat-card-top">
          <span className="chat-avatar"><AudioLines size={15} /></span>
          <span><strong>Sonus assistant</strong><small>Payment context ready</small></span>
          <span className="chat-tools"><Plus size={15} /><Paperclip size={15} /><Command size={15} /></span>
        </div>
        <div className="chat-bubble">I’ve prepared the payment details. Check the recipient and amount before you authorize.</div>
        <div className="chat-input"><span>Ask Sonus to prepare a payment…</span><Send size={14} /></div>
        <button className="chat-mic" aria-label="Voice input"><Mic size={17} /></button>
        <span className="chat-card-foot"><Sparkles size={11} /> Your keys. Your approval.</span>
      </div>

      <div className="voice-bottom-note"><span>01 / 03</span><span>UNDERSTAND&nbsp; · &nbsp;PREPARE&nbsp; · &nbsp;AUTHORIZE</span></div>
    </main>
  );
}
