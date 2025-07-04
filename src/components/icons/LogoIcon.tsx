import type { SVGProps } from 'react';

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      aria-label="Logotipo do DuelVerse"
      {...props}
    >
      <defs>
        <linearGradient id="iconGradient" x1="0" y1="0" x2="1" y2="1">
           {/* Using colors from the theme: accent to primary */}
           <stop offset="0%" stopColor="#7E57C2" />
           <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      {/* Background shape */}
      <rect width="100" height="100" rx="22" fill="url(#iconGradient)" />

      {/* Foreground shape suggesting two cards overlapping */}
      <g transform="rotate(-15 50 50) translate(0, 2)">
          {/* Back card with transparency */}
          <rect 
            x="20" y="25" 
            width="50" height="65" 
            rx="8" 
            fill="white" 
            fillOpacity="0.2"
            stroke="white"
            strokeWidth="2"
            strokeOpacity="0.5"
            />
          {/* Front card, solid */}
          <rect 
            x="30" y="15" 
            width="50" height="65" 
            rx="8" 
            fill="white" 
            fillOpacity="0.9"
            stroke="white"
            strokeWidth="2"
            />
      </g>
    </svg>
  );
}
