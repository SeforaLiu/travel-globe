// frontend/src/pages/DiaryView.tsx

import React, {useEffect, useState, useRef} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useTravelStore} from "@/store/useTravelStore";
import Loading from '@/components/Loading';
import GenericDialog, {ButtonVariant} from "@/components/GenericDialog";
import {toast} from "sonner";

const ENTRY_TYPE = {
  VISITED: 'visited',
  WISHLIST: 'wishlist',
};

const DiaryView: React.FC<{ dark: boolean; isMobile: boolean; }> = ({dark, isMobile}) => {
  const {t, i18n} = useTranslation();
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchDiaryDetail = useTravelStore(state => state.fetchDiaryDetail);
  const currentDiary = useTravelStore(state => state.currentDiary);
  const deleteDiary = useTravelStore(state => state.deleteDiary);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  const fetchingIdRef = useRef<number | null>(null);

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

  // --- 渲染逻辑 ---
  const renderContent = () => {
    if (status === 'loading' || status === 'idle') {
      return <Loading dark={dark}/>;
    }

    if (status === 'error') {
      return <div className="flex justify-center items-center min-h-screen text-red-500">{t('Network error')}</div>;
    }

    if (!currentDiary || status !== 'success') {
      return <div className="flex justify-center items-center min-h-screen">{t('cannot find this diary')}</div>;
    }

    const isVisited = currentDiary.entry_type === ENTRY_TYPE.VISITED;
    const photos = currentDiary.photos || [];

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat(i18n.language, {year: 'numeric', month: 'long', day: 'numeric'}).format(date);
      } catch (e) {
        return dateStr;
      }
    };

    const renderDateRange = () => {
      const start = currentDiary!.date_start;
      const end = currentDiary!.date_end;
      if (!start) return null;
      const formattedStart = formatDate(start);
      if (!end || start === end) return formattedStart;
      const formattedEnd = formatDate(end);
      return `${formattedStart} - ${formattedEnd}`;
    };

    const handleEditClick = () => navigate(`/diary/edit?id=${id}`);
    const handleDeleteClick = () => setShowDeleteDialog(true)
    const handleBackClick = () => navigate('/');

    const handleConfirmDelete = async () => {
      try {
        await deleteDiary(Number(id))
        toast.success(t('delete successful'))
        navigate('/')
      } catch (error) {
        console.error("delete failed:", error);
        toast.error(t('Network error'))
      }

      setShowDeleteDialog(false)
    }

    return (
      (currentDiary ? <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className={`max-w-3xl mx-auto p-6 ${isMobile ? 'px-4' : ''}`}>
          <div className="flex justify-end gap-2 mb-4">
            <button onClick={handleBackClick}
                    className="px-6 py-2 rounded-md text-sm font-medium transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">{t('common.back')}</button>
            <button onClick={handleEditClick}
                    className="px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500">{t('common.edit')}</button>
            <button onClick={handleDeleteClick}
                    className="px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500">{t('common.delete')}</button>
          </div>
          <div className="mb-8">
            <div className="flex items-center mb-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${isVisited ? 'bg-diary' : 'bg-guide'}`}>{isVisited ? t('AddTypeVisited') : t('AddTypeWishList')}</span>
            </div>
            <h1 className="text-3xl font-bold text-center">{currentDiary.title}</h1>
          </div>
          <div className="rounded-xl p-6 mb-8 bg-white shadow-sm dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center">
                <div className="flex-1 min-w-[200px] mb-4 md:mb-0"><p
                  className="text-lg">{currentDiary.location_name}</p></div>
                <div className="flex-1 min-w-[200px] mb-4 md:mb-0 md:text-center"><p
                  className="text-lg">{currentDiary.transportation}</p></div>
                <div className="flex-1 min-w-[200px] md:text-right"><p className="text-lg">{renderDateRange()}</p></div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700"><p
                className="text-lg whitespace-pre-line">{currentDiary.content}</p></div>
            </div>
          </div>
          {photos.length > 0 && (
            <div className="rounded-xl p-6 bg-white shadow-sm dark:bg-gray-800">
              <div className={`grid gap-4 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {photos.map((photo, index) => (
                  <div key={photo.id || index} className="rounded-lg overflow-hidden">
                    <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-auto object-cover"
                         loading="lazy"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showDeleteDialog && <GenericDialog
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
          onClose={() => {
            setShowDeleteDialog(false)
          }}
          secondaryButton={{
            label: t('common.cancel'),
            onClick: () => {
              setShowDeleteDialog(false)
            },
            variant: 'ghost',
            dataTestId: 'cancel-button',
          }}
          maxWidth="md"
          t={t}
        />}

      </div> : <div>{t('No diaries yet')}</div>)

    );
  };

  return renderContent();
}

export default DiaryView;
