'use client';

import { useId } from 'react';

const COUNTRY_TO_CODE: Record<string, string> = {
  'Monaco': 'mc', 'Sweden': 'se', 'Kenya': 'ke', 'Croatia': 'hr',
  'Portugal': 'pt', 'Italy': 'it', 'Greece': 'gr', 'Estonia': 'ee',
  'Finland': 'fi', 'Chile': 'cl', 'Japan': 'jp', 'Spain': 'es',
  'Mexico': 'mx', 'Poland': 'pl', 'Latvia': 'lv', 'Germany': 'de',
  'Turkey': 'tr', 'France': 'fr', 'Belgium': 'be', 'Great Britain': 'gb',
  'United Kingdom': 'gb', 'New Zealand': 'nz', 'Australia': 'au',
  'Argentina': 'ar', 'Ireland': 'ie', 'Norway': 'no', 'Austria': 'at',
  'Netherlands': 'nl', 'South Korea': 'kr', 'Czech Republic': 'cz',
  'Paraguay': 'py', 'Saudi Arabia': 'sa', 'Sardinia': 'it', 'Corsica': 'fr',
};

// flagcdn.com only supports specific widths
const FLAG_WIDTHS = [20, 40, 80, 160, 320];
function flagWidth(desired: number): number {
  return FLAG_WIDTHS.find(w => w >= desired) || 320;
}

export function getCountryCode(country: string): string | null {
  return COUNTRY_TO_CODE[country] || null;
}

export default function AnimatedFlag({
  country,
  size = 40,
}: {
  country: string;
  size?: number;
}) {
  const filterId = useId();
  const code = COUNTRY_TO_CODE[country];

  if (!code) {
    return <span className="text-2xl">🏁</span>;
  }

  const height = Math.round(size * 0.75);
  const w1x = flagWidth(size);
  const w2x = flagWidth(size * 2);

  return (
    <span className="inline-block relative" style={{ width: size, height }}>
      {/* SVG wave filter */}
      <svg className="absolute" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.045"
              numOctaves="3"
              seed="1"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="3s"
                values="0.015 0.045;0.025 0.065;0.015 0.045"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={Math.max(4, size * 0.12)}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {/* Flag image with wave filter */}
      <img
        src={`https://flagcdn.com/w${w1x}/${code}.png`}
        srcSet={`https://flagcdn.com/w${w1x}/${code}.png 1x, https://flagcdn.com/w${w2x}/${code}.png 2x`}
        alt={`${country} flag`}
        width={size}
        height={height}
        loading="eager"
        className="block rounded-sm"
        style={{
          width: size,
          height,
          objectFit: 'cover',
          filter: `url(#${filterId})`,
          transformOrigin: 'left center',
        }}
      />
    </span>
  );
}
