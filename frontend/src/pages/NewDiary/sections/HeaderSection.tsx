// src/pages/NewDiary/sections/HeaderSection.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

type Props = {
  dark: boolean;
  onClose: () => void;
  isEditMode?: boolean;
  onOpenAI?: () => void;
};

const HeaderSection: React.FC<Props> = ({ dark, onClose, isEditMode = false, onOpenAI }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {isEditMode ? t('common.edit') : t('addNewDiaryOrGuide')}
        </h2>

        {/* 新增：AI 入口按钮 (仅在非编辑模式或根据需求显示) */}
        {!isEditMode && onOpenAI && (
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-200 dark:border-blue-800 transition-all group"
          >
            <Sparkles size={14} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('ai.diary generator name')}
            </span>
          </button>
        )}
      </div>

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
