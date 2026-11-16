// Original abstract artwork for the landing page shelf. No real covers.
import type { ReactNode } from "react";

const ART: ReactNode[] = [
  <>
    <rect width="100" height="100" fill="#1c3557" />
    <circle cx="66" cy="38" r="25" fill="#efbf4a" />
    <rect x="0" y="74" width="100" height="3" fill="#efe9dc" />
    <rect x="0" y="81" width="100" height="1.2" fill="#efe9dc" />
  </>,
  <>
    <rect width="100" height="100" fill="#e9e3d5" />
    <rect x="12" y="14" width="76" height="13" fill="#151413" />
    <rect x="12" y="32" width="52" height="13" fill="#151413" />
    <rect x="12" y="50" width="30" height="13" fill="#151413" />
    <rect x="76" y="76" width="12" height="12" fill="#d9442a" />
  </>,
  <>
    <rect width="100" height="100" fill="#c5412a" />
    {[42, 34, 26, 18, 10].map((r) => (
      <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#f1e7d3" strokeWidth="2.2" />
    ))}
  </>,
  <>
    <rect width="100" height="100" fill="#121212" />
    {Array.from({ length: 13 }, (_, i) => (
      <line key={i} x1={-20 + i * 11} y1="100" x2={30 + i * 11} y2="0" stroke="#e8e4da" strokeWidth="0.7" />
    ))}
    <circle cx="74" cy="72" r="7" fill="#efbf4a" />
  </>,
  <>
    <rect width="100" height="100" fill="#2c6650" />
    <path d="M10 100a40 40 0 0 1 80 0z" fill="#efe6d2" />
    <circle cx="50" cy="30" r="5" fill="#efe6d2" />
  </>,
  <>
    <rect width="100" height="100" fill="#efb6a4" />
    <path d="M14 86 50 18l36 68z" fill="#23408e" />
    <path d="M100 100H56a44 44 0 0 1 44-44z" fill="#151413" />
  </>,
  <>
    <rect width="100" height="100" fill="#e6e2d9" />
    {Array.from({ length: 49 }, (_, i) => (
      <circle key={i} cx={14 + (i % 7) * 12} cy={14 + Math.floor(i / 7) * 12} r={i === 24 ? 4.5 : 1.6} fill={i === 24 ? "#d9442a" : "#151413"} />
    ))}
  </>,
  <>
    <rect width="100" height="100" fill="#35263f" />
    <circle cx="50" cy="56" r="30" fill="#ef7d3a" />
    {[52, 60, 68, 76, 84].map((y, i) => (
      <rect key={y} x="0" y={y} width="100" height={2 + i * 1.2} fill="#35263f" />
    ))}
  </>,
  <>
    <rect width="100" height="100" fill="#d7a23c" />
    <rect x="18" y="18" width="38" height="64" fill="#151413" />
    <circle cx="64" cy="50" r="18" fill="#f4efe4" />
  </>,
  <>
    <rect width="100" height="100" fill="#0e4a59" />
    {[24, 36, 48, 60, 72].map((y) => (
      <path key={y} d={`M0 ${y}q12.5-9 25 0t25 0 25 0 25 0`} fill="none" stroke="#efe6d2" strokeWidth="1.6" />
    ))}
  </>,
  <>
    <rect width="100" height="100" fill="#f3efe6" />
    <rect x="22" y="0" width="9" height="100" fill="#d9442a" />
    <circle cx="62" cy="62" r="20" fill="#151413" />
  </>,
  <>
    <rect width="100" height="100" fill="#74202b" />
    <path d="M50 14 84 50 50 86 16 50z" fill="#f0e2c8" />
    <path d="M50 34 66 50 50 66 34 50z" fill="#74202b" />
  </>,
];

export function DemoShelf() {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-6" aria-hidden>
      {ART.map((art, i) => (
        <div key={i} className={`tile ${i >= 9 ? "hidden sm:block" : ""}`} style={i === 2 || i === 9 ? { zIndex: 5 } : undefined}>
          <div className="sleeve">
            <div className={`wax ${i === 2 || i === 9 ? "wax-out" : ""}`} />
            <div className="sleeve-art">
              <svg viewBox="0 0 100 100" className="block h-full w-full">
                {art}
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
