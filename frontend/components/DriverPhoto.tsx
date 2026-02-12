'use client';

const DRIVER_PHOTOS: Record<string, string> = {
  'Solberg': '/drivers/solberg.png',
  'Evans': '/drivers/evans.png',
  'Ogier': '/drivers/ogier.png',
  'Fourmaux': '/drivers/fourmaux.png',
  'Neuville': '/drivers/neuville.png',
  'Katsuta': '/drivers/katsuta.png',
  'Pajari': '/drivers/pajari.png',
  'Lappi': '/drivers/lappi.png',
  'Paddon': '/drivers/paddon.png',
  'Sordo': '/drivers/sordo.png',
  'Munster': '/drivers/munster.png',
  'Armstrong': '/drivers/armstrong.png',
};

function getPhotoUrl(driverName: string): string | null {
  // Try exact surname match: "Solberg O." -> "Solberg"
  const surname = driverName.split(/[\s,.]+/)[0];
  return DRIVER_PHOTOS[surname] || null;
}

interface DriverPhotoProps {
  name: string;
  size?: number;
  className?: string;
}

export default function DriverPhoto({ name, size = 36, className = '' }: DriverPhotoProps) {
  const photo = getPhotoUrl(name);
  if (!photo) {
    // Fallback: initials circle
    const initials = name.split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-white/10 text-white/50 text-xs font-bold shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
