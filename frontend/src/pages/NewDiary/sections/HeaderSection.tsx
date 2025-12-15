import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  dark: boolean;
  onClose: () => void;
};

const HeaderSection: React.FC<Props> = ({ dark, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
        {t('addNewDiaryOrGuide')}
      </h2>
      <button
        onClick={onClose}
        className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-xl text-gray-600 dark:text-gray-300">&times;</span>
      </button>
    </div>
  );
};

export default HeaderSection;