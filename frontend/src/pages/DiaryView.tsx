// DiaryView.tsx
import React, {useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

interface DiaryData {
  id: string;
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
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 模拟数据 - 实际应用中应该从API或状态管理获取
  const diaryData: DiaryData = {
    id: id || '1',
    title: '广州之旅!',
    type: 'visited',
    location: '广州',
    transportation: '飞机',
    dateRange: ['2025-12-10', '2025-12-10'],
    content: '这次玩得很开心!',
    photos: [
      'https://www.thnet.gov.cn/img/0/981/981042/9137475.png',
      'https://www.gz.gov.cn/img/1/1309/1309198/9954422.png'
    ]
  };

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
            ${diaryData.type === 'visited' ? 'bg-diary text-white' : 'bg-guide text-white'}
            ${dark && diaryData.type === 'visited' ? 'bg-diary text-white' : ''}
            ${dark && diaryData.type === 'wishlist' ? 'bg-guide text-white' : ''}`}>
              {diaryData.type === 'visited' ? t('AddTypeVisited') : t('AddTypeWishList')}
          </span>
          </div>
          <h1 className="text-3xl font-bold  text-center">{diaryData.title}</h1>
        </div>

        {/* 信息卡片 - 苹果风格 */}
        <div className={`rounded-xl p-6 mb-8 ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="space-y-4">
            {/* 地点、交通、日期一行排列 */}
            <div className="flex flex-wrap justify-between items-center">
              {/* 地点 - 左对齐 */}
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0">
                {/*<p className="text-lg font-medium mb-1">{t('location')}</p>*/}
                <p className="text-lg">{diaryData.location}</p>
              </div>

              {/* 交通 - 居中 */}
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0 md:text-center">
                {/*<p className="text-lg font-medium mb-1">{t('transportation')}</p>*/}
                <p className="text-lg">{diaryData.transportation}</p>
              </div>

              {/* 日期 - 右对齐 */}
              <div className="flex-1 min-w-[200px] md:text-right">
                {/*<p className="text-lg font-medium mb-1">{t('date')}</p>*/}
                <p className="text-lg">
                  {formatDate(diaryData.dateRange[0])}
                  {diaryData.dateRange[0] !== diaryData.dateRange[1] && ` - ${formatDate(diaryData.dateRange[1])}`}
                </p>
              </div>
            </div>

            {/* 正文 */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-lg whitespace-pre-line">{diaryData.content}</p>
            </div>
          </div>
        </div>

        {/* 照片展示 */}
        {diaryData.photos.length > 0 && (
          <div className={`rounded-xl p-6 ${dark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className={`grid gap-4 ${diaryData.photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {diaryData.photos.map((photo, index) => (
                <div key={index} className="rounded-lg overflow-hidden">
                  <img
                    src={photo}
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
