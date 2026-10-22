import React from 'react';

interface MascotProps {
  className?: string;
  size?: number;
  speaking?: boolean;
}

export const MascotIllustration: React.FC<MascotProps> = ({
  className = '',
  size = 120,
  speaking = false
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        className={`w-full h-full drop-shadow-md transition-transform duration-300 ${
          speaking ? 'scale-105' : 'scale-100'
        }`}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="hoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>

          <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Hood Body */}
        <path
          d="M40 85 C35 50, 50 25, 80 25 C110 25, 125 50, 120 85 C122 105, 110 135, 80 135 C50 135, 38 105, 40 85 Z"
          fill="url(#hoodGrad)"
        />

        {/* Small cute hood ears / tufts */}
        <path d="M46 36 C40 24, 52 20, 58 28 Z" fill="#ea580c" />
        <path d="M114 36 C120 24, 108 20, 102 28 Z" fill="#ea580c" />

        {/* White Inner Face Opening */}
        <ellipse cx="80" cy="72" rx="30" ry="26" fill="url(#faceGrad)" />

        {/* Rosy Cheeks */}
        <circle cx="59" cy="76" r="4.5" fill="#fda4af" opacity="0.8" />
        <circle cx="101" cy="76" r="4.5" fill="#fda4af" opacity="0.8" />

        {/* Cute Big Eyes */}
        <ellipse cx="68" cy="67" rx="4.5" ry="5.5" fill="#0f172a" />
        <circle cx="66.5" cy="65" r="1.8" fill="#ffffff" />

        <ellipse cx="92" cy="67" rx="4.5" ry="5.5" fill="#0f172a" />
        <circle cx="90.5" cy="65" r="1.8" fill="#ffffff" />

        {/* Big Happy Open Smile (matching screenshot) */}
        <path
          d="M68 76 Q80 94 92 76 Z"
          fill="#0f172a"
        />
        {/* Cute Single Upper Tooth */}
        <path
          d="M77 76 L77 80 Q80 81 83 80 L83 76 Z"
          fill="#ffffff"
        />
        {/* Pink Tongue */}
        <path
          d="M74 86 Q80 93 86 86 Z"
          fill="#fb7185"
        />

        {/* Belly Patch (Yellow scarf/bib) */}
        <path
          d="M64 105 Q80 118 96 105 Q98 122 80 125 Q62 122 64 105 Z"
          fill="url(#bellyGrad)"
        />
        <path
          d="M74 108 L80 114 L86 108"
          stroke="#ea580c"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Little Feet */}
        <ellipse cx="66" cy="133" rx="7" ry="4" fill="#0f172a" />
        <ellipse cx="94" cy="133" rx="7" ry="4" fill="#0f172a" />

        {/* Little Hands */}
        <ellipse cx="44" cy="98" rx="5" ry="4" fill="#ea580c" />
        <ellipse cx="116" cy="98" rx="5" ry="4" fill="#ea580c" />
      </svg>
    </div>
  );
};

