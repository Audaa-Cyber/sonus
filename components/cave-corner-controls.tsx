"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type AmbientAudio = { context: AudioContext; gain: GainNode; source: AudioBufferSourceNode };

export default function CaveCornerControls() {
  const audio = useRef<AmbientAudio | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    setAvailable(typeof window !== "undefined" && "AudioContext" in window);
    return () => {
      const current = audio.current;
      if (!current) return;
      try { current.source.stop(); } catch { /* The source may already be stopped during teardown. */ }
      void current.context.close();
      audio.current = null;
    };
  }, []);

  async function toggleSound() {
    if (!available) return;
    const next = !enabled;
    try {
      if (!audio.current) {
        const context = new AudioContext();
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .65;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const highPass = context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 90;
        const lowPass = context.createBiquadFilter();
        lowPass.type = "lowpass";
        lowPass.frequency.value = 430;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(highPass).connect(lowPass).connect(gain).connect(context.destination);
        source.start();
        audio.current = { context, gain, source };
      }
      const current = audio.current;
      await current.context.resume();
      current.gain.gain.setTargetAtTime(next ? .018 : 0, current.context.currentTime, .5);
      setEnabled(next);
    } catch {
      setEnabled(false);
    }
  }

  return (
    <div className="cave-corner-controls">
      <span>Scroll to wander</span>
      <i aria-hidden="true" />
      <button type="button" onClick={toggleSound} aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"} aria-pressed={enabled} disabled={!available} title={available ? "Ambient sound" : "Audio unavailable"}>
        {enabled ? <Volume2 size={19} strokeWidth={1.5} /> : <VolumeX size={19} strokeWidth={1.5} />}
      </button>
    </div>
  );
}
