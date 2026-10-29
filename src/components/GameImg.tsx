import { useState, type ReactNode } from 'react';

// <img> for a game icon that swaps to the given fallback if the URL is null or fails to load.
export function GameImg({ src, size, className, fallback, alt = '' }: { src: string | null; size: number; className?: string; fallback: ReactNode; alt?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <>{fallback}</>;
  return <img className={className} src={src} width={size} height={className?.includes('hero-img') ? Math.round(size * 1.25) : size} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setBad(true)} />;
}
