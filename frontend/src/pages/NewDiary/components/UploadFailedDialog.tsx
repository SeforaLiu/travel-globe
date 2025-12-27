import React from 'react';
import GenericDialog, { ButtonVariant } from '../../../components/GenericDialog';

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
}

const UploadFailedDialog: React.FC<UploadFailedDialogProps> = ({
                                                                 dark,
                                                                 failedPhotos,
                                                                 t,
                                                                 onRetry,
                                                                 onSkip,
                                                                 onCancel,
                                                                 isRetrying = false,
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
      title={t('photos.uploadFailed')}
      description={`${t('photos.photoFailedLength')} [${failedPhotos.length}]`}
      iconVariant="warning"
      onCancel={onCancel}
      showCancelButton={true}
      cancelButtonLabel={t('common.cancel')}
      primaryButton={{
        label: t('photos.retryAll'),
        onClick: onRetry,
        variant: 'warning' as ButtonVariant,
        loading: isRetrying,
        disabled: isRetrying,
        dataTestId: 'retry-button',
      }}
      secondaryButton={{
        label: t('photos.skipAndSubmit'),
        onClick: onSkip,
        variant: 'secondary' as ButtonVariant,
        dataTestId: 'skip-button',
      }}
      fullScreenOnMobile={true}
      maxWidth="md"
      t={t}
    >
      {failedListContent}
    </GenericDialog>
  );
};

export default UploadFailedDialog;
