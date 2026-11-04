import React from 'react';

// The logo: a row of overlapping checkpoints like the ones on the map, each a
// country's flag in a circle on a stem above its city dot
export function Logo({ flags }: { flags: React.ReactNode[] }) {
  const step = 15;
  return (
    <svg viewBox={`0 0 ${24 + step * (flags.length - 1)} 38`} className="h-10 w-auto shrink-0" aria-hidden>
      <defs>
        <clipPath id="logo-head">
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      {flags.map((flag, index) => (
        <g key={index} transform={`translate(${index * step})`}>
          <path d="M12 22v11" stroke="#fff" strokeWidth="2" />
          <circle cx="12" cy="34" r="3" fill="#fff" />
          <g clipPath="url(#logo-head)">
            {React.cloneElement(flag as React.ReactElement<React.SVGProps<SVGSVGElement>>, {
              x: -2,
              y: 1,
              width: 28,
              height: 22,
              className: undefined,
              preserveAspectRatio: 'none',
            })}
          </g>
          <circle cx="12" cy="12" r="11" fill="none" stroke="#fff" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
