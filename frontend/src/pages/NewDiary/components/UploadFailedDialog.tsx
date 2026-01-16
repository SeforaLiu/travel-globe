import React from 'react';
import GenericDialog from "@/components/GenericDialog";

interface UploadFailedDialogProps {
  dark: boolean;
  failedPhotos: Array<{
    file: File;
    error?: string;
  }>;
  t: (key: string) => string;
  onRetry: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isRetrying?: boolean;
  isOpen: boolean;
}

const UploadFailedDialog: React.FC<UploadFailedDialogProps> = ({
                                                                 dark,
                                                                 failedPhotos,
                                                                 t,
                                                                 onRetry,
                                                                 onSkip,
                                                                 onCancel,
                                                                 isRetrying = false,
                                                                 isOpen
                                                               }) => {
  // 自定义内容：失败图片列表
  const failedListContent = (
    <div className="mb-6 max-h-48 overflow-y-auto">
      <p className="text-sm font-medium mb-2">
        {t('photos.failedList')}
      </p>
      <ul className="space-y-1">
        {failedPhotos.map((photo, index) => (
          <li key={index} className="text-sm flex items-start">
            <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0 ${
              dark ? 'bg-red-400' : 'bg-red-500'
            }`}></span>
            <div className="flex-1 min-w-0">
              <p className="truncate">{photo.file.name}</p>
              {photo.error && (
                <p className={`text-xs truncate ${dark ? 'opacity-70' : 'text-gray-600'}`}>
                  {photo.error}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <GenericDialog
      dark={dark}
      isOpen={isOpen}
      title={t('photos.uploadFailed')}
      description={`${t('photos.photoFailedLength')} [${failedPhotos.length}]`}
      children={failedListContent}
      iconVariant="warning"
      onClose={onCancel}
      primaryButton={{
        label: t('photos.retryAll'),
        onClick: onRetry,
        variant: 'warning',
        loading: isRetrying,
        dataTestId: 'retry-button',
      }}
      secondaryButton={{
        label: t('photos.skipAndSubmit'),
        onClick: onSkip,
        variant: 'ghost',
        dataTestId: 'skip-button',
      }}
      maxWidth="md"
      t={t}
    />
  );
};

export default UploadFailedDialog;
