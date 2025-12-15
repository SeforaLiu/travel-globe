import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  dateRange: [Date | null, Date | null];
  dark: boolean;
  onFocus?: () => void;
  onDateChange: (index: 0 | 1, date: Date | null) => void;
  isMobile?: boolean;
};

const DateSection: React.FC<Props> = ({
                                        dateRange,
                                        dark,
                                        onFocus,
                                        onDateChange,
                                        isMobile = false,
                                      }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddDate')}
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
            onChange={(e) => onDateChange(0, e.target.valueAsDate)}
            onFocus={onFocus}
          />
          <span className={dark ? 'text-gray-400' : 'text-gray-500'}>至</span>
          <input
            type="date"
            className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
            onChange={(e) => onDateChange(1, e.target.valueAsDate)}
            onFocus={onFocus}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddDate')}
      </label>
      <div className="flex gap-3 items-center">
        <input
          type="date"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
          onChange={(e) => onDateChange(0, e.target.valueAsDate)}
          onFocus={onFocus}
        />
        <span className="text-gray-500 dark:text-gray-400">至</span>
        <input
          type="date"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
          onChange={(e) => onDateChange(1, e.target.valueAsDate)}
          onFocus={onFocus}
        />
      </div>
    </div>
  );
};

export default DateSection;