import { useState, useCallback } from 'react';
import { Product, ProductFormData } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const generateImage = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setGeneratedImageUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.status === 429) toast.error('Limite de requisições atingido. Tente novamente em instantes.');
        else if (data.status === 402) toast.error('Créditos insuficientes. Adicione fundos na sua conta.');
        else throw new Error(data.error);
        return null;
      }
      setGeneratedImageUrl(data.imageUrl);
      toast.success('Imagem gerada com sucesso!');
      return data.imageUrl;
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao gerar imagem. Verifique sua API key.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const publishProduct = useCallback(async (formData: ProductFormData, imageUrl: string) => {
    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-product', {
        body: { ...formData, imageUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newProduct: Product = {
        id: data.productId || crypto.randomUUID(),
        ...formData,
        imageUrl,
        status: 'publicado',
        shopifyUrl: data.shopifyUrl || null,
        createdAt: new Date().toISOString(),
      };

      setProducts(prev => [newProduct, ...prev]);
      setGeneratedImageUrl(null);
      toast.success('Produto publicado no Shopify!');
      return newProduct;
    } catch (err) {
      console.error('Erro ao publicar:', err);
      toast.error('Erro ao publicar produto. Verifique suas credenciais Shopify.');
      return null;
    } finally {
      setIsPublishing(false);
    }
  }, []);

  const resetImage = useCallback(() => {
    setGeneratedImageUrl(null);
  }, []);

  return {
    products,
    isGenerating,
    isPublishing,
    generatedImageUrl,
    generateImage,
    publishProduct,
    resetImage,
  };
}
