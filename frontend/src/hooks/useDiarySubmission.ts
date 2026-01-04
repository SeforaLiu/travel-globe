// src/hooks/useDiarySubmission.ts
import {useCallback, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { SubmitData } from '@/pages/NewDiary/types';
import {useTravelStore} from "@/store/useTravelStore";

export const useDiarySubmission = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    fetchDiaries,
    fetchAllDiaries,
  } = useTravelStore();

  const submitDiary = useCallback(async (formData: SubmitData) => {
    setIsSubmitting(true);
    try {
      const data = {
        title: formData.title,
        content: formData.content,
        location_name: formData.location,
        entry_type: formData.type,
        coordinates: formData.coordinates,
        date_start: formData.dateStart ?? null,
        date_end: formData.dateEnd ?? null,
        transportation: formData.transportation ?? null,
        photos: formData.photos,
      };

      console.log('📤 创建日记数据:', data);

      const response = await api.post('/entries', data, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      console.log('✅ 日记提交成功:', response);
      toast.success(t('submit successful'));
      navigate('/');

      fetchDiaries(1, 10).catch(err => {
        console.error('获取失败:', err);
      });

      // 成功后的回调由调用方决定
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('❌ 日记提交失败:', error.message);

      if (error.response?.status === 401) {
        toast.error(t('Session expired, please login again'));
        navigate('/login');
      } else {
        toast.error(t('submit error please try again'));
      }

      return { success: false, error };
    }finally {
      setIsSubmitting(false);
    }
  }, [navigate, t]);

  return { submitDiary,isSubmitting };
};
