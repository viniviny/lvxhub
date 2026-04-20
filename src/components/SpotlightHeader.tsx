import { useRef, type ReactNode, type MouseEvent } from 'react';

interface SpotlightHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Header com spotlight radial premium que segue o cursor do mouse.
 * Usa CSS variables --x e --y atualizadas via mousemove (sem re-render React).
 */
export function SpotlightHeader({ children, className = '' }: SpotlightHeaderProps) {
  const ref = useRef<HTMLElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--spot-x', `-200px`);
    el.style.setProperty('--spot-y', `-200px`);
  };

  return (
    <header
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`spotlight-header ${className}`}
    >
      {children}
    </header>
  );
}
