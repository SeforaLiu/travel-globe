import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  dark: boolean;
}

const AIDiaryDialog: React.FC<Props> = ({ isOpen, onClose, onGenerate, dark }) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      await onGenerate(prompt);
      onClose();
      setPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl transform transition-all ${
        dark ? 'bg-gray-900 border border-gray-700' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-blue-500">
            <Sparkles size={20} />
            <h3 className="font-bold text-lg">{t('ai.diary generator name')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} className={dark ? 'text-gray-400' : 'text-gray-500'} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('ai.describe your travel plans')}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('ai.diary example')}
              className={`w-full h-32 p-3 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                dark
                  ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700'
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200 border'
              }`}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-600 dark:text-blue-300">
            ❗ {t('ai.overwrite warning')}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-600 dark:text-blue-300">
            💡 {t('ai.more details tip')}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('common.loading')}...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {t('ai.Generate Draft Diary')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDiaryDialog;
