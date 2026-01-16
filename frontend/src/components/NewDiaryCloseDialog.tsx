// src/components/NewDiaryCloseDialog.tsx
import React from 'react';
import GenericDialog, {ButtonVariant} from './GenericDialog';
import {useTranslation} from 'react-i18next';

interface Props {
  dark: boolean;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const NewDiaryCloseDialog: React.FC<Props> = ({isOpen, dark, onConfirm, onCancel}) => {
  const {t} = useTranslation();

  return (
    <GenericDialog
      dark={dark}
      isOpen={isOpen}
      title={t('sure to leave?')}
      onClose={onCancel}
      description={t('input will be clear')}
      iconVariant="error"
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
      maxWidth="md"
      t={t}
    />
  );
};
