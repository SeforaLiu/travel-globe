import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTravelStore } from '@/store/useTravelStore';
import { useCloudinaryUpload } from '@/pages/NewDiary/hooks/useCloudinaryUpload';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dark: boolean;
}

export default function MoodDialog({ isOpen, onClose, dark }: Props) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMood = useTravelStore(state => state.createMood);
  const { uploadPhotos } = useCloudinaryUpload();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t('Content is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      let photoData = {};

      // 1. 如果有图片，先上传
      if (selectedFile) {
        const results = await uploadPhotos(
          [{ file: selectedFile, status: 'pending' }],
          () => {}
        );
        if (results[0]) {
          photoData = {
            photo_url: results[0].url,
            photo_public_id: results[0].publicId
          };
        }
      }

      // 2. 提交到后端
      await createMood({
        content,
        ...photoData
      });

      toast.success(t('Mood sent successfully'));
      setContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      toast.error(t('Failed to send mood'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all ${
        dark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            {t('Share Travel Mood')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={120}
          placeholder={t('Describe your mood now...')}
          className={`w-full h-32 p-3 rounded-xl resize-none mb-2 focus:ring-2 focus:ring-pink-500 outline-none ${
            dark ? 'bg-gray-800 placeholder-gray-500' : 'bg-gray-100 placeholder-gray-400'
          }`}
        />
        <div className="text-right text-xs text-gray-500 mb-4">
          {content.length}/120
        </div>

        {/* Photo Preview */}
        {previewUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden h-32 w-full group">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
              className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ImageIcon size={18} />
            <span>{selectedFile ? t('Change Photo') : t('Add Photo')}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {t('Send Mood')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
