import { useRef, type ReactNode, type MouseEvent, type ElementType } from 'react';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  onClick?: () => void;
}

/**
 * Card com border glow radial premium que segue o cursor.
 * Usa CSS variables atualizadas via mousemove (sem re-render React).
 * Combine com .frost, .lift, .noise etc.
 */
export function SpotlightCard({ children, className = '', as: Tag = 'div', onClick }: SpotlightCardProps) {
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
    <Tag
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`spotlight-card ${className}`}
    >
      {children}
    </Tag>
  );
}
