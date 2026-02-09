'use client';

const MANUFACTURER_LOGOS: Record<string, string> = {
  'Toyota': '/logos/toyota-gazoo-racing.png',
  'Toyota Gazoo Racing WRT': '/logos/toyota-gazoo-racing.png',
  'TOYOTA GAZOO Racing WRT': '/logos/toyota-gazoo-racing.png',
  'Toyota WRT2': '/logos/toyota-gazoo-racing.png',
  'TOYOTA GAZOO Racing WRT2': '/logos/toyota-gazoo-racing.png',
  'Hyundai': '/logos/hyundai-motorsport.png',
  'Hyundai Shell Mobis WRT': '/logos/hyundai-motorsport.png',
  'M-Sport Ford': '/logos/msport-ford.png',
  'M-Sport Ford WRT': '/logos/msport-ford.png',
};

interface ManufacturerLogoProps {
  name: string;
  size?: number;
  className?: string;
}

export default function ManufacturerLogo({ name, size = 24, className = '' }: ManufacturerLogoProps) {
  const logo = MANUFACTURER_LOGOS[name];
  if (!logo) {
    return <span className={`text-white/50 text-xs ${className}`}>{name}</span>;
  }
  return (
    <img
      src={logo}
      alt={name}
      title={name}
      width={size}
      height={size}
      className={`inline-block object-contain rounded-sm bg-white/90 p-0.5 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
