"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 1450;

type Particle = { x: number; y: number; z: number; size: number; hue: number; phase: number };

export default function ParticleOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let time = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = true;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = Math.PI * (3 - Math.sqrt(5)) * index;
      return {
        x: Math.cos(angle) * ring,
        y,
        z: Math.sin(angle) * ring,
        size: 0.45 + ((index * 17) % 11) / 10,
        hue: index % 11 === 0 ? 1 : index % 7 === 0 ? 2 : 0,
        phase: (index % 97) / 97,
      };
    });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      if (!ctx || !width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const radius = Math.min(width, height) * 0.355;
      const turn = time * 0.12 + pointerX * 0.25;
      const tilt = pointerY * 0.18 + Math.sin(time * 0.21) * 0.035;
      const cosT = Math.cos(turn);
      const sinT = Math.sin(turn);
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.15);
      glow.addColorStop(0, "rgba(36,59,255,0.14)");
      glow.addColorStop(0.42, "rgba(36,59,255,0.055)");
      glow.addColorStop(1, "rgba(36,59,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-0.22 + pointerX * 0.06);
      ctx.strokeStyle = "rgba(211,220,255,0.17)";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.02, radius * 0.34, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(36,59,255,0.24)";
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.98, radius * 0.27, 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const projected = particles.map((particle) => {
        const x1 = particle.x * cosT - particle.z * sinT;
        const z1 = particle.x * sinT + particle.z * cosT;
        const y1 = particle.y * cosTilt - z1 * sinTilt;
        const z2 = particle.y * sinTilt + z1 * cosTilt;
        const breathe = 1 + Math.sin(time * 0.65 + particle.phase * Math.PI * 2) * 0.008;
        return { x: centerX + x1 * radius * breathe, y: centerY + y1 * radius * breathe, z: z2, size: particle.size, hue: particle.hue };
      }).sort((a, b) => a.z - b.z);

      for (const point of projected) {
        const depth = (point.z + 1) * 0.5;
        const alpha = 0.12 + depth * 0.74;
        ctx.fillStyle = point.hue === 1
          ? "rgba(88,111,255," + alpha + ")"
          : point.hue === 2
            ? "rgba(218,202,167," + (alpha * 0.68) + ")"
            : "rgba(235,239,255," + alpha + ")";
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size * (0.55 + depth * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      const core = ctx.createRadialGradient(centerX - radius * 0.12, centerY - radius * 0.16, 0, centerX, centerY, radius * 0.55);
      core.addColorStop(0, "rgba(43,65,255,0.08)");
      core.addColorStop(0.6, "rgba(9,14,42,0.02)");
      core.addColorStop(1, "rgba(8,10,15,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
    };

    const animate = () => {
      if (!visible) return;
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      if (!reduceMotion) time += 0.012;
      draw();
      if (!reduceMotion) frame = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const onPointerLeave = () => { targetX = 0; targetY = 0; };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion) { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(animate); }
      else window.cancelAnimationFrame(frame);
    }, { threshold: 0.05 });

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    observer.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    resize();
    if (!reduceMotion) frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      observer.disconnect();
    };
  }, []);

  return <div className="particle-orb" aria-label="Animated particle orb representing the Sonus voice interface" role="img"><canvas ref={canvasRef} /></div>;
}
