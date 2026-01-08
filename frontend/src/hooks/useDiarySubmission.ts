// src/hooks/useDiarySubmission.ts
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { SubmitData } from '@/pages/NewDiary/types';
import { useTravelStore } from "@/store/useTravelStore";

export const useDiarySubmission = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createDiaryAction = useTravelStore((state) => state.createDiary);
  const updateDiaryAction = useTravelStore((state) => state.updateDiary);

  const submitDiary = useCallback(async (formData: SubmitData, diaryId?: number) => {
    setIsSubmitting(true);
    const isEditMode = !!diaryId;

    try {
      const data = {
        title: formData.title,
        content: formData.content,
        location_name: formData.location,
        entry_type: formData.type,
        coordinates: formData.coordinates,
        date_start: formData.dateStart || null,
        date_end: formData.dateEnd || null,
        transportation: formData.transportation || null,
        photos: formData.photos,
      };

      if (isEditMode) {
        console.log(`📤 更新日记数据 (ID: ${diaryId}):`, data);
        await updateDiaryAction(diaryId, data);
        toast.success(t('submit successful'));
        navigate(`/diary/${diaryId}`);
      } else {
        console.log('📤 创建日记数据:', data);
        await createDiaryAction(data);
        toast.success(t('submit successful'));
        navigate('/');
      }
      // --- 核心修改 1: 增加一个返回值，表示成功 ---
      return true;

    } catch (error: any) {
      const actionType = isEditMode ? '更新' : '提交';
      // log a more detailed error message for debugging
      console.error(`❌ 日记${actionType}失败:`, error.response?.data || error.message);

      if (error.response?.status === 401) {
        toast.error(t('Session expired, please login again'));
        navigate('/login');
      } else {
        // Use a more specific error message from the backend if available
        const errorMessage = error.response?.data?.detail || t('submit error please try again');
        toast.error(errorMessage);
      }

      // --- 核心修改 2: 不再抛出错误，而是返回 false ---
      return false;

    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, t, createDiaryAction, updateDiaryAction]);

  return { submitDiary, isSubmitting };
};
