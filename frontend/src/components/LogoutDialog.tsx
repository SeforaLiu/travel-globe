// src/components/NewDiaryCloseDialog.tsx
import React from 'react';
import GenericDialog, { ButtonVariant } from './GenericDialog';
import { useTranslation } from 'react-i18next';

interface Props {
  dark: boolean;
  isMobile: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutDialog: React.FC<Props> = ({ dark, isMobile, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  return (
    <GenericDialog
      dark={dark}
      title={t('sure to logout?')}
      iconVariant="error"
      showCancelButton={false}
      cancelButtonLabel={t('common.cancel')}
      primaryButton={{
        label: t('common.confirm'),
        onClick: onConfirm,
        variant: 'danger' as ButtonVariant,
        dataTestId: 'confirm-button',
      }}
      secondaryButton={{
        label: t('common.cancel'),
        onClick: onCancel,
        variant: 'secondary' as ButtonVariant,
        dataTestId: 'cancel-button',
      }}
      fullScreenOnMobile={true}
      maxWidth="md"
      t={t}
      isMobile={isMobile}
    >
    </GenericDialog>
  );
};
