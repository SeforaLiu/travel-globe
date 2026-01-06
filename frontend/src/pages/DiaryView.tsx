// DiaryView.tsx
import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useTravelStore} from "@/store/useTravelStore";

const ENTRY_TYPE = {
  VISITED: 'visited',
  WISHLIST: 'wishlist',
};

const DiaryView: React.FC<{ dark: boolean; isMobile: boolean; }> = ({dark, isMobile}) => {
  const {t, i18n} = useTranslation();
  const {id} = useParams<{ id: string }>(); // 建议为 useParams 提供类型
  const navigate = useNavigate();

  const fetchDiaryDetail = useTravelStore(state => state.fetchDiaryDetail);
  const currentDiary = useTravelStore(state => state.currentDiary);

  // --- 优化建议 1 & 2: 增加 loading 和 error 状态 ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 确保 id 存在才执行
    if (!id) {
      setLoading(false);
      setError(t('error.invalidId')); // 假设 i18n 中有这个 key
      return;
    }

    // 如果当前日记已经是目标日记，则无需重新加载
    if (currentDiary?.id === Number(id)) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchDiaryDetail(Number(id));
      } catch (err) {
        console.error('加载日记详情失败:', err);
        setError(t('error.loadFailed')); // 向用户显示通用错误信息
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // 依赖项中移除 currentDiary，避免不必要的重渲染循环
  }, [id, fetchDiaryDetail, t]);

  // --- 优化建议 3: 统一的日期格式化函数 ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return dateStr; // 如果日期格式非法，返回原字符串
    }
  };

  const renderDateRange = () => {
    // 因为后面有卫语句，这里可以安全地假设 currentDiary 存在
    const start = currentDiary!.date_start;
    const end = currentDiary!.date_end;

    if (!start) return null;

    const formattedStart = formatDate(start);
    if (!end || start === end) {
      return formattedStart;
    }

    const formattedEnd = formatDate(end);
    return `${formattedStart} - ${formattedEnd}`;
  };

  // 按钮点击处理函数
  const handleEditClick = () => {
    navigate(`/diary/edit/${id}`); // 导航到编辑页
  };

  const handleDeleteClick = () => {
    // 实际项目中应有确认弹窗
    console.log('点击删除按钮');
  };

  const handleBackClick = () => {
    navigate('/'); // 返回主页
  };

  // --- 优化建议 4: 使用卫语句处理加载、错误和空数据状态 ---
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>; // 这里可以替换为更美观的 Spinner 组件
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  }

  if (!currentDiary) {
    return <div className="flex justify-center items-center min-h-screen">{t('error.diaryNotFound')}</div>;
  }

  // --- 主渲染逻辑 ---
  const isVisited = currentDiary.entry_type === ENTRY_TYPE.VISITED;
  const photos = currentDiary.photos || []; // 提供一个空数组作为默认值，让代码更安全

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className={`max-w-3xl mx-auto p-6 ${isMobile ? 'px-4' : ''}`}>
        {/* 按钮组 - 优化建议 6: 使用 dark: 变体简化 CSS */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={handleBackClick}
            className="px-6 py-2 rounded-md text-sm font-medium transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            {t('common.back')}
          </button>
          <button
            onClick={handleEditClick}
            className="px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={handleDeleteClick}
            className="px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
          >
            {t('common.delete')}
          </button>
        </div>

        {/* 标题部分 */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${isVisited ? 'bg-diary' : 'bg-guide'}`}>
              {isVisited ? t('AddTypeVisited') : t('AddTypeWishList')}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-center">{currentDiary.title}</h1>
        </div>

        {/* 信息卡片 */}
        <div className="rounded-xl p-6 mb-8 bg-white shadow-sm dark:bg-gray-800">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0">
                <p className="text-lg">{currentDiary.location_name}</p>
              </div>
              <div className="flex-1 min-w-[200px] mb-4 md:mb-0 md:text-center">
                <p className="text-lg">{currentDiary.transportation}</p>
              </div>
              <div className="flex-1 min-w-[200px] md:text-right">
                <p className="text-lg">{renderDateRange()}</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-lg whitespace-pre-line">{currentDiary.content}</p>
            </div>
          </div>
        </div>

        {/* 照片展示 - 现在逻辑非常清晰 */}
        {photos.length > 0 && (
          <div className="rounded-xl p-6 bg-white shadow-sm dark:bg-gray-800">
            <div className={`grid gap-4 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {photos.map((photo, index) => (
                <div key={photo.id || index} className="rounded-lg overflow-hidden"> {/* 优先使用 photo.id 作为 key */}
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
