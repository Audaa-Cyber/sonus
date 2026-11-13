"use client";

import { useEffect, useRef } from "react";

/**
 * Image-based 2.5D cave environment. The supplied cave photograph is the
 * source plate; a depth-like camera shift, atmospheric motes and flower
 * sprites add motion without pretending a single photo is a full 3D asset.
 */
export default function FernCaveScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    const count = reduceMotion ? 0 : mobile ? 34 : 76;
    const motes = Array.from({ length: count }, (_, i) => ({
      x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75,
      r: .5 + Math.random() * 1.8, phase: Math.random() * Math.PI * 2,
      speed: .08 + Math.random() * .24, flower: i % 5 === 0,
    }));
    let width = 0, height = 0, raf = 0, pointerX = 0, pointerY = 0;
    let targetX = 0, targetY = 0, scroll = 0, last = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      width = canvas.clientWidth; height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = (e: PointerEvent) => {
      targetX = (e.clientX / Math.max(1, window.innerWidth) - .5) * 2;
      targetY = (e.clientY / Math.max(1, window.innerHeight) - .5) * 2;
    };
    const onScroll = () => { scroll = Math.min(1, window.scrollY / Math.max(1, window.innerHeight)); };
    const draw = (time: number) => {
      const dt = Math.min(.05, (time - last) / 1000 || .016); last = time;
      pointerX += (targetX - pointerX) * .035;
      pointerY += (targetY - pointerY) * .035;
      ctx.clearRect(0, 0, width, height);
      for (const p of motes) {
        p.y -= p.speed * dt * .035;
        if (p.y < -.03) { p.y = 1.03; p.x = Math.random(); }
        const drift = Math.sin(time * .00025 + p.phase) * 9;
        const x = p.x * width + pointerX * (1 - p.z) * -18 + drift;
        const y = p.y * height + pointerY * (1 - p.z) * -12 - scroll * 18;
        const alpha = (.12 + .35 * (.5 + .5 * Math.sin(time * .001 + p.phase))) * p.z;
        ctx.globalAlpha = alpha;
        if (p.flower) {
          ctx.fillStyle = "#e9a5b5";
          ctx.shadowColor = "#e58ba7"; ctx.shadowBlur = 10 * p.z;
          for (let k = 0; k < 5; k++) {
            const a = k * Math.PI * 2 / 5;
            ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * p.r * 1.7, y + Math.sin(a) * p.r * 1.7, p.r, p.r * 1.45, a, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = "#f5dca8"; ctx.beginPath(); ctx.arc(x, y, p.r * .55, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#f6dcae"; ctx.shadowColor = "#ffdca0"; ctx.shadowBlur = 8 * p.z;
          ctx.beginPath(); ctx.arc(x, y, p.r * p.z, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!reduceMotion) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener("pointermove", move); window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <div className="fern-cave-scene" aria-hidden="true">
    <div className="fern-cave-photo" />
    <div className="fern-cave-depth fern-cave-depth-back" />
    <div className="fern-cave-depth fern-cave-depth-front" />
    <canvas ref={canvasRef} className="fern-cave-particles" />
    <div className="fern-cave-light" />
    <div className="fern-cave-grain" />
  </div>;
}
