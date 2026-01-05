// DiaryView.tsx
import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useTravelStore} from "@/store/useTravelStore";

interface DiaryData {
  id: number;
  title: string;
  type: 'visited' | 'wishlist';
  location: string;
  transportation: string;
  dateRange: [string, string];
  content: string;
  photos: string[];
}

const DiaryView: React.FC<{ dark: boolean; isMobile: boolean; }> = ({dark, isMobile}) => {
  const {t} = useTranslation();
  const {id} = useParams();
  const navigate = useNavigate();

  const fetchDiaryDetail = useTravelStore(state => state.fetchDiaryDetail);
  const currentDiary = useTravelStore(state => state.currentDiary);

  useEffect(() => {
    const loadData = async () => {
      if (!id || currentDiary?.id === Number(id)) return;
      try {
        await fetchDiaryDetail(Number(id));
      } catch (error) {
        console.error('加载失败:', error);
      }
    };

    loadData();
  }, [id, fetchDiaryDetail]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric'});
  };

  // 按钮点击处理函数
  const handleEditClick = () => {
    console.log('点击编辑按钮');
  };

  const handleDeleteClick = () => {
    console.log('点击删除按钮');
  };

  const handleBackClick = () => {
    navigate('/'); // 返回主页
  };

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`max-w-3xl mx-auto p-6 ${isMobile ? 'px-4' : ''}`}>
        {/* 按钮组 - 靠右排列 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={handleBackClick}
            className={`px-6 py-2 rounded-md text-sm font-medium 
            ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} 
            transition-colors`}
          >
            {t('common.back')}
          </button>
          <button
            onClick={handleEditClick}
            className={`px-6 py-2 rounded-md text-sm font-medium 
            ${dark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'} 
            text-white transition-colors`}
          >
            {t('common.edit')}
          </button>
          <button
            onClick={handleDeleteClick}
            className={`px-6 py-2 rounded-md text-sm font-medium 
            ${dark ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-400'} 
            text-white transition-colors`}
          >
            {t('common.delete')}
          </button>
        </div>

        {/* 标题部分 */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium 
            ${currentDiary?.entry_type === 'visited' ? 'bg-diary text-white' : 'bg-guide text-white'}
            ${dark && currentDiary?.entry_type === 'visited' ? 'bg-diary text-white' : ''}
            ${dark && currentDiary?.entry_type === 'wishlist' ? 'bg-guide text-white' : ''}`}>
              {currentDiary?.entry_type === 'visited' ? t('AddTypeVisited') : t('AddTypeWishList')}
          </span>
          </div>
          <h1 className="text-3xl font-bold  text-center">{currentDiary?.title}</h1>
        </div>

        {/* 信息卡片 - 苹果风格 */}
        <div className={`rounded-xl p-6 mb-8 ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="space-y-4">
            {/* 地点、交通、日期一行排列 */}
            <div className="flex flex-wrap justify-between items-center">
              {/* 地点 - 左对齐 */}
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0">
                {/*<p className="text-lg font-medium mb-1">{t('location')}</p>*/}
                <p className="text-lg">{currentDiary?.location_name}</p>
              </div>

              {/* 交通 - 居中 */}
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0 md:text-center">
                {/*<p className="text-lg font-medium mb-1">{t('transportation')}</p>*/}
                <p className="text-lg">{currentDiary?.transportation}</p>
              </div>

              {/* 日期 - 右对齐 */}
              <div className="flex-1 min-w-[200px] md:text-right">
                {/*<p className="text-lg font-medium mb-1">{t('date')}</p>*/}
                <p className="text-lg">
                  {formatDate(currentDiary?.date_start)}
                  {currentDiary?.date_start !== currentDiary?.date_end && ` - ${formatDate(currentDiary?.date_end)}`}
                </p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-lg whitespace-pre-line">{currentDiary?.content}</p>
            </div>
          </div>
        </div>

        {/* 照片展示 */}
        {currentDiary?.photos.length > 0 && (
          <div className={`rounded-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className={`grid gap-4 ${currentDiary?.photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {currentDiary?.photos.map((photo, index) => (
                <div key={index} className="rounded-lg overflow-hidden">
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiaryView;
