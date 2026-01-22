// frontend/src/pages/DiaryView.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'; // 引入 useCallback
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTravelStore } from "@/store/useTravelStore";
import Loading from '@/components/Loading';
import GenericDialog from "@/components/GenericDialog";
import { toast } from "sonner";
// 引入图标库，提升视觉效果
import {
  MapPin,
  Calendar,
  Plane,
  ArrowLeft,
  Edit3,
  Trash2,
  Quote,
  Navigation,
} from 'lucide-react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {detectDevice, DeviceInfo} from '@/utils/deviceDetector';

const ENTRY_TYPE = {
  VISITED: 'visited',
  WISHLIST: 'wishlist',
};



const DiaryView: React.FC<{ dark: boolean; isMobile: boolean; }> = ({ dark, isMobile }) => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchDiaryDetail = useTravelStore(state => state.fetchDiaryDetail);
  const currentDiary = useTravelStore(state => state.currentDiary);
  const deleteDiary = useTravelStore(state => state.deleteDiary);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  const fetchingIdRef = useRef<number | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    const info = detectDevice();
    setDeviceInfo(info);
  }, []);

  // --- 数据获取逻辑 (保持原有逻辑不变) ---
  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setStatus('error');
      setError(t('error.invalidId') || '无效的日记ID');
      return;
    }
    const diaryId = Number(id);

    console.log(`[Effect Run] ID: ${diaryId}, Status: ${status}, Store Diary: ${currentDiary?.id}, Fetching Ref: ${fetchingIdRef.current}`);

    // 1. [成功状态]
    if (currentDiary && currentDiary.id === diaryId) {
      console.log(`[Handler] Case 1: Success. Store data is correct.`);
      setStatus('success');
      if (fetchingIdRef.current === diaryId) {
        fetchingIdRef.current = null;
      }
      return;
    }

    // 2. [防循环锁]
    if (fetchingIdRef.current === diaryId) {
      console.log(`[Handler] Case 2: Locked. Already fetching or failed for ID ${diaryId}. Aborting.`);
      return;
    }

    // 3. [执行加载]
    console.log(`[Handler] Case 3: Start fetch for ID ${diaryId}.`);

    const loadData = async () => {
      fetchingIdRef.current = diaryId; // 上锁
      setStatus('loading');
      setError(null);

      try {
        await fetchDiaryDetail(diaryId);
        console.log(`[Fetch] API call for ${diaryId} initiated successfully.`);
      } catch (err) {
        console.error(`[Fetch] API call for ${diaryId} failed.`, err);
        if (fetchingIdRef.current === diaryId) {
          setStatus('error');
          setError(t('error.loadFailed') || '加载日记详情失败');
        }
      }
    };

    loadData();

  }, [id, currentDiary, fetchDiaryDetail, t]);

  // --- 优化点: 使用 useCallback 封装函数 ---
  // 这样做可以避免在每次组件重渲染时都重新创建这些函数。
  // 依赖项数组 [i18n.language] 确保了在语言切换时，日期格式能正确更新。
  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateStr;
    }
  }, [i18n.language]);

  const renderDateRange = useCallback(() => {
    if (!currentDiary) return '-';
    const start = currentDiary.date_start;
    const end = currentDiary.date_end;
    if (!start) return '-';
    const formattedStart = formatDate(start);
    if (!end || start === end) return formattedStart;
    const formattedEnd = formatDate(end);
    return `${formattedStart} - ${formattedEnd}`;
  }, [currentDiary, formatDate]);


  // --- 事件处理函数也使用 useCallback 封装 ---
  const handleEditClick = useCallback(() => navigate(`/diary/edit?id=${id}`), [id, navigate]);
  const handleDeleteClick = useCallback(() => setShowDeleteDialog(true), []);
  const handleBackClick = useCallback(() => navigate(-1), [navigate]);

  const handleConfirmDelete = useCallback(async () => {
    if (!id) return;
    try {
      await deleteDiary(Number(id));
      toast.success(t('delete successful'));
      navigate('/');
    } catch (error) {
      console.error("delete failed:", error);
      toast.error(t('Network error'));
    }
    setShowDeleteDialog(false);
  }, [id, deleteDiary, navigate, t]);


  // --- 渲染逻辑 ---
  const renderContent = () => {
    if (status === 'loading' || status === 'idle') {
      return <Loading dark={dark} />;
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col justify-center items-center min-h-screen text-red-500 gap-4">
          <p>{error || t('Network error')}</p>
          <button onClick={() => navigate(-1)} className="text-blue-500 underline">
            {t('common.back')}
          </button>
        </div>
      );
    }

    if (!currentDiary || status !== 'success') {
      return <div className="flex justify-center items-center min-h-screen">{t('cannot find this diary')}</div>;
    }

    const isVisited = currentDiary.entry_type === ENTRY_TYPE.VISITED;
    const photos = currentDiary.photos || [];

    // 样式类定义
    const containerClass = `min-h-screen transition-colors duration-300 ${
      dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`;

    const cardClass = `max-w-4xl mx-auto rounded-3xl shadow-xl overflow-hidden transition-all duration-300 ${
      dark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'
    }`;

    const iconClass = `w-4 h-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`;
    const metaTextClass = `text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`;

    return (
      <div className={containerClass}>
        {/* 顶部导航栏 */}
        <div className={`sticky top-0 z-10 backdrop-blur-md border-b ${
          dark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                dark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">{t('common.back')}</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className={`p-2 rounded-full transition-colors ${
                  dark ? 'hover:bg-blue-900/30 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                }`}
                title={t('common.edit')}
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={handleDeleteClick}
                className={`p-2 rounded-full transition-colors ${
                  dark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                }`}
                title={t('common.delete')}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className={`p-4 md:p-8 ${isMobile ? 'pb-20' : ''}`}>
          <div className={cardClass}>

            {/* 头部区域：标题与状态 */}
            <div className="p-6 md:p-10 pb-0">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                  isVisited
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isVisited ? 'bg-emerald-500' : 'bg-violet-500'}`}></span>
                  {isVisited ? t('AddTypeVisited') : t('AddTypeWishList')}
                </span>
              </div>

              {/* 渐变标题 - 参考 MoodDetailModal */}
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                {currentDiary.title}
              </h1>

              {/* 元数据网格 */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl ${
                dark ? 'bg-gray-800/50' : 'bg-gray-50'
              }`}>
                {/* 地点 */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${dark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
                    <MapPin className={iconClass} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{t('AddLocation')}</span>
                    <span className={metaTextClass}>{currentDiary.location_name || '-'}</span>
                  </div>
                </div>

                {/* 交通 */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${dark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
                    {/* 根据内容动态显示图标，这里默认用 Plane 或 Navigation */}
                    {currentDiary.transportation?.toLowerCase().includes('flight') ? <Plane className={iconClass} /> : <Navigation className={iconClass} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{t('AddTransportation')}</span>
                    <span className={metaTextClass}>{currentDiary.transportation || '-'}</span>
                  </div>
                </div>

                {/* 时间 */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${dark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
                    <Calendar className={iconClass} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{t('AddDate')}</span>
                    <span className={metaTextClass}>{renderDateRange()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 正文内容 */}
            <div className="p-6 md:p-10 relative">
              <Quote
                size={48}
                className={`absolute top-6 left-4 opacity-10 ${dark ? 'text-pink-400' : 'text-pink-600'}`}
              />
              {/*
                使用 Tailwind Prose 插件来为 Markdown 渲染的 HTML 元素提供样式。
                - `prose`: 应用基础排版样式。
                - `max-w-none`: 取消 prose 默认的最大宽度限制，让它撑满父容器。
                - `prose-invert`: 在暗黑模式下反转颜色。
              */}
              <div className={`relative z-10 prose max-w-none ${dark ? 'prose-invert' : ''}`}>
                {/*@ts-ignore*/}
                {deviceInfo.isIOS ? <div>{currentDiary.content || ''}</div> :
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  >
                    {currentDiary.content || ''}
                  </ReactMarkdown>
                }


              </div>
            </div>

            {/* 图片展示区 */}
            {photos.length > 0 && (
              <div className={`p-6 md:p-10 pt-0`}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                  dark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  <span className="w-8 h-[1px] bg-current"></span>
                  {t('AddPhotos')}
                </h3>
                <div className={`grid gap-4 ${
                  photos.length === 1 ? 'grid-cols-1' :
                    photos.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      className={`group relative rounded-xl overflow-hidden shadow-sm aspect-[4/3] ${
                        dark ? 'bg-gray-800' : 'bg-gray-100'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={`Memory ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* 图片遮罩，仅在暗黑模式下稍微压暗，hover时变亮 */}
                      {dark && <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 底部装饰条 */}
            <div className="h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
          </div>
        </div>

        {/* 删除确认弹窗 */}
        {showDeleteDialog && (
          <GenericDialog
            dark={dark}
            isOpen={showDeleteDialog}
            title={t('sure to delete?')}
            iconVariant="error"
            description={t('This cannot be undone')}
            primaryButton={{
              label: t('common.confirm'),
              onClick: handleConfirmDelete,
              variant: 'danger',
              dataTestId: 'confirm-button',
            }}
            onClose={() => setShowDeleteDialog(false)}
            secondaryButton={{
              label: t('common.cancel'),
              onClick: () => setShowDeleteDialog(false),
              variant: 'ghost',
              dataTestId: 'cancel-button',
            }}
            maxWidth="md"
          />
        )}
      </div>
    );
  };

  return renderContent();
}

export default DiaryView;
