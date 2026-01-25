// frontend/src/pages/NewDiary/index.tsx
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useSearchParams, useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import {useFormData} from './hooks/useFormData';
import {usePhotoDragSort} from './hooks/usePhotoDragSort';
import {useCloudinaryUpload} from './hooks/useCloudinaryUpload';
import {useDiarySubmission} from '@/hooks/useDiarySubmission';
import {useTravelStore} from '@/store/useTravelStore';
import {Props, LocationResult, FormData as FormDataT} from './types';
import UploadFailedDialog from './components/UploadFailedDialog';
import Loading from "../../components/Loading";
import {generateDiaryDraft} from '@/services/ai'; // 导入 API
import AIDiaryDialog from './components/AIDiaryDialog'; // 导入 Dialog

const INITIAL_FORM_DATA: FormDataT = {
  title: '',
  type: 'visited', // 默认类型
  location: '',
  coordinates: null,
  dateStart: '',
  dateEnd: '',
  transportation: '',
  content: '',
  photos: [], // 关键修复：确保 photos 是一个空数组
};

export default function NewDiary({isMobile, dark, onClose,shouldFetchDiaryDetail }: Omit<Props, 'onSubmit' | 'loading'>) {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const diaryId = searchParams.get('id');

  // --- 内部状态和 Hooks ---
  const currentDiary = useTravelStore(state => state.currentDiary)
  const clearCurrentDiary = useTravelStore(state => state.clearCurrentDiary)
  const fetchDiaryDetail = useTravelStore(state => state.fetchDiaryDetail)
  const user = useTravelStore(state => state.user)
  const getHealth = useTravelStore(state => state.getHealth)

  const {submitDiary, isSubmitting} = useDiarySubmission();
  const {
    formData,
    setFormData, // 需要 setFormData 来初始化表单
    updateField,
    addPhotos,
    removePhoto,
    sortPhotos,
    updatePhotoStatusByFile
  } = useFormData(INITIAL_FORM_DATA); // 初始为空
  const {uploadPhotos, resetCache} = useCloudinaryUpload();

  const [isPageLoading, setIsPageLoading] = useState(!!diaryId);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showFailedPhotosDialog, setShowFailedPhotosDialog] = useState(false);
  const [failedPhotosList, setFailedPhotosList] = useState<Array<{ file: File; error?: string; }>>([]);
  const [isRetryingFailedPhotos, setIsRetryingFailedPhotos] = useState(false);
  const [userAction, setUserAction] = useState<'retry' | 'skip' | null>(null);
  const [isWaitingForUserAction, setIsWaitingForUserAction] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const submissionLock = useRef(false);

  useEffect(() => {
    (async () => {
      await getHealth();
    })();
  }, []);

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    const loadAndSetDiaryData = async () => {
      if (diaryId) {
        setIsPageLoading(true);
        try {
          // --- 核心修复逻辑 ---
          // 1. 优先从 store 中获取 currentDiary
          let diaryDetail = currentDiary;
          // // 2. 如果 store 中没有数据（或者 id 不匹配），则通过 API 获取
          if (!diaryDetail || diaryDetail.id !== Number(diaryId)) {
            diaryDetail = await fetchDiaryDetail(Number(diaryId));
          }
          // --- 修复结束 ---
          // 增加一个防御性检查，如果获取后仍然没有数据，则直接报错退出
          if (!diaryDetail) {
            throw new Error(`无法获取 ID 为 ${diaryId} 的日记详情。`);
          }
          // 数据转换：将后端数据格式转换为前端 FormData 格式
          const transformedData: Partial<FormDataT> = {
            title: diaryDetail.title,
            type: diaryDetail.entry_type,
            location: diaryDetail.location_name,
            coordinates: diaryDetail.coordinates,
            dateStart: diaryDetail.date_start ? diaryDetail.date_start.split('T')[0] : '',
            dateEnd: diaryDetail.date_end ? diaryDetail.date_end.split('T')[0] : '',
            transportation: diaryDetail.transportation || '',
            content: diaryDetail.content || '', // 修复：content 为 null 时，编辑器可能会报错，给个空字符串
            photos: diaryDetail.photos.map(photo => ({
              file: null,
              url: photo.url,
              publicId: photo.public_id,
              status: 'success',
              cloudinary: {
                publicId: photo.public_id,
                url: photo.url,
                width: photo.width,
                height: photo.height,
                size: photo.size,
                format: photo.format,
                folder: photo.folder,
                originalFilename: photo.original_filename,
                created_at: photo.created_at,
              }
            }))
          };
          setFormData(transformedData as FormDataT);
          setShowMapPreview(!!transformedData.coordinates);
        } catch (error) {
          console.error(`[Edit Mode] 加载日记 ${diaryId} 失败:`, error);
          toast.error(t('Network error'));
        } finally {
          setIsPageLoading(false);
        }
      } else {
        // 新建模式下，确保表单是空的（如果之前有编辑数据的话）
        setFormData(INITIAL_FORM_DATA);
        setIsPageLoading(false);
      }
    };
    loadAndSetDiaryData()
    // 修复：添加所有依赖项，避免 stale closure 问题，并移除 eslint-disable
  }, [diaryId, setFormData, fetchDiaryDetail, currentDiary, navigate, t]);


  useEffect(() => {
    return () => {
      // 当组件卸载时（用户离开此页面），清空 store 中的当前日记
      // 这样可以防止数据污染，例如从编辑页返回新建页时看到旧数据
      clearCurrentDiary();
      resetCache();
    };
  }, [clearCurrentDiary, resetCache]);

