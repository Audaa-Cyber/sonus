import type { ReactNode } from "react";

type DarkGradientBgProps = {
  children?: ReactNode;
  className?: string;
};

export default function DarkGradientBg({ children, className = "" }: DarkGradientBgProps) {
  return (
    <div className={`dark-gradient-bg ${className}`} aria-hidden={children ? undefined : true}>
      <div className="dark-gradient-radial" />
      <svg className="dark-gradient-streaks" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="signal-streak" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#72d8f5" stopOpacity="0" />
            <stop offset="42%" stopColor="#72d8f5" stopOpacity=".25" />
            <stop offset="100%" stopColor="#72d8f5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-120 300 L480 -100" />
        <path d="M-80 420 L640 -60" />
        <path d="M160 940 L930 -100" />
        <path d="M650 980 L1290 0" />
        <path d="M990 980 L1530 220" />
      </svg>
      <div className="dark-gradient-grain" />
      <div className="dark-gradient-dots" />
      {children ? <div className="dark-gradient-content">{children}</div> : null}
    </div>
  );
}
