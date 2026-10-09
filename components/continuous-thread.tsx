export default function ContinuousThread() {
  return (
    <svg className="continuous-thread" viewBox="0 0 1440 3400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="thread-gradient" x1="0" y1="0" x2="0.4" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#d6c39b" stopOpacity=".06" />
          <stop offset="20%" stopColor="#d6c39b" stopOpacity=".52" />
          <stop offset="48%" stopColor="#243bff" stopOpacity=".8" />
          <stop offset="72%" stopColor="#f5f6f8" stopOpacity=".38" />
          <stop offset="100%" stopColor="#d6c39b" stopOpacity=".12" />
        </linearGradient>
        <filter id="thread-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>
      <path className="thread-underlay" d="M1135 210 C1340 155 1390 370 1238 492 C1120 586 1050 655 1124 765 C1200 880 902 980 738 1065 C608 1133 662 1260 775 1320 C900 1388 814 1510 652 1587 C478 1670 476 1808 615 1870 C750 1930 1030 1900 1100 2054 C1182 2238 856 2302 733 2428 C605 2556 712 2690 923 2774 C1105 2848 1060 2990 876 3070 C710 3143 534 3175 624 3320" />
      <path className="thread-line" d="M1135 210 C1340 155 1390 370 1238 492 C1120 586 1050 655 1124 765 C1200 880 902 980 738 1065 C608 1133 662 1260 775 1320 C900 1388 814 1510 652 1587 C478 1670 476 1808 615 1870 C750 1930 1030 1900 1100 2054 C1182 2238 856 2302 733 2428 C605 2556 712 2690 923 2774 C1105 2848 1060 2990 876 3070 C710 3143 534 3175 624 3320" />
      <path className="thread-echo" d="M1148 218 C1350 163 1400 376 1247 500 C1130 594 1060 663 1134 773 C1210 888 912 988 748 1073 C618 1141 672 1268 785 1328 C910 1396 824 1518 662 1595 C488 1678 486 1816 625 1878 C760 1938 1040 1908 1110 2062 C1192 2246 866 2310 743 2436 C615 2564 722 2698 933 2782 C1115 2856 1070 2998 886 3078 C720 3151 544 3183 634 3328" />
    </svg>
  );
}