// 修改：处理失败图片重试的函数（增加加载状态）
  const handleRetryFailedPhotos = useCallback((failedPhotos: Array<{ file: File; error?: string }>) => {
    setIsRetryingFailedPhotos(true);

    try {
      // 重置失败图片状态为 pending
      failedPhotos.forEach(photo => {
        updatePhotoStatusByFile(
          photo.file,
          'pending',
          undefined,
          undefined
        );
      });

      // 显示重试成功的 toast
      toast.success(t('photos.retryStarted', {count: failedPhotos.length}) || `正在重试 ${failedPhotos.length} 张图片`);
    } catch (error) {
      toast.error(t('photos.retryFailed'));
    } finally {
      // 延迟一点时间再重置加载状态，让用户看到操作反馈
      setTimeout(() => {
        setIsRetryingFailedPhotos(false);
      }, 500);
    }
  }, [updatePhotoStatusByFile, t]);

  // 修改：处理跳过失败图片的函数
  const handleSkipFailedPhotos = useCallback(() => {
    setUserAction('skip');
    // 继续执行提交逻辑，失败的图片会被过滤掉
  }, []);

  // 修改：显示失败图片对话框（简化逻辑）
  const showFailedPhotosDialogModal = useCallback((failedPhotos: Array<{ file: File; error?: string }>) => {
    setFailedPhotosList(failedPhotos);
    setShowFailedPhotosDialog(true);
    setIsWaitingForUserAction(true);
  }, []);

  // 修改：处理对话框关闭
  const handleDialogClose = useCallback(() => {
    setShowFailedPhotosDialog(false);
    setIsWaitingForUserAction(false);
    setUserAction(null);
    setIsRetryingFailedPhotos(false);
  }, []);

  // 修改：处理重试操作
  const handleDialogRetry = useCallback(() => {
    handleRetryFailedPhotos(failedPhotosList);
    setShowFailedPhotosDialog(false);
    setIsWaitingForUserAction(false);
    setUserAction('retry');
  }, [failedPhotosList, handleRetryFailedPhotos]);

  // 修改：处理跳过操作
  const handleDialogSkip = useCallback(() => {
    handleSkipFailedPhotos();
    setShowFailedPhotosDialog(false);
    setIsWaitingForUserAction(false);
  }, [handleSkipFailedPhotos]);

// 辅助函数 1: 表单校验
  const validateForm = useCallback((data: FormDataT) => {
    const {title, location, coordinates, type} = data;
    if (!title.trim() || !location.trim() || !coordinates || !type) {
      console.error('❌ 表单校验失败:', {title, location, coordinates, type});
      toast.error(t('validation.fillRequiredFields'));
      return false;
    }
    return true;
  }, [t]);

  // 辅助函数 2: 检查进行中的进程
  const checkForOngoingProcesses = useCallback(() => {
    if (isUploading) {
      toast.info(t('photos.uploadingInProgress'));
      return true;
    }
    if (isRetryingFailedPhotos) {
      toast.info(t('photos.retryInProgress'));
      return true;
    }
    return false;
  }, [isUploading, isRetryingFailedPhotos, t]);

  // 辅助函数 3: 处理用户选择重试的动作
  // 返回 true 表示已处理重试，主流程应中断
  const handleUserRetryAction = useCallback((e: React.FormEvent) => {
    if (userAction === 'retry') {
      setUserAction(null); // 重置操作
      setTimeout(() => handleSubmit(e), 500); // 延迟后重新调用主函数
      return true;
    }
    return false;
  }, [userAction]); // 注意：这里不能依赖 handleSubmit，否则会循环依赖

  // 辅助函数 4: 检查并处理上传失败的图片
  // 返回 true 表示弹出了对话框，主流程应中断
  const handleFailedPhotos = useCallback((photos: FormDataT['photos']) => {
    // 只关心那些新上传失败的图片 (有 file 对象)
    const failedUploads = photos.filter(p => p.status === 'error' && p.file);
    if (failedUploads.length > 0) {
      showFailedPhotosDialogModal(
        failedUploads.map(p => ({file: p.file!, error: p.error}))
      );
      return true; // 中断流程，等待用户选择
    }
    return false;
  }, [showFailedPhotosDialogModal]);

  // 辅助函数 5: 上传所有待处理的图片
  // 返回 true 表示成功或无需上传，返回 false 表示上传过程中出现严重错误
  const uploadPendingPhotos = useCallback(async (photos: FormDataT['photos']) => {
    const photosToUpload = photos.filter(p => p.status === 'pending' && p.file);
    if (photosToUpload.length === 0) {
      return true; // 无需上传，视为成功
    }
    setIsUploading(true);
    try {
      await uploadPhotos(
        // 这里的 p.file! 是安全的，因为 filter 已经保证了
        photosToUpload.map(p => ({file: p.file!, url: p.url, status: p.status})),
        (index, status, result, error) => {
          const targetFile = photosToUpload[index].file;
          // 关键修复：在调用前增加一个 null 检查
          // 这既能满足 TypeScript 的类型要求，也增加了代码的健壮性
          if (targetFile) {
            updatePhotoStatusByFile(targetFile, status, result, error);
          } else {
            console.warn(`[uploadCallback] 警告: 索引 ${index} 对应的 targetFile 为 null，无法更新状态。`);
          }
        }
      );
      return true;
    } catch (error) {
      console.error('上传过程中出现错误:', error);
      toast.error(t('photos.uploadFailed'));
      return false; // 上传失败
    } finally {
      setIsUploading(false);
    }
  }, [setIsUploading, t, updatePhotoStatusByFile, uploadPhotos]);

  // 辅助函数 6 (原 proceedWithSubmit): 最终提交数据
  const finalizeAndSubmit = useCallback((finalFormData: FormDataT) => {
    // 过滤出所有成功的照片
    const successPhotos = finalFormData.photos.filter(p => p.status === 'success' && p.cloudinary);

    const photosToSubmit = successPhotos.map(photo => ({
      url: photo.cloudinary!.url,
      public_id: photo.cloudinary!.publicId,
      width: photo.cloudinary!.width,
      height: photo.cloudinary!.height,
      size: photo.cloudinary!.size,
      format: photo.cloudinary!.format,
      folder: photo.cloudinary!.folder,
      original_filename: photo.cloudinary!.originalFilename,
      created_at: photo.cloudinary!.created_at
    }));
    if (!finalFormData.coordinates) {
      return;
    }
    const submitData = {
      ...finalFormData,
      coordinates: finalFormData.coordinates,
      photos: photosToSubmit
    };
    submitDiary(submitData, diaryId ? Number(diaryId) : undefined);
  }, [submitDiary, diaryId]);


  // --- 主提交函数 (指挥官) ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('点击提交,',Date.now())
    // 使用 ref 进行同步检查和锁定
    if (submissionLock.current) {
      console.log('提交已锁定，防止重复操作');
      return;
    }
    submissionLock.current = true;
    setIsPageLoading(true)

    try {
      // 展示账号不可新增/编辑日记
      // if(user.username==='demo01'){
      //   toast.info(t('demo account has no right'))
      //   return
      // }

      try {
        // 尝试进行健康检查
        await getHealth();
      } catch (healthCheckError) {
        toast.error(t('No response from server'));
        return
      }

      console.log('服务器OK 继续后边的步骤')
      const currentFormData = formDataRef.current;
      // 步骤 1: 前置检查
      if (!validateForm(currentFormData)) return;
      if (checkForOngoingProcesses()) return;
      // 步骤 2: 处理用户交互（重试/跳过）
      // 如果用户选择了重试，则重新开始整个流程
      if (handleUserRetryAction(e)) return;
      // 步骤 3: 检查首次提交时已存在的失败图片
      // 如果用户还未对失败图片做决定，则弹窗并中断
      if (userAction === null && handleFailedPhotos(currentFormData.photos)) {
        return;
      }
      // 步骤 4: 上传新图片
      const uploadOk = await uploadPendingPhotos(currentFormData.photos);
      if (!uploadOk) return; // 如果上传过程出错，则中断
      // 步骤 5: 等待状态更新，并进行上传后的最终检查
      await new Promise(resolve => setTimeout(resolve, 200));
      const updatedFormData = formDataRef.current;
      // 检查是否有图片在上传后失败了
      // 如果用户没有选择“跳过”，则再次弹窗并中断
      if (userAction !== 'skip' && handleFailedPhotos(updatedFormData.photos)) {
        return;
      }
      // 步骤 6: 所有检查通过，正式提交
      await finalizeAndSubmit(updatedFormData);
    }catch (e) {

    }finally {
      // 无论成功或失败，最后都要解锁
      submissionLock.current = false;
      setIsPageLoading(false)
    }
  }, [
    validateForm,
    checkForOngoingProcesses,
    handleUserRetryAction,
    userAction,
    handleFailedPhotos,
    uploadPendingPhotos,
    finalizeAndSubmit
  ]);

  const handleLocationSelect = (place: LocationResult) => {
    if (place.geometry?.location) {
      const addressText = place.formatted_address || place.name || '';
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : (place.geometry.location.lat as number);
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : (place.geometry.location.lng as number);

      updateField('location', addressText);
      updateField('coordinates', {lat, lng});
      setShowMapPreview(true);
    }
  };

  const handleMapClick = (latLng: { lat: number; lng: number }, address: string) => {
    updateField('location', address);
    updateField('coordinates', latLng);
  };

  const handleLocationChange = (value: string) => {
    updateField('location', value);
    updateField('coordinates', null);
    setShowMapPreview(false);
  };

  const handleInputFocus = () => {
    if (!isMobile) {
      setShowMapPreview(false);
    }
  };

  const handleLocationInputFocus = () => {
    setShowMapPreview(true);
  };

  const {
    draggedIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setDraggedIndex,
  } = usePhotoDragSort(formData.photos, sortPhotos);

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      sortPhotos(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const commonProps = {
    dark,
    formData,
    t,
    onClose,
    handleSubmit,
    updateField,
    addPhotos,
    removePhoto,
    sortPhotos,
    handleLocationSelect,
    handleLocationChange,
    handleMapClick,
    handleInputFocus,
    handleLocationInputFocus,
    showMapPreview,
    draggedIndex,
    handleDragStart: setDraggedIndex,
    handleDragEnter,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isUploading,
    isPageLoading,
    loading: isSubmitting, // 传递 isSubmitting 状态给 Footer
    isEditMode: !!diaryId, // 新增一个 prop 告诉子组件是编辑模式
    onOpenAI: () => setShowAIDialog(true),
  };

  // --- 渲染逻辑 ---
  const renderContent = () => {
    // 增加页面加载状态
    if (isUploading || isPageLoading || isSubmitting) return <Loading dark={dark}/>;

    return isMobile ? (
      <MobileLayout {...commonProps} />
    ) : (
      <DesktopLayout {...commonProps} />
    );
  };

  // 新增：处理 AI 生成逻辑
  const handleAIGenerate = async (prompt: string) => {
    try {
      const data = await generateDiaryDraft(prompt);

      const newFormData: FormDataT = {
        ...formData,
        title: data.title,
        location: data.location,
        coordinates: data.coordinates,
        dateStart: data.dateStart,
        dateEnd: data.dateEnd,
        transportation: data.transportation,
        content: data.content,
        type: 'visited',
      };

      setFormData(newFormData);

      // 如果有坐标，显示地图预览
      if (data.coordinates) {
        setShowMapPreview(true);
      }

      toast.success(t('ai.AI diary generated successfully'));
    } catch (error) {
      console.error('AI Generation Failed:', error);
      toast.error(t('ai.Generation failed'));
      throw error;
    }
  };

  return (
    <>
      {renderContent()}

      {/* 新增：AI Dialog */}
      <AIDiaryDialog
        isOpen={showAIDialog}
        onClose={() => setShowAIDialog(false)}
        onGenerate={handleAIGenerate}
        dark={dark}/>

      {/* 失败图片对话框 - 使用条件渲染 */}
      {showFailedPhotosDialog &&
        <UploadFailedDialog
          dark={dark}
          failedPhotos={failedPhotosList}
          t={t}
          onRetry={handleDialogRetry}
          onSkip={handleDialogSkip}
          onCancel={handleDialogClose}
          isRetrying={isRetryingFailedPhotos}
          isOpen={showFailedPhotosDialog}
        />
      }
    </>
  );

}
