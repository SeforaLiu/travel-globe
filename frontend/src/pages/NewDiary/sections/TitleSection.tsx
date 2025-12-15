import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  title: string;
  type: 'visited' | 'wishlist';
  dark: boolean;
  onFocus?: () => void;
  onTitleChange: (value: string) => void;
  onTypeChange: (value: 'visited' | 'wishlist') => void;
  isMobile?: boolean;
};

const TitleSection: React.FC<Props> = ({
                                         title,
                                         type,
                                         dark,
                                         onFocus,
                                         onTitleChange,
                                         onTypeChange,
                                         isMobile = false,
                                       }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('AddTitle')}<span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            required
            className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onFocus={onFocus}
          />
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('AddType')}<span className="text-red-500"> *</span>
          </label>
          <select
            className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
            value={type}
            onChange={(e) => onTypeChange(e.target.value as 'visited' | 'wishlist')}
            onFocus={onFocus}
            required
          >
            <option value="visited">{t('AddTypeVisited')}</option>
            <option value="wishlist">{t('AddTypeWishList')}</option>
          </select>
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {t('AddTitle')}<span className="text-red-500"> *</span>
        </label>
        <input
          type="text"
          required
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onFocus={onFocus}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {t('AddType')}<span className="text-red-500"> *</span>
        </label>
        <select
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as 'visited' | 'wishlist')}
          onFocus={onFocus}
          required
        >
          <option value="visited">{t('AddTypeVisited')}</option>
          <option value="wishlist">{t('AddTypeWishList')}</option>
        </select>
      </div>
    </div>
  );
};

export default TitleSection;