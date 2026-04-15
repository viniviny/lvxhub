import { useEffect, useState } from 'react';
import { Package, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AliExpressImportToastProps {
  open: boolean;
  title: string;
  price?: number;
  imageUrl?: string;
  imageCount?: number;
  onOpen: () => void;
  onDismiss: () => void;
}

export function AliExpressImportToast({
  open, title, price, imageUrl, imageCount, onOpen, onDismiss,
}: AliExpressImportToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setExiting(false);
      requestAnimationFrame(() => setVisible(true));
      const timer = setTimeout(() => handleDismiss(), 30000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [open]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); onDismiss(); }, 300);
  };

  const handleOpen = () => {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); onOpen(); }, 200);
  };

  if (!open && !visible) return null;

  return (
    <>
      <style>{`
        @keyframes aliSlideUp {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes aliSlideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(110%); opacity: 0; }
        }
        .ali-toast-enter { animation: aliSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .ali-toast-exit  { animation: aliSlideDown 0.3s ease-in forwards; }
      `}</style>

      <div
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          maxWidth: '370px', width: '100%',
        }}
        className={exiting ? 'ali-toast-exit' : visible ? 'ali-toast-enter' : ''}
      >
        <div
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border))',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid hsl(var(--border))',
              background: 'hsl(var(--secondary) / 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #e53935, #ff6f00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Package style={{ width: '14px', height: '14px', color: 'white' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                Produto importado
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 500,
                padding: '2px 6px', borderRadius: '4px',
                background: 'linear-gradient(135deg, #e53935, #ff6f00)',
                color: 'white',
              }}>AliExpress</span>
            </div>

            <button
              onClick={handleDismiss}
              style={{
                background: 'none', border: 'none',
                color: 'hsl(var(--muted-foreground))',
                cursor: 'pointer', padding: '4px',
              }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div
              style={{
                width: '52px', height: '52px', borderRadius: '8px',
                overflow: 'hidden', flexShrink: 0,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--secondary))',
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Package style={{ width: '24px', height: '24px', margin: '14px auto', color: 'hsl(var(--muted-foreground))' }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0,
              }}>{title}</p>

              <div style={{ display: 'flex', gap: '6px', marginTop: '3px', fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                {price && price > 0 && (
                  <span style={{ fontWeight: 600 }}>US$ {price.toFixed(2)}</span>
                )}
                {imageCount && imageCount > 0 && (
                  <span>· {imageCount} fotos</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', gap: '8px', padding: '10px 14px',
            borderTop: '1px solid hsl(var(--border))',
          }}>
            <Button variant="ghost" size="sm" onClick={handleDismiss} style={{ flex: 1 }}>
              Agora não
            </Button>
            <Button size="sm" onClick={handleOpen} style={{ flex: 1 }}>
              Abrir produto <ArrowRight style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
