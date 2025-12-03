// DiaryForm.tsx
import React, {lazy, useState, Suspense, startTransition } from 'react';
import {useTranslation} from 'react-i18next';

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
  dark:boolean;
};

export default function NewDiary({isMobile, onClose, onSubmit}: Props) {
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

  // @ts-ignore
  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    if (place.geometry?.location) {
      setFormData({
        ...formData,
        location: place.formatted_address || '',
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        },
      });
    }
  };

  const handleChange = (value: string) => {
    startTransition(() => {
      setFormData({...formData, content: value || ''});
    });
  };

  return (
    <>
      {/* 背景遮罩层 */}
      <div
        className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 表单容器 - 居中显示 */}
      <div
        className={`fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          ${isMobile ? 'w-full h-full' : 'w-[40vw] h-[80vh]'}`}
      >
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col
          ${isMobile ? 'w-full h-full rounded-none' : 'w-full h-full'}`}
        >
          {/* 表单头部 */}
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">{t('addNewEntry')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('title')} *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {/* 类型 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('type')} *</label>
                <select
                  className="w-full p-2 border rounded"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'visited' | 'wishlist'})}
                  required
                >
                  <option value="visited">{t('visited')}</option>
                  <option value="wishlist">{t('wishlist')}</option>
                </select>
              </div>

              {/* 地点 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('location')} *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
                {formData.coordinates && (
                  <div className="mt-2 h-40 border rounded">
                    <div className="flex items-center justify-center h-full text-gray-400">
                      地图预览 (纬度: {formData.coordinates.lat}, 经度: {formData.coordinates.lng})
                    </div>
                  </div>
                )}
              </div>

              {/* 日期 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('date')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    className="flex-1 p-2 border rounded"
                    onChange={(e) => setFormData({
                      ...formData,
                      dateRange: [e.target.valueAsDate, formData.dateRange[1]]
                    })}
                  />
                  <span className="text-gray-500">至</span>
                  <input
                    type="date"
                    className="flex-1 p-2 border rounded"
                    onChange={(e) => setFormData({
                      ...formData,
                      dateRange: [formData.dateRange[0], e.target.valueAsDate]
                    })}
                  />
                </div>
              </div>

              {/* 交通方式 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('transportation')}</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formData.transportation}
                  onChange={(e) => setFormData({...formData, transportation: e.target.value})}
                />
              </div>

              {/* 文本内容 */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('content')}</label>
                <div className="border rounded overflow-hidden" data-color-mode="light">
                  <Suspense fallback={<div className="h-[500px] flex items-center justify-center">加载编辑器中...</div>}>
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
                <label className="block text-sm font-medium mb-1">{t('photos')}</label>
                <div className="border-2 border-dashed rounded p-4 text-center hover:bg-gray-50 transition-colors">
                  <p>拖放照片到这里或点击上传</p>
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
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    选择照片
                  </button>
                </div>
                {formData.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative w-20 h-20 border rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center hover:bg-red-600"
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
            <div className="mt-auto p-4 border-t flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
                onClick={onClose}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                {t('submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
