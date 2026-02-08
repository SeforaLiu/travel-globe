// frontend/src/pages/NewDiary/sections/DateSection.tsx
import React, { useId, useState, useEffect } from 'react'; // 引入 useEffect
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns'; // 引入 parseISO
import { zhCN, enUS, it } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

type Props = {
  dateStart: string; // 格式: 'yyyy-MM-dd'
  dateEnd: string;   // 格式: 'yyyy-MM-dd'
  dark: boolean;
  onDateChange: (dateStart: string, dateEnd: string) => void;
  isMobile?: boolean;
};

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}


const DateSection: React.FC<Props> = ({
                                        dateStart, // 接收 props
                                        dateEnd,   // 接收 props
                                        dark,
                                        onDateChange,
                                        isMobile = false,
                                      }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const [selectedDate, setSelectedDate] = useState<DateRange>({ from: undefined });
  const [displayDate, setDisplayDate] = useState("");

  // --- 新增 Effect: 响应外部数据变化 ---
  useEffect(() => {
    if (dateStart) {
      try {
        const from = parseISO(dateStart);
        const to = dateEnd ? parseISO(dateEnd) : from;
        const newRange = { from, to };

        setSelectedDate(newRange);
        updateDisplayDate(newRange);
      } catch (error) {
        console.error("无效的日期格式:", { dateStart, dateEnd });
      }
    }
  }, [dateStart, dateEnd, i18n.language]); // 依赖项包含语言，以便在切换语言时重新格式化

  // 提取更新显示日期的逻辑为一个函数
  const updateDisplayDate = (range: DateRange) => {
    if (range.from) {
      const locale = handleLocale();
      const formattedStart = i18n.language === 'zh'
        ? format(range.from, 'yyyy年M月d日', { locale })
        : format(range.from, 'd MMM yyyy', { locale });

      if (range.to && format(range.from, 'yyyy-MM-dd') !== format(range.to, 'yyyy-MM-dd')) {
        const formattedEnd = i18n.language === 'zh'
          ? format(range.to, 'yyyy年M月d日', { locale })
          : format(range.to, 'd MMM yyyy', { locale });
        setDisplayDate(`${formattedStart} - ${formattedEnd}`);
      } else {
        setDisplayDate(formattedStart);
      }
    } else {
      setDisplayDate("");
    }
  };

  const handleDayPickerSelect = (range: DateRange | undefined) => {
    if (range) {
      setSelectedDate(range);
      updateDisplayDate(range); // 使用提取的函数

      // if (range.from && range.to) {
      //   setIsOpen(false);
      // }

      onDateChange(
        range.from ? format(range.from, 'yyyy-MM-dd') : '',
        range.to ? format(range.to, 'yyyy-MM-dd') : ''
      );
    } else {
      setSelectedDate({ from: undefined });
      setDisplayDate("");
      onDateChange('', '');
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

  const handleResetDate =()=>{
    setSelectedDate({ from: undefined });
    setDisplayDate("");
    onDateChange('', '');
  }

  let footer = <></>;

  if (displayDate)
    footer = (
      <>
          {t('Days selected')}: {displayDate}
        <button type="button" onClick={handleResetDate}
                className={`mb-2 rounded-full px-2  text-white ${dark? "bg-[#6ec1e4]" : "bg-[#007bff] "}`}
        >
          {t('common.reset')}
        </button>
      </>
    );

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddDate')}
        </label>

        <div
          className={`w-full cursor-pointer ${
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
            placeholder={t('please select date')}
            className="w-full p-3 rounded-lg border cursor-pointer pr-12 border-gray-300"
          />
        </div>

        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
            <div className={`w-full pl-7 rounded-t-xl p-4 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-4">
                <button className={`mb-4 rounded-xl px-4 py-2 text-white ${dark? "bg-[#6ec1e4]" : "bg-[#007bff] "}`} onClick={() => setIsOpen(!isOpen)}> {t('common.close')} </button>
                <DayPicker
                  animate
                  captionLayout="dropdown"
                  mode="range"
                  selected={selectedDate}
                  locale={handleLocale()}
                  onSelect={handleDayPickerSelect}
                  className={`${dark ? 'rdp-dark' : 'rdp-light'} w-full pl-6`}
                  footer={footer}
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
          placeholder={t('please select date')}
          className="w-full p-3 rounded-lg border cursor-pointer pr-12 border-gray-300"
        />
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {isOpen? '📆x' :'📆'}
        </span>
      </div>

      {isOpen && (
        <div className={`mt-2 p-3 w-1/3 rounded-lg shadow-lg ${dark ? 'bg-gray-800' : 'bg-white'}`}>
          <button className={` rounded-xl mb-4 px-6 py-2  text-white ${dark? "bg-[#6ec1e4]" : "bg-[#007bff] "}`} onClick={() => setIsOpen(!isOpen)}> {t('common.close')} </button>
          <DayPicker
            animate
            captionLayout="dropdown"
            mode="range"
            selected={selectedDate}
            locale={handleLocale()}
            onSelect={handleDayPickerSelect}
            className={`${dark ? 'rdp-dark' : 'rdp-light'} w-full`}
            footer={footer}
          />
        </div>
      )}
    </div>
  )
};

export default DateSection;
