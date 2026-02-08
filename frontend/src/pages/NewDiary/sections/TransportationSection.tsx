import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  transportation: string;
  dark: boolean;
  onChange: (value: string) => void;
  isMobile?: boolean;
};

const TransportationSection: React.FC<Props> = ({
                                                  transportation,
                                                  dark,
                                                  onChange,
                                                  isMobile = false,
                                                }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddTransportation')}
        </label>
        <input
          type="text"
          className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
          value={transportation}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('plane / train / self-driving')}
        />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddTransportation')}
      </label>
      <input
        type="text"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
        value={transportation}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('plane / train / self-driving')}
      />
    </div>
  );
};

export default TransportationSection;