// noinspection LanguageDetectionInspection
import React, {useCallback, useEffect, lazy, useState, Suspense, startTransition} from 'react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleMapClick = (latLng: { lat: number, lng: number }, address: string) => {
    // 这个 address 是通过 MapPreview 内部的逆地理编码获取的
    setFormData(prev => ({
      ...prev,
      location: address, // 设置 input 框的地址
      coordinates: latLng, // 设置坐标
    }));
    // 理论上，更新完 state 后，LocationSearch 的 value 会更新，MapPreview 也会重新渲染
  };

  const handleChange = (value: string) => {
    setFormData({...formData, content: value || ''});
    console.log('正文内容', formData.content)
    // startTransition(() => {
    //   setFormData({...formData, content: value || ''});
    // });
  };


// 在 NewDiary.tsx 中添加调试和确保函数稳定
  const handleLocationSelect = useCallback((place: google.maps.places.PlaceResult) => {
    console.log('handleLocationSelect 被调用, place:', place);
    console.log('place.formatted_address:', place.formatted_address);
    console.log('place.geometry:', place.geometry);

    if (place.geometry?.location) {
      // 获取显示的地址名称
      const addressText = place.formatted_address || place.name || '';
      console.log('设置地址为:', addressText);

      // 获取经纬度
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : (place.geometry.location.lat as number);
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : (place.geometry.location.lng as number);
      console.log('设置坐标:', { lat, lng });

      // 使用函数式更新确保状态正确
      setFormData(prev => ({
        ...prev,
        location: addressText,
        coordinates: { lat, lng },
      }));
    } else {
      console.warn('地点没有几何信息:', place);
    }
  }, []); // 使用空依赖数组确保函数稳定

// 添加useEffect监听formData变化进行调试
  useEffect(() => {
    console.log('formData 更新:', {
      location: formData.location,
      coordinates: formData.coordinates,
    });
  }, [formData.location, formData.coordinates]);


  // 这里的 handleChange 保持不变，用于处理手动输入的情况
  // 如果用户手动修改了输入框文字，坐标清空
  const handleLocationChange = (value: string) => {
    console.log('handleLocationChange -- 手动改变了location-----',formData.coordinates)
    setFormData(prev => ({
      ...prev,
      location: value,
      coordinates: null
    }));
    console.log('handleLocationChange -- 手动改变了location end-----',formData.coordinates)
  };

// PC端布局
  if (!isMobile) {
    return (
      <div className={`h-full p-6 overflow-hidden ${
        dark ?
          "bg-gradient-to-b from-black to-[#282840]" : // 夜晚模式渐变
          "bg-gradient-to-b from-blue-900 to-blue-200" // 白天模式渐变
      }`}>
        <div className="max-w-7xl mx-auto bg-white/80 dark:bg-gray-800/90 rounded-xl shadow-lg overflow-hidden">
          {/* 表单头部 */}
          <div className="flex justify-between items-center p-4 bg-blue-500 dark:bg-gray-500 text-white">
            <h2 className="text-xl font-bold ">{t('addNewDiaryOrGuide')}</h2>
            <button
              onClick={onClose}
              className="rounded bg-blue-500 dark:bg-gray-500 text-white hover:text-gray-200 text-2xl transition-colors"
            >
              &times;
            </button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {/* 类型 */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('AddType')}<span className="text-red-500"> *</span>
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'visited' | 'wishlist'})}
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
                // 注意这里：传递专门处理 input 变化的函数
                onChange={handleLocationChange}
              />
              {formData.coordinates && (
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  value={formData.transportation}
                  onChange={(e) => setFormData({...formData, transportation: e.target.value})}
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
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [e.target.valueAsDate, formData.dateRange[1]]
                  })}
                />
                <span className="text-gray-500 dark:text-gray-400">至</span>
                <input
                  type="date"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [formData.dateRange[0], e.target.valueAsDate]
                  })}
                />
              </div>
            </div>

            {/* 文本内容 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('AddContent')}
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden dark:border-gray-600"
                   data-color-mode={dark ? 'dark' : 'light'}>
                <Suspense fallback={<div className="h-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-700">加载编辑器中...</div>}>
                  <MarkdownEditor
                    value={formData.content}
                    // @ts-ignore
                    onChange={handleChange}
                    height={500}
                  />
                </Suspense>
              </div>
            </div>

            {/* 照片上传 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('AddPhotos')}
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors cursor-pointer">
                <p className="text-gray-500 dark:text-gray-400">{t('AddSelectPhotosTip')}</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="photo-upload"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFormData({
                        ...formData,
                        photos: [...formData.photos, ...Array.from(e.target.files)]
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  {t('AddSelectPhotosButton')}
                </button>
              </div>
              {formData.photos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative w-24 h-24 border border-gray-300 rounded-lg overflow-hidden dark:border-gray-600">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-600 transition-colors"
                        onClick={() => {
                          const newPhotos = [...formData.photos];
                          newPhotos.splice(index, 1);
                          setFormData({...formData, photos: newPhotos});
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 表单底部按钮 */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors"
                onClick={onClose}
              >
                {t('AddCancelButton')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('AddSubmitButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 移动端布局
  return (
    <div
      className={`fixed inset-0 z-50 ${dark ? 'bg-gray-900' : 'bg-blue-900'}`}
    >
      <div className={`flex flex-col h-full w-full ${dark ? 'bg-gray-800' : 'bg-white/90'}`}>
        {/* 表单头部 */}
        <div className={`flex justify-between items-center p-2 ${dark ? 'bg-gray-700' : 'bg-blue-500'} text-white`}>
          <h2 className="text-xl font-bold">{t('addNewDiaryOrGuide')}</h2>
          <button
            onClick={onClose}
            className={`rounded p-1 ${dark ? 'bg-gray-700' : 'bg-blue-500'} text-white hover:opacity-80 text-2xl transition-colors`}
          >
            &times;
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 标题 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddTitle')}<span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                required
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            {/* 类型 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddType')}<span className="text-red-500"> *</span>
              </label>
              <select
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'visited' | 'wishlist'})}
                required
              >
                <option value="visited">{t('AddTypeVisited')}</option>
                <option value="wishlist">{t('AddTypeWishList')}</option>
              </select>
            </div>

            {/* 地点 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddLocation')}<span className="text-red-500"> *</span>
              </label>
              <LocationSearch
                onSelect={handleLocationSelect}
                value={formData.location}
                // onChange={(value) => setFormData({...formData, location: value})}
                // 注意这里：传递专门处理 input 变化的函数
                onChange={handleLocationChange}
              />

              {formData.coordinates && (
                <MapPreview
                  lat={formData.coordinates.lat}
                  lng={formData.coordinates.lng}
                  dark={dark}
                  // 2. 将新的处理函数作为 prop 传递
                  onMapClick={handleMapClick}
                />
              )}

            </div>

            {/* 日期 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddDate')}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [e.target.valueAsDate, formData.dateRange[1]]
                  })}
                />
                <span className={dark ? 'text-gray-400' : 'text-gray-500'}>至</span>
                <input
                  type="date"
                  className={`flex-1 p-3 border rounded-lg ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: [formData.dateRange[0], e.target.valueAsDate]
                  })}
                />
              </div>
            </div>

            {/* 交通方式 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddTransportation')}
              </label>
              <input
                type="text"
                className={`w-full p-3 border rounded-lg ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                value={formData.transportation}
                onChange={(e) => setFormData({...formData, transportation: e.target.value})}
              />
            </div>

            {/* 文本内容 */}
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
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                rows={10}
              />
            </div>

            {/* 照片上传 */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('AddPhotos')}
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center ${dark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition-colors`}
              >
                <p className={dark ? 'text-gray-400' : 'text-gray-500'}>{t('AddSelectPhotosTip')}</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="photo-upload"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFormData({
                        ...formData,
                        photos: [...formData.photos, ...Array.from(e.target.files)]
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  className={`mt-3 px-4 py-2 rounded-lg ${dark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  {t('AddSelectPhotosButton')}
                </button>
              </div>
              {formData.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className={`relative w-20 h-20 rounded-lg overflow-hidden ${dark ? 'border-gray-600' : 'border-gray-300'} border`}>
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full ${dark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                        onClick={() => {
                          const newPhotos = [...formData.photos];
                          newPhotos.splice(index, 1);
                          setFormData({...formData, photos: newPhotos});
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 表单底部按钮 */}
          <div className={`p-4 border-t ${dark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-3`}>
            <button
              type="button"
              className={`px-6 py-2 rounded-lg ${dark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'} border transition-colors`}
              onClick={onClose}
            >
              {t('AddCancelButton')}
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg ${dark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
            >
              {t('AddSubmitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
