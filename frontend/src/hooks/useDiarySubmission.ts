// src/hooks/useDiarySubmission.ts
import {useCallback, useRef, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { SubmitData } from '@/pages/NewDiary/types';
import { useTravelStore } from "@/store/useTravelStore";
import { v4 as uuidv4 } from 'uuid';

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

      // 为创建操作生成幂等键
      const idempotencyKey = isEditMode ? undefined : uuidv4();
      const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};

      if (isEditMode) {
        // await updateDiaryAction(diaryId, data, options);
        await updateDiaryAction(diaryId, data);

        toast.success(t('submit successful'));
        navigate(`/diary/${diaryId}`);
      } else {
        // await createDiaryAction(data, options);
        await createDiaryAction(data);

        toast.success(t('submit successful'));
        navigate('/');
      }
      // --- 增加一个返回值，表示成功 ---
      return true;

    } catch (error: any) {
      const actionType = isEditMode ? '更新' : '提交';
      console.error(`❌ 日记${actionType}失败:`, error.response?.data || error.message);

      if (error.response?.status === 401) {
        toast.error(t('Session expired, please login again'));
        navigate('/login');
      } else {
        const errorMessage = error.response?.data?.detail || t('submit error please try again');
        toast.error(errorMessage);
      }

      return false;

    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, t, createDiaryAction, updateDiaryAction]);

  return { submitDiary, isSubmitting };
};
