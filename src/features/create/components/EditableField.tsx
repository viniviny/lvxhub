import { useEffect, useRef, useState } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}

export function EditableField({
  value,
  onChange,
  multiline = false,
  className = '',
  ariaLabel,
  placeholder,
}: EditableFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza valor externo quando não está em foco (evita stomp no input do usuário)
  useEffect(() => {
    if (ref.current && !isFocused && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const newValue = ref.current?.textContent ?? '';
    if (newValue !== value) onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ref.current) ref.current.textContent = value;
      ref.current?.blur();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Cola apenas texto puro (sem formatação HTML)
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={multiline}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className={`outline-none px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground ${className}`}
    >
      {value}
    </div>
  );
}
