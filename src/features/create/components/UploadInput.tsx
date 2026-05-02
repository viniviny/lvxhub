import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

interface UploadInputProps {
  files: File[];
  onChange: (files: File[]) => void;
}

function filterFiles(raw: FileList | File[]): File[] {
  return Array.from(raw).filter(
    f => ACCEPTED_MIME.includes(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024,
  );
}

export function UploadInput({ files, onChange }: UploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const valid = filterFiles(incoming);
    if (!valid.length) return;
    const existing = new Set(files.map(f => `${f.name}-${f.size}`));
    const merged = [...files, ...valid.filter(f => !existing.has(`${f.name}-${f.size}`))];
    onChange(merged);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Só sai do estado se o mouse foi pra fora do container (evita flicker em filhos)
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        ref={containerRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 h-[140px] rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/40'
        }`}
      >
        <Upload className={`w-5 h-5 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="text-center">
          <p className="text-[13px] text-foreground">
            {isDragging ? 'Solte as imagens aqui' : 'Arraste imagens ou clique para selecionar'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">JPG · PNG · WebP · até 10 MB cada</p>
        </div>
      </div>

      {/* Input nativo escondido */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${i}`} className="relative group w-16 h-16 rounded-md overflow-hidden border border-border">
                <img src={url} alt={file.name} className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(url)} />
                <button
                  onClick={e => { e.stopPropagation(); removeFile(i); }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
