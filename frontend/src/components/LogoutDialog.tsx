// src/components/NewDiaryCloseDialog.tsx
import React, {useState} from 'react';
import GenericDialog, {ButtonVariant} from './GenericDialog';
import {useTranslation} from 'react-i18next';

interface Props {
  isOpen: boolean;
  dark: boolean;
  isMobile: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutDialog: React.FC<Props> = ({isOpen, dark, onConfirm, onCancel}) => {
  const {t} = useTranslation();

  return (
    <GenericDialog
      isOpen={isOpen}
      dark={dark}
      title={t('sure to logout?')}
      description={t('you will need to login again once logout')}
      iconVariant="error"
      onClose={onCancel}
      maxWidth="md"
      t={t}
      primaryButton={{
        label: t('common.confirm'),
        onClick: onConfirm,
        variant: 'danger',
        dataTestId: 'confirm-button',
      }}
      secondaryButton={{
        label: t('common.cancel'),
        onClick: onCancel,
        variant: 'ghost',
        dataTestId: 'cancel-button',
      }}
    >
    </GenericDialog>

  );
};
