// frontend/src/components/MoodDetailModal.tsx
import React, {useState} from 'react';
import {X, Calendar, Quote, Trash2} from 'lucide-react';
import {useTravelStore} from "@/store/useTravelStore";
import GenericDialog from "@/components/GenericDialog";
import {toast} from "sonner";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import { Mood } from '@/types/mood';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: Mood | null;
  dark: boolean;
}

export default function MoodDetailModal({isOpen, onClose, data, dark}: Props) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMood = useTravelStore((state) => state.deleteMood);
  const user = useTravelStore((state) => state.user);

  const navigate = useNavigate()
  const { t, i18n } = useTranslation();

  if (!isOpen || !data) return null;

  // 处理删除确认的函数
  const handleDeleteConfirm = async () => {
    if (!data) return;

    // 展示账号不可删除或添加心情
    if(user.username==='demo01'){
      toast.info(t('demo account has no right'))
      return
    }

    setIsDeleting(true);
    try {
      await deleteMood(data.id);
      toast.success(t('ai.delete successful'))
      setIsConfirmingDelete(false);
      onClose();
    } catch (error: any) {
      console.error("Failed to delete mood:", error);

      if (error.response?.status === 401) {
        toast.error(t('Session expired, please login again'));
        navigate('/login');
      } else {
        toast.error(t('ai.delete failed'))
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric' ,
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        style={{pointerEvents: 'auto'}}
      >
        {/* 卡片容器 */}
        <div
          className={`w-96 rounded-2xl p-6 shadow-2xl transform transition-all scale-100 opacity-100 ${
            dark
              ? 'bg-gray-900 text-white border border-gray-700'
              : 'bg-white text-gray-900 border border-gray-100'
          }`}
          style={{
            writingMode: 'horizontal-tb',
            textOrientation: 'mixed',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: 标题与关闭按钮 */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2
                className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                {t('ai.Mood Memory')}
              </h2>
              <div className={`flex items-center gap-1.5 text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Calendar size={12}/>
                <span>{formatDate(data.created_at)}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${
                dark
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <X size={20}/>
            </button>
          </div>

          {/* Content: 文本内容 */}
          <div className="relative mb-5">
            <Quote size={24}
                   className={`absolute -top-2 -left-1 opacity-20 ${dark ? 'text-pink-400' : 'text-pink-600'}`}/>
            <p className={`text-base leading-relaxed pl-6 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
              {data.content}
            </p>
          </div>

          {/* Photo: 图片展示 (如果有) */}
          {data.photo_url && (
            <div
              className={`rounded-xl overflow-hidden border ${dark ? 'border-gray-700 bg-black/50' : 'border-gray-200 bg-gray-50'}`}>
              <img
                src={data.photo_url}
                alt="mood moment"
                className="w-full h-auto max-h-72 object-contain mx-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Actions Footer: 删除按钮 */}
          <div className="mt-6 pt-4 border-t flex justify-end">
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dark
                  ? 'text-red-400 hover:bg-red-500/20'
                  : 'text-red-600 hover:bg-red-100'
              }`}
              aria-label={t('common.delete')}
            >
              <Trash2 size={16}/>
              <span>{t('common.delete')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GenericDialog
            isOpen={isConfirmingDelete}
            dark={dark}
            title={t('ai.deleteConfirmTitle')}
            description={t('ai.deleteConfirmDesc')}
            iconVariant="warning"
            onClose={() => setIsConfirmingDelete(false)}
            primaryButton={{
              label: t('common.delete'),
              onClick: handleDeleteConfirm,
              variant: 'danger',
              loading: isDeleting,
            }}
            secondaryButton={{
              label: t('common.cancel'),
              onClick: () => setIsConfirmingDelete(false),
            }}
          />
        </div>
      )}
    </>
  );
}
