'use client';

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
  const code = COUNTRY_TO_CODE[country];

  if (!code) {
    return <span className="text-2xl">🏁</span>;
  }

  const height = Math.round(size * 0.67);
  const w1x = flagWidth(size);
  const w2x = flagWidth(size * 2);

  return (
    <img
      src={`https://flagcdn.com/w${w1x}/${code}.png`}
      srcSet={`https://flagcdn.com/w${w1x}/${code}.png 1x, https://flagcdn.com/w${w2x}/${code}.png 2x`}
      alt={`${country} flag`}
      width={size}
      height={height}
      loading="eager"
      className="inline-block rounded-sm shadow-md ring-1 ring-white/20"
      style={{
        width: size,
        height,
        objectFit: 'cover',
      }}
    />
  );
}
