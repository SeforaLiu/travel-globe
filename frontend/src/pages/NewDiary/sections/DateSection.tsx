import React, {useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import { format, isValid, } from 'date-fns';
import { zhCN, enUS, it } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

type Props = {
  dateStart: string;
  dateEnd: string;
  dark: boolean;
  onFocus?: () => void;
  onDateChange: (dateStart: string, dateEnd: string) => void;
  isMobile?: boolean;
};

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const DateSection: React.FC<Props> = ({
                                        dateStart,
                                        dateEnd,
                                        dark,
                                        onFocus,
                                        onDateChange,
                                        isMobile = false,
                                      }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const [selectedDate, setSelectedDate] = useState<DateRange>({ from: undefined });
  const [displayDate, setDisplayDate] = useState("");

  const handleDayPickerSelect = (range: DateRange | undefined) => {
    if (range) {
      setSelectedDate(range);

      let dateStart: string = '';
      let dateEnd: string = '';

      if (range.from && range.to) {
        // 根据语言获取对应的本地化对象
        const locale = handleLocale();

        if (i18n.language === 'zh') {
          dateStart = format(range.from, 'yyyy年M月d日', { locale });
          dateEnd = format(range.to, 'yyyy年M月d日', { locale });
        } else {
          dateStart = format(range.from, 'd MMM yyyy', { locale });
          dateEnd = format(range.to, 'd MMM yyyy', { locale });
        }

        if (dateStart !== dateEnd) {
          setDisplayDate(`${dateStart} - ${dateEnd}`);
          setIsOpen(false)
        } else {
          setDisplayDate(dateStart);
        }
      }

      onDateChange(
        range.from ? format(range.from, 'yyyy-MM-dd') : '',
        range.to ? format(range.to, 'yyyy-MM-dd') : ''
      );
    } else {
      setSelectedDate({ from: undefined });
    }
  };

  const handleLocale = () => {
    switch (i18n.language) {
      case 'it':
        return it;
      case 'en':
        return enUS;
      default:
        return zhCN;
    }
  };

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddDate')}
        </label>

        {/* 输入框 */}
        <div
          className={`w-full p-3 rounded-lg border cursor-pointer ${
            dark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {displayDate}
        </div>

        {/* 日期选择器弹窗 mobile */}
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
            <div className={`w-full rounded-t-xl p-4 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {t('SelectDate')}
                </h3>
                <DayPicker
                  mode="range"
                  selected={selectedDate}
                  locale={handleLocale()}
                  onSelect={handleDayPickerSelect}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddDate')}
      </label>

      {/* 输入框 */}
      <div
        className={`w-full cursor-pointer relative ${
          dark
            ? 'bg-gray-800 border-gray-700 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          id={inputId}
          type="text"
          value={displayDate}
          readOnly
          placeholder="请选择日期"
          className="w-full p-3 rounded-lg border cursor-pointer pr-12"
        />
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {isOpen? '📆x' :'📆'}
        </span>
      </div>

      {/* 日期选择器下拉 PC 端 */}
      {isOpen && (
        <div className={`mt-2 p-3 w-1/3 rounded-lg shadow-lg ${dark ? 'bg-gray-800' : 'bg-white'}`}>
          <DayPicker
            mode="range"
            selected={selectedDate}
            locale={handleLocale()}
            onSelect={handleDayPickerSelect}
            className={`${dark ? 'rdp-dark' : 'rdp-light'} w-full`}
          />
        </div>
      )}
    </div>
  );
};

export default DateSection;
