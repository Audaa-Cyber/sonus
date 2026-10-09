export default function BirdFlock() {
  const birds = Array.from({ length: 47 }, (_, index) => {
    const t = index / 46;
    const x = 74 + t * 630 + Math.sin(t * 8.4) * 20;
    const y = 142 + Math.sin(t * 8.8) * 43 - t * 67 + Math.cos(t * 15) * 8;
    const scale = 0.28 + ((index * 13) % 9) / 20;
    const rotate = -19 + Math.sin(t * 5.7) * 22;
    const opacity = 0.22 + ((index * 7) % 8) / 12;
    return { x, y, scale, rotate, opacity, index };
  });

  return (
    <svg className="bird-flock" viewBox="0 0 760 300" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bird-fade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5f6f8" /><stop offset="100%" stopColor="#d6c39b" /></linearGradient>
      </defs>
      {birds.map((bird) => (
        <g key={bird.index} transform={"translate(" + bird.x + " " + bird.y + ") rotate(" + bird.rotate + ") scale(" + bird.scale + ")"} opacity={bird.opacity} fill="none" stroke="url(#bird-fade)" strokeWidth="2.3" strokeLinecap="round">
          <path d="M-19 2 Q-8 -10 0 1 Q8 -10 19 2" />
          <path d="M-9 1 Q-4 -1 0 4 Q4 -1 9 1" strokeWidth="1.2" opacity=".6" />
        </g>
      ))}
    </svg>
  );
}
