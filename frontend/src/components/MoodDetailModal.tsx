// MoodDetailModal.tsx
import React from 'react';
import { X, Calendar, Quote } from 'lucide-react';
import {t} from "i18next";

// 定义数据接口
interface MoodData {
  id: number;
  content: string;
  photo_url: string | null;
  created_at: string;
  mood_vector: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: MoodData | null;
  dark: boolean;
}

export default function MoodDetailModal({ isOpen, onClose, data, dark }: Props) {
  if (!isOpen || !data) return null;

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  return (
    // 遮罩层：使用 fixed inset-0 确保覆盖全屏，backdrop-blur 增加质感
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose} // 点击背景关闭
      style={{ pointerEvents: 'auto' }} // 确保能接收点击
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
        onClick={(e) => e.stopPropagation()} // 阻止冒泡，防止点击卡片关闭
      >
        {/* Header: 标题与关闭按钮 */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              {t('ai.Mood Memory')}
              {/*记录心情*/}
            </h2>
            <div className={`flex items-center gap-1.5 text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
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
            <X size={20} />
          </button>
        </div>

        {/* Content: 文本内容 */}
        <div className="relative mb-5">
          {/*<Quote size={12} className={`absolute -top-2 -left-1 opacity-20 ${dark ? 'text-pink-400' : 'text-pink-600'}`} />*/}
          <p className={`text-base leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
            {data.content}
          </p>
        </div>

        {/* Photo: 图片展示 (如果有) */}
        {data.photo_url && (
          <div className={`rounded-xl overflow-hidden border ${dark ? 'border-gray-700 bg-black/50' : 'border-gray-200 bg-gray-50'}`}>
            <img
              src={data.photo_url}
              alt="mood moment"
              className="w-full h-auto max-h-72 object-contain mx-auto"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}
