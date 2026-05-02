import { NoStoreConnected } from './components/NoStoreConnected';
import { PublishWizard, type PublishWizardProps } from './components/PublishWizard';
import { PublishingProgress } from './components/PublishingProgress';
import { PublishSuccess } from './components/PublishSuccess';
import type { ProductFormData } from '@/types/product';

export interface PublishViewProps extends PublishWizardProps {
  // Branching state
  isPublishing: boolean;
  publishResult: { title: string; shopifyUrl: string; imageUrl?: string } | null;
  publishStep: number;
  publishSteps: readonly string[];
  imageUploadProgress: { current: number; total: number } | null;

  // Cross-cutting (also passed to wizard via props above)
  onAddStore: () => void;
  onNewProduct: () => void;
  onViewHistory: () => void;
  successForm: ProductFormData;
  successCurrencySymbol: string;
}

export function PublishView(props: PublishViewProps) {
  const {
    isPublishing, publishResult, publishStep, publishSteps, imageUploadProgress,
    hasConnectedStore, onAddStore, onNewProduct, onViewHistory,
    successForm, successCurrencySymbol,
    ...wizardProps
  } = props;

  if (!publishResult && !isPublishing && !hasConnectedStore) {
    return <NoStoreConnected onAddStore={onAddStore} />;
  }

  if (!publishResult && !isPublishing && hasConnectedStore) {
    return <PublishWizard {...wizardProps} hasConnectedStore={hasConnectedStore} />;
  }

  if (isPublishing) {
    return (
      <PublishingProgress
        publishStep={publishStep}
        publishSteps={publishSteps}
        imageUploadProgress={imageUploadProgress}
      />
    );
  }

  if (publishResult && !isPublishing) {
    return (
      <PublishSuccess
        publishResult={publishResult}
        form={successForm}
        currencySymbol={successCurrencySymbol}
        onNewProduct={onNewProduct}
        onViewHistory={onViewHistory}
      />
    );
  }

  return null;
}