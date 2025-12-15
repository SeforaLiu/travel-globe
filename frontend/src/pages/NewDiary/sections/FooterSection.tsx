import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  dark: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isMobile?: boolean;
};

const FooterSection: React.FC<Props> = ({ dark, onClose, onSubmit, isMobile = false }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className={`p-4 border-t ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex justify-end gap-3`}>
        <button
          type="button"
          className="px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={onClose}
        >
          {t('AddCancelButton')}
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          onClick={onSubmit}
        >
          {t('AddSubmitButton')}
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={onClose}
        >
          {t('AddCancelButton')}
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {t('AddSubmitButton')}
        </button>
      </div>
    </div>
  );
};

export default FooterSection;