import { format, parseISO } from 'date-fns';
import { enUS, zhCN, it } from 'date-fns/locale';
import type { Locale } from 'date-fns';

const localeMap: { [key: string]: Locale } = {
  en: enUS,
  zh: zhCN,
  it: it,
};

const dateFormatMap: { [key: string]: string } = {
  en: 'd MMM yyyy', // e.g., 26 Jan 2026
  zh: 'yyyy年M月d日', // e.g., 2026年1月26日
  it: 'd MMM yyyy', // e.g., 26 gen 2026
};

/**
 * 格式化日期范围，支持多语言
 * @param dateStart - 开始日期字符串 (e.g., "2026-01-26")
 * @param dateEnd - 结束日期字符串 (e.g., "2026-01-28"), 可选
 * @param lang - 当前语言代码 (e.g., "en", "zh", "it")
 * @returns 格式化后的本地化日期字符串
 */
export const formatDateRange = (
  dateStart?: string | null,
  dateEnd?: string | null,
  lang: string = 'en' // 默认使用英文
): string => {
  // 防御性编程：如果开始日期不存在，直接返回空字符串
  if (!dateStart) {
    return '';
  }

  try {
    const start = parseISO(dateStart);
    const locale = localeMap[lang] || enUS; // 如果找不到对应语言，默认回退到英文
    const dateFormat = dateFormatMap[lang] || dateFormatMap['en'];

    // 格式化开始日期
    const formattedStart = format(start, dateFormat, { locale });

    // 检查 dateEnd 是否存在且与 dateStart 不同
    if (dateEnd && dateEnd !== dateStart) {
      const end = parseISO(dateEnd);
      const formattedEnd = format(end, dateFormat, { locale });
      return `${formattedStart} - ${formattedEnd}`;
    }

    // 如果 dateEnd 不存在或与 dateStart 相同，只返回格式化后的开始日期
    return formattedStart;

  } catch (error) {
    // 如果日期格式不正确，parseISO 会抛出异常
    // 在这里捕获异常，并打印日志，防止程序崩溃
    console.error("Invalid date format provided:", { dateStart, dateEnd }, error);
    // 返回原始值或空字符串，避免UI崩溃
    return dateStart;
  }
};
