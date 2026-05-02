import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link, Upload, Sparkles } from 'lucide-react';
import { useStoreContext } from '@/hooks/useStoreContext';
import { NoStoreConnected } from '@/features/publish/components/NoStoreConnected';
import { LinksInput } from './components/LinksInput';
import { UploadInput } from './components/UploadInput';
import { ManualInput } from './components/ManualInput';
import { CreateOptionsBar } from './components/CreateOptionsBar';
import { DEFAULT_PRESET } from './presets';
import type { CreateInput, CreateInputMode, CreateOptions, ImageStylePreset } from './types';

interface CreateViewProps {
  onSubmit: (input: CreateInput, options: CreateOptions) => void;
  onAddStore: () => void;
}

export function CreateView({ onSubmit, onAddStore }: CreateViewProps) {
  const { activeStore, hasConnectedStore } = useStoreContext();

  // Input state
  const [mode, setMode] = useState<CreateInputMode>('links');
  const [rawLinks, setRawLinks] = useState('');
  const [parsedLinks, setParsedLinks] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [manualDescription, setManualDescription] = useState('');

  // Options state
  const [stylePreset, setStylePreset] = useState<ImageStylePreset>(DEFAULT_PRESET as ImageStylePreset);
  // Local store selection — não afeta o contexto global
  const [selectedStoreId, setSelectedStoreId] = useState<string>(activeStore?.id ?? '');

  if (!hasConnectedStore) {
    return <NoStoreConnected onAddStore={onAddStore} />;
  }

  function buildInput(): CreateInput {
    switch (mode) {
      case 'links':  return { mode, links: parsedLinks };
      case 'upload': return { mode, files: uploadedFiles };
      case 'manual': return { mode, initialDescription: manualDescription };
    }
  }

  function isSubmitDisabled(): boolean {
    if (!selectedStoreId) return true;
    if (mode === 'links')  return parsedLinks.length === 0;
    if (mode === 'upload') return uploadedFiles.length === 0;
    if (mode === 'manual') return manualDescription.trim().length === 0;
    return true;
  }

  function handleSubmit() {
    if (isSubmitDisabled()) return;
    onSubmit(buildInput(), { stylePreset, storeId: selectedStoreId });
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium text-foreground leading-snug">Criar produto</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Cole links, faça upload de imagens ou comece do zero.
        </p>
      </div>

      {/* Tabs de modo */}
      <Tabs value={mode} onValueChange={v => setMode(v as CreateInputMode)}>
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="links" className="flex items-center gap-1.5 text-[12px]">
            <Link className="w-3.5 h-3.5" />
            Cole links
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-1.5 text-[12px]">
            <Upload className="w-3.5 h-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1.5 text-[12px]">
            <Sparkles className="w-3.5 h-3.5" />
            Em branco
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="links" className="mt-0">
            <LinksInput
              value={rawLinks}
              onChange={(raw, links) => { setRawLinks(raw); setParsedLinks(links); }}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <UploadInput files={uploadedFiles} onChange={setUploadedFiles} />
          </TabsContent>

          <TabsContent value="manual" className="mt-0">
            <ManualInput value={manualDescription} onChange={setManualDescription} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Separador */}
      <div className="border-t border-border" />

      {/* Opções */}
      <CreateOptionsBar
        stylePreset={stylePreset}
        onStyleChange={setStylePreset}
        selectedStoreId={selectedStoreId}
        onStoreChange={setSelectedStoreId}
      />

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitDisabled()}
        className="w-full h-10 text-[13px] font-medium"
      >
        Criar produto
      </Button>
    </div>
  );
}
