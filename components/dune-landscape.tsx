export default function DuneLandscape() {
  return (
    <svg className="dune-landscape" viewBox="0 0 1440 430" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dune-back" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor="#9c8967" /><stop offset="100%" stopColor="#5f523f" /></linearGradient>
        <linearGradient id="dune-mid" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0%" stopColor="#d7c59f" /><stop offset="100%" stopColor="#a28d68" /></linearGradient>
        <linearGradient id="dune-front" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d4c29d" /><stop offset="60%" stopColor="#b6a17a" /><stop offset="100%" stopColor="#887655" /></linearGradient>
        <filter id="dune-grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 .07" /></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light" /></filter>
      </defs>
      <path d="M0 215 C170 160 260 242 410 184 S670 110 800 188 S1050 256 1170 176 S1340 158 1440 114 L1440 430 L0 430 Z" fill="url(#dune-back)" opacity=".56" />
      <path d="M0 283 C170 198 294 272 435 236 C608 191 704 124 853 201 C1008 282 1136 305 1264 235 C1342 192 1400 197 1440 214 L1440 430 L0 430 Z" fill="url(#dune-mid)" opacity=".83" />
      <path d="M0 338 C146 267 288 310 420 286 C590 254 682 213 834 279 C1010 355 1130 372 1274 310 C1352 276 1404 280 1440 292 L1440 430 L0 430 Z" fill="url(#dune-front)" />
      <g fill="none" stroke="#f1e5ca" strokeWidth="1" opacity=".22">
        <path d="M-20 354 C165 285 288 336 442 308 S680 250 842 309 S1140 401 1450 305" />
        <path d="M-20 370 C164 302 295 352 450 324 S685 268 847 325 S1146 417 1450 321" />
        <path d="M-20 387 C160 321 300 369 460 341 S692 286 852 342 S1150 431 1450 338" />
        <path d="M-20 405 C160 341 310 386 466 359 S700 305 860 360 S1157 445 1450 356" />
        <path d="M80 430 C270 370 370 407 530 388 S730 347 890 390 S1170 450 1370 393" />
      </g>
      <path d="M0 0 H1440 V430 H0 Z" fill="#d2c09b" opacity=".08" filter="url(#dune-grain)" />
    </svg>
  );
}
