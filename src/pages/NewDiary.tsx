import React, {useCallback, lazy, useState, Suspense} from 'react';
import {useTranslation} from 'react-i18next';
import MapPreview from "../components/MapPreview";
import LocationSearch from "../components/LocationSearch";

const MarkdownEditor = lazy(() => import('@uiw/react-md-editor'));

type FormData = {
  title: string;
  type: 'visited' | 'wishlist';
  location: string;
  coordinates: { lat: number; lng: number } | null;
  dateRange: [Date | null, Date | null];
  transportation: string;
  content: string;
  photos: File[];
};

type Props = {
  isMobile: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  dark: boolean;
};

export default function NewDiary({isMobile, onClose, onSubmit, dark}: Props) {
  const {t} = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'visited',
    location: '',
    coordinates: null,
    dateRange: [null, null],
    transportation: '',
    content: '',
    photos: [],
  });
  const [showMapPreview, setShowMapPreview] = useState(false);

  // 拖拽排序状态：用于存储正在拖动的图片索引
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 移动端模拟拖拽排序的状态（长按/触摸排序）
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0, index: -1, isDragging: false });


  /**
   * 图片拖拽排序逻辑
   * @param fromIndex 拖动的起始索引
   * @param toIndex 拖动的目标索引
   */
  const handleSort = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= formData.photos.length || toIndex >= formData.photos.length) {
      return;
    }
    const newPhotos = [...formData.photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    setFormData(prev => ({
      ...prev,
      photos: newPhotos,
    }));
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);
    setFormData({...formData, photos: newPhotos});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleMapClick = (latLng: { lat: number, lng: number }, address: string) => {
    setFormData(prev => ({
      ...prev,
      location: address,
      coordinates: latLng,
    }));
  };

  const handleChange = (value: string) => {
    setFormData({...formData, content: value || ''});
  };

  // @ts-ignore
  const handleLocationSelect = useCallback((place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      const addressText = place.formatted_address || place.name || '';
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : (place.geometry.location.lat as number);
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : (place.geometry.location.lng as number);

      setFormData(prev => ({
        ...prev,
        location: addressText,
        coordinates: { lat, lng },
      }));

      setShowMapPreview(true)
    }
  }, []);

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      location: value,
      coordinates: null
    }));
    setShowMapPreview(false)
  };

  const handleInputFocus = () => {
    setShowMapPreview(false);
  };

  const handleLocationInputFocus = () => {
    setShowMapPreview(true);
  };

  // 移动端辅助函数：根据坐标找到图片索引
  const getTouchedPhotoIndex = (clientX: number, clientY: number) => {
    const photoElements = document.querySelectorAll('.mobile-photo-item');
    for (let i = 0; i < photoElements.length; i++) {
      const rect = photoElements[i].getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        // 使用 dataset 获取元素的原始索引
        return parseInt(photoElements[i].getAttribute('data-index') || '-1');
      }
    }
    return -1;
  };

  // 移动端触摸开始事件
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.stopPropagation();

    const touch = e.touches[0];
    setTouchStartPos({
      x: touch.clientX,
      y: touch.clientY,
      index: index,
      isDragging: true,
    });
    setDraggedIndex(index); // 标记当前拖动的索引
  };

  // 移动端触摸移动事件（模拟拖拽）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.isDragging || touchStartPos.index === -1) return;
    e.preventDefault(); // 阻止默认的滚动行为

    const touch = e.touches[0];
    const targetIndex = getTouchedPhotoIndex(touch.clientX, touch.clientY);

    if (targetIndex !== -1 && draggedIndex !== null && targetIndex !== draggedIndex) {
      handleSort(draggedIndex, targetIndex);
      setDraggedIndex(targetIndex); // 更新拖动元素的索引到新位置
    }
  };

  // 移动端触摸结束事件
  const handleTouchEnd = () => {
    setTouchStartPos({ x: 0, y: 0, index: -1, isDragging: false });
    setDraggedIndex(null); // 重置拖动状态
  };


  // PC端布局
  if (!isMobile) {
    return (
      <div className={`h-full p-6 overflow-hidden ${dark ? "bg-black" : "bg-white"}`}>
        <div className={`max-w-full mx-auto ${dark ? "bg-gray-900" : "bg-white"} rounded-xl shadow-lg overflow-hidden`}>
          {/* 表单头部 - 苹果风格标题栏 */}
          <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('addNewDiaryOrGuide')}</h2>
            <button
              onClick={onClose}
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-xl text-gray-600 dark:text-gray-300">&times;</span>
            </button>
          </div>

          {/* 表单内容 - 苹果风格表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto scrollbar-custom" style={{maxHeight: 'calc(100vh - 120px)'}}>
            {/*主要内容*/}
            <div className="">
              {/* 第一行：标题和类型 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 标题 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('AddTitle')}<span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    onFocus={handleInputFocus}
                  />
                </div>

                {/* 类型 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('AddType')}<span className="text-red-500"> *</span>
                  </label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'visited' | 'wishlist'})}
                    onFocus={handleInputFocus}
                    required
                  >
                    <option value="visited">{t('AddTypeVisited')}</option>
                    <option value="wishlist">{t('AddTypeWishList')}</option>
                  </select>
                </div>
              </div>

              {/* 第二行：地点和交通方式 */}
              <div className="grid grid-cols-2 gap-6">
                {/* 地点 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('AddLocation')}<span className="text-red-500"> *</span>
                  </label>
                  <LocationSearch
                    onSelect={handleLocationSelect}
                    value={formData.location}
                    onChange={handleLocationChange}
                    onFocus={handleLocationInputFocus}
                  />
                  {formData.coordinates && showMapPreview &&(
                    <MapPreview
                      lat={formData.coordinates.lat}
                      lng={formData.coordinates.lng}
                      dark={dark}
                      onMapClick={handleMapClick}
                    />
                  )}
                </div>

                {/* 交通方式 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('AddTransportation')}
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
                    value={formData.transportation}
                    onChange={(e) => setFormData({...formData, transportation: e.target.value})}
                    onFocus={handleInputFocus}
                  />
                </div>
              </div>

              {/* 第三行：日期 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('AddDate')}
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="date"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
                    onChange={(e) => setFormData({
                      ...formData,
                      dateRange: [e.target.valueAsDate, formData.dateRange[1]]
                    })}
                    onFocus={handleInputFocus}
                  />
                  <span className="text-gray-500 dark:text-gray-400">至</span>
                  <input
                    type="date"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500"
                    onChange={(e) => setFormData({
                      ...formData,
                      dateRange: [formData.dateRange[0], e.target.valueAsDate]
                    })}
                    onFocus={handleInputFocus}
                  />
                </div>
              </div>

              {/* 文本内容 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('AddContent')}
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden dark:border-gray-700"
                     data-color-mode={dark ? 'dark' : 'light'}>
                  <Suspense fallback={<div className="h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-800">加载编辑器中...</div>}>
                    <MarkdownEditor
                      value={formData.content}
                      // @ts-ignore
                      onChange={handleChange}
                      height={500}
                      onFocus={handleInputFocus}
                    />
                  </Suspense>
                </div>
              </div>

              {/* 照片上传 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('AddPhotos')}
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50/50');
                    e.currentTarget.classList.remove('border-gray-300', 'dark:border-gray-700');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50');
                    e.currentTarget.classList.add('border-gray-300', 'dark:border-gray-700');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50');
                    e.currentTarget.classList.add('border-gray-300', 'dark:border-gray-700');

                    const files = Array.from(e.dataTransfer.files).filter(file =>
                      file.type.startsWith('image/')
                    );

                    if (files.length > 0) {
                      setFormData(prev => ({
                        ...prev,
                        photos: [...prev.photos, ...files]
                      }));
                    }
                  }}
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <p className="text-gray-500 dark:text-gray-400">{t('AddSelectPhotosTip')}</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    id="photo-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFormData(prev => ({
                          ...prev,
                          // @ts-ignore
                          photos: [...prev.photos, ...Array.from(e.target.files)]
                        }));
                      }
                    }}
                    onFocus={handleInputFocus}
                  />
                  <button
                    type="button"
                    className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {t('AddSelectPhotosButton')}
                  </button>
                </div>
                {formData.photos.length > 0 && (
                  <div
                    className="mt-4 flex max-h-60 overflow-x-auto p-2"
                    onDragOver={(e) => e.preventDefault()} // 允许拖拽放置
                  >
                    {formData.photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`relative mr-3 w-24 h-24 aspect-square border rounded-lg overflow-hidden cursor-move ${draggedIndex === index ? 'opacity-50 border-blue-500' : (dark ? 'border-gray-700' : 'border-gray-200')}`}
                        // **PC端 拖拽事件**
                        draggable
                        onDragStart={() => setDraggedIndex(index)}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && draggedIndex !== index) {
                            handleSort(draggedIndex, index);
                            // 立即更新 draggedIndex，使其指向新的位置，以实现更自然的排序效果
                            setDraggedIndex(index);
                          }
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                      >
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-600 transition-colors"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 底部按钮 - 固定在底部 */}
            <div className=" bottom-0 bg-white dark:bg-gray-900 pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={onClose}
                >
                  {t('AddCancelButton')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  {t('AddSubmitButton')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 移动端布局
  return (
    <div className={`fixed inset-0 z-50 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`flex flex-col h-full w-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* 头部栏 - 类似iOS风格 移动端布局 */}
        <div className={`flex justify-between items-center p-4 ${dark ? 'bg-gray-800' : 'bg-gray-50'} border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('addNewDiaryOrGuide')}</h2>
          <button
            onClick={onClose}
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xl text-gray-600 dark:text-gray-300">&times;</span>
          </button>
        </div>

        {/* 表单内容 移动端布局 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 标题 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddTitle')}<span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                required
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            {/* 类型 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddType')}<span className="text-red-500"> *</span>
              </label>
              <select
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'visited' | 'wishlist'})}
                required
              >
                <option value="visited">{t('AddTypeVisited')}</option>
                <option value="wishlist">{t('AddTypeWishList')}</option>
              </select>
            </div>

            {/* 地点 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddLocation')}<span className="text-red-500"> *</span>
              </label>
              <LocationSearch
                onSelect={handleLocationSelect}
                value={formData.location}
                onChange={handleLocationChange}
                onFocus={handleLocationInputFocus}
              />
              {formData.coordinates && showMapPreview && (
                <MapPreview
                  lat={formData.coordinates.lat}
                  lng={formData.coordinates.lng}
                  dark={dark}
                  onMapClick={handleMapClick}
                />
              )}
            </div>

            {/* 日期 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddDate')}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [e.target.valueAsDate, formData.dateRange[1]]
                  })}
                />
                <span className={dark ? 'text-gray-400' : 'text-gray-500'}>至</span>
                <input
                  type="date"
                  className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [formData.dateRange[0], e.target.valueAsDate]
                  })}
                />
              </div>
            </div>

            {/* 交通方式 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddTransportation')}
              </label>
              <input
                type="text"
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                value={formData.transportation}
                onChange={(e) => setFormData({...formData, transportation: e.target.value})}
              />
            </div>

            {/* 文本内容 移动端布局 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddContent')}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="请输入内容"
                className={`w-full h-[300px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-1 ${
                  dark
                    ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                rows={10}
              />
            </div>

            {/* 照片上传 - 移动端 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddPhotos')}
              </label>
              <button
                type="button"
                className={`w-full py-3 px-4 rounded-lg ${dark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors flex items-center justify-center`}
                onClick={() => document.getElementById('photo-upload-mobile')?.click()}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('AddSelectPhotosButton')}
              </button>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="photo-upload-mobile"
                onChange={(e) => {
                  if (e.target.files) {
                    setFormData(prev => ({
                      ...prev,
                      // @ts-ignore
                      photos: [...prev.photos, ...Array.from(e.target.files)]
                    }));
                  }
                }}
              />

              {/* 照片预览 移动端布局*/}
              {formData.photos.length > 0 && (
                <div
                  className="mt-3 grid grid-cols-3 gap-2"
                  // **移动端 触摸事件**
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  {formData.photos.map((photo, index) => (
                    <div
                      key={index}
                      className={`relative aspect-square rounded-lg overflow-hidden border mobile-photo-item ${draggedIndex === index ? 'opacity-50 border-blue-500' : (dark ? 'border-gray-700' : 'border-gray-300')}`}
                      data-index={index} // 用于在 touchMove 中查找元素索引
                      onTouchStart={(e) => handleTouchStart(e, index)}
                    >
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full ${dark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止触发 touchStart/Move
                          handleRemovePhoto(index);
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 底部按钮栏 - 类似iOS风格 移动端布局*/}
          <div className={`p-4 border-t ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex justify-end gap-3`}>
            <button
              type="button"
              className="px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={onClose}
            >
              {t('AddCancelButton')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              {t('AddSubmitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}