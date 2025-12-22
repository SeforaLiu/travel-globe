import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

const MarkdownEditor = lazy(() => import('@uiw/react-md-editor'));

type Props = {
  content: string;
  dark: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  isMobile?: boolean;
};

const ContentSection: React.FC<Props> = ({
                                           content,
                                           dark,
                                           onChange,
                                           onFocus,
                                           isMobile = false,
                                         }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddContent')}
        </label>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('write something here')}
          className={`w-full h-[300px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-1 ${
            dark
              ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 focus:border-blue-500'
              : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
          rows={10}
          onFocus={onFocus}
        />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddContent')}
      </label>
      <div className="border border-gray-300 rounded-lg overflow-hidden dark:border-gray-700"
           data-color-mode={dark ? 'dark' : 'light'}>
        <Suspense fallback={<div className="h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-800">加载编辑器中...</div>}>
          <MarkdownEditor
            value={content}
            // @ts-ignore
            onChange={onChange}
            height={500}
            onFocus={onFocus}
            placeholder={t('write something here')}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default ContentSection;