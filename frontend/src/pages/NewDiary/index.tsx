// frontend/src/pages/NewDiary/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import { useFormData } from './hooks/useFormData';
import { usePhotoDragSort } from './hooks/usePhotoDragSort';
import { useCloudinaryUpload } from './hooks/useCloudinaryUpload';
import { Props, LocationResult } from './types';
import UploadFailedDialog from './components/UploadFailedDialog';
import Loading from "../../components/Loading"
import {useGoogleMaps} from "@/hooks/useGoogleMaps";

export default function NewDiary({ isMobile, onClose, onSubmit, dark, loading }: Props) {
  const { t } = useTranslation();
  const {
    formData,
    updateField,
    addPhotos,
    removePhoto,
    sortPhotos,
    updatePhotoStatusByFile
  } = useFormData();
  const { uploadPhotos, resetCache } = useCloudinaryUpload();

  useGoogleMaps()

  const [showMapPreview, setShowMapPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showFailedPhotosDialog, setShowFailedPhotosDialog] = useState(false);
  const [failedPhotosList, setFailedPhotosList] = useState<Array<{
    file: File;
    error?: string;
  }>>([]);
  // 新增：重试加载状态
  const [isRetryingFailedPhotos, setIsRetryingFailedPhotos] = useState(false);
  const [userAction, setUserAction] = useState<'retry' | 'skip' | null>(null);
  const [isWaitingForUserAction, setIsWaitingForUserAction] = useState(false);

  // 使用 useRef 来获取最新的 formData
  const formDataRef = useRef(formData);
  // 同步最新的 formData 到 ref
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // 组件卸载时重置上传缓存
  useEffect(() => {
    return () => {
      resetCache();
    };
  }, [resetCache]);

  // 修改：处理失败图片重试的函数（增加加载状态）
  const handleRetryFailedPhotos = useCallback((failedPhotos: Array<{file: File; error?: string}>) => {
    console.log('用户选择重试失败的图片');
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
      toast.success(t('photos.retryStarted', { count: failedPhotos.length }) || `正在重试 ${failedPhotos.length} 张图片`);
    } catch (error) {
      console.error('重置失败图片状态时出错:', error);
      toast.error(t('photos.retryFailed') || '重试失败，请稍后重试');
    } finally {
      // 延迟一点时间再重置加载状态，让用户看到操作反馈
      setTimeout(() => {
        setIsRetryingFailedPhotos(false);
      }, 500);
    }
  }, [updatePhotoStatusByFile, t]);

  // 修改：处理跳过失败图片的函数
  const handleSkipFailedPhotos = useCallback(() => {
    console.log('用户选择跳过失败的图片');
    setUserAction('skip');
    // 继续执行提交逻辑，失败的图片会被过滤掉
  }, []);

  // 修改：显示失败图片对话框（简化逻辑）
  const showFailedPhotosDialogModal = useCallback((failedPhotos: Array<{file: File; error?: string}>) => {
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

  // 修改：提取提交逻辑到单独的函数（修复依赖）
  const proceedWithSubmit = useCallback((currentFormData: any, successPhotos: any[]) => {
    // 准备提交的数据
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

    const submitData = {
      ...currentFormData,
      photos: photosToSubmit
    };

    console.log('准备提交的数据:', {
      ...submitData,
      photosCount: submitData.photos.length
    });

    // 最终提交
    onSubmit(submitData);

    // 提交完成后可以关闭 toast，但注意：onSubmit 可能是异步的
    // 如果 onSubmit 是异步操作，应该在它完成后关闭 toast
  }, [onSubmit, t]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 防止重复提交
    if (isUploading) {
      console.log('正在上传中，请稍候...');
      toast.info(t('uploadingInProgress') || '正在上传中，请稍候...');
      return;
    }

    // 检查是否有正在重试的操作
    if (isRetryingFailedPhotos) {
      console.log('正在重试失败图片，请稍候...');
      toast.info(t('photos.retryInProgress') || '正在重试上传失败图片，请稍候...');
      return;
    }

    console.log('开始提交，当前照片状态:', formDataRef.current.photos.map(p => ({
      fileName: p.file.name,
      status: p.status,
      error: p.error
    })));

    // 第一步：检查是否有失败的图片
    const failedPhotos = formDataRef.current.photos.filter(p => p.status === 'error');

    if (failedPhotos.length > 0 && !isWaitingForUserAction && userAction === null) {
      console.log('发现失败的图片:', failedPhotos.map(p => p.file.name));

      // 显示失败图片对话框
      showFailedPhotosDialogModal(failedPhotos.map(p => ({
        file: p.file,
        error: p.error
      })));

      // 等待用户做出选择
      return;
    }

    // 如果用户选择了重试，我们需要重新执行提交逻辑
    if (userAction === 'retry') {
      console.log('用户选择重试，等待重试完成...');
      setUserAction(null); // 重置用户操作
      // 这里我们可以延迟一点时间，让重试状态生效
      setTimeout(() => {
        // 重新触发提交，但使用队列的方式避免重复
        handleSubmit(e);
      }, 800); // 增加延迟时间，确保重试状态更新完成
      return;
    }

    // 第二步：检查并上传所有待处理的图片
    const photosToUpload = formDataRef.current.photos.filter(photo =>
      photo.status === 'pending'
    );

    console.log('需要上传的图片数量:', photosToUpload.length, {
      pending: photosToUpload.length,
      error: formDataRef.current.photos.filter(p => p.status === 'error').length
    });

    if (photosToUpload.length > 0) {
      try {
        setIsUploading(true);
        console.log('开始上传图片...');

        const uploadResults = await uploadPhotos(
          photosToUpload.map(p => ({
            file: p.file,
            url: p.url,
            status: p.status
          })),
          (index, status, result, error) => {
            const targetFile = photosToUpload[index].file;

            console.log('上传回调 - 最终状态:', {
              index,
              fileName: targetFile.name,
              status,
              hasResult: !!result,
              error: error || '无错误'
            });

            // 更新照片状态
            updatePhotoStatusByFile(
              targetFile,
              status,
              status === 'success' ? result : undefined,
              error
            );
          }
        );

        console.log('图片上传完成，成功数量:', uploadResults.length);
      } catch (error) {
        console.error('上传过程中出现错误:', error);
        toast.error(
          t('uploadFailed') || '图片上传失败，请检查网络连接后重试'
        );
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // 第三步：等待状态完全更新（增加等待时间）
    await new Promise(resolve => setTimeout(resolve, 200));

    // 第四步：检查上传结果并准备提交
    const currentFormData = formDataRef.current;

    // 检查是否有仍在处理中的图片
    const unfinishedPhotos = currentFormData.photos.filter(p =>
      p.status === 'pending' || p.status === 'uploading'
    );

    if (unfinishedPhotos.length > 0) {
      console.error('仍有图片未完成上传，无法提交');
      toast.error(
        t('photos.stillUploading') || '仍有图片在上传中，请稍候再提交'
      );
      return;
    }

    // 检查上传结果
    const successPhotos = currentFormData.photos.filter(p => p.status === 'success' && p.cloudinary);
    const newFailedPhotos = currentFormData.photos.filter(p => p.status === 'error');

    console.log('上传结果统计:', {
      总图片数: currentFormData.photos.length,
      成功数: successPhotos.length,
      失败数: newFailedPhotos.length
    });

    // 如果有新的失败图片，显示通知
    if (newFailedPhotos.length > 0 && userAction !== 'skip') {
      // 显示询问用户是否继续的对话框
      showFailedPhotosDialogModal(newFailedPhotos.map(p => ({
        file: p.file,
        error: p.error
      })));
      return;
    }

    // 如果没有新的失败图片，或者用户选择跳过，直接提交
    proceedWithSubmit(currentFormData, successPhotos);
  }, [
    isUploading,
    isRetryingFailedPhotos,
    uploadPhotos,
    updatePhotoStatusByFile,
    t,
    userAction,
    isWaitingForUserAction,
    handleRetryFailedPhotos,
    handleSkipFailedPhotos,
    showFailedPhotosDialogModal,
    proceedWithSubmit
  ]);

  const handleLocationSelect = (place: LocationResult) => {
    console.log('选择了地址', place);
    if (place.geometry?.location) {
      const addressText = place.formatted_address || place.name || '';
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : (place.geometry.location.lat as number);
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : (place.geometry.location.lng as number);

      updateField('location', addressText);
      updateField('coordinates', { lat, lng });
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
    if(!isMobile){
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
    updatePhotoStatusByFile,
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
    loading,
  };

  const renderContent = () => {
    if (isUploading) return <Loading dark={dark} />;

    return isMobile ? (
      <MobileLayout {...commonProps} />
    ) : (
      <DesktopLayout {...commonProps} />
    );
  };

  return (
    <>
      {renderContent()}

      {/* 失败图片对话框 - 使用条件渲染 */}
      {showFailedPhotosDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleDialogClose}
            />

            {/* 对话框内容 - 使用通用组件 */}
            <div className="relative transform overflow-hidden rounded-lg shadow-xl transition-all w-full max-w-md">
              <UploadFailedDialog
                dark={dark}
                failedPhotos={failedPhotosList}
                t={t}
                onRetry={handleDialogRetry}
                onSkip={handleDialogSkip}
                onCancel={handleDialogClose}
                // 新增：传递重试加载状态
                isRetrying={isRetryingFailedPhotos}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
