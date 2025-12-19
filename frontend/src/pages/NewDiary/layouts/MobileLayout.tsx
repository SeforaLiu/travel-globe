import React from 'react';
import HeaderSection from '../sections/HeaderSection';
import TitleSection from '../sections/TitleSection';
import LocationSection from '../sections/LocationSection';
import DateSection from '../sections/DateSection';
import TransportationSection from '../sections/TransportationSection';
import ContentSection from '../sections/ContentSection';
import PhotoUploadSection from '../sections/PhotoUploadSection';
import FooterSection from '../sections/FooterSection';
import { FormData } from '../types';

type Props = {
  dark: boolean;
  formData: FormData;
  t: any;
  onClose: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  updatePhotoStatus: (index: number, status: 'pending' | 'uploading' | 'success' | 'error', publicId?: string, error?: string) => void;
  sortPhotos: (fromIndex: number, toIndex: number) => void;
  handleLocationSelect: (place: any) => void;
  handleLocationChange: (value: string) => void;
  handleMapClick: (latLng: { lat: number; lng: number }, address: string) => void;
  handleInputFocus: () => void;
  handleLocationInputFocus: () => void;
  showMapPreview: boolean;
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragEnter: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleTouchStart: (e: React.TouchEvent, index: number) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
};

const MobileLayout: React.FC<Props> = ({
                                         dark,
                                         formData,
                                         onClose,
                                         handleSubmit,
                                         updateField,
                                         addPhotos,
                                         removePhoto,
                                         updatePhotoStatus,
                                         sortPhotos,
                                         handleLocationSelect,
                                         handleLocationChange,
                                         handleMapClick,
                                         handleInputFocus,
                                         handleLocationInputFocus,
                                         draggedIndex,
                                         handleDragStart,
                                         handleDragEnter,
                                         handleDragEnd,
                                         handleTouchStart,
                                         handleTouchMove,
                                         handleTouchEnd,
                                         showMapPreview
                                       }) => {
  return (
    <div className={`fixed inset-0 z-50 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`flex flex-col h-full w-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`flex justify-between items-center p-4 ${dark ? 'bg-gray-800' : 'bg-gray-50'} border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">新增日记/攻略</h2>
          <button
            onClick={onClose}
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xl text-gray-600 dark:text-gray-300">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <TitleSection
              title={formData.title}
              type={formData.type}
              dark={dark}
              onFocus={handleInputFocus}
              onTitleChange={(value) => updateField('title', value)}
              onTypeChange={(value) => updateField('type', value)}
              isMobile={true}
            />

            <LocationSection
              location={formData.location}
              coordinates={formData.coordinates}
              dark={dark}
              onLocationSelect={handleLocationSelect}
              onLocationChange={handleLocationChange}
              onMapClick={handleMapClick}
              onInputFocus={handleLocationInputFocus}
              isMobile={true}
              showMapPreview={showMapPreview}
            />

            <DateSection
              dateRange={formData.dateRange}
              dark={dark}
              onFocus={handleInputFocus}
              onDateChange={(index, date) => {
                const newDateRange: [Date | null, Date | null] = [...formData.dateRange];
                newDateRange[index] = date;
                updateField('dateRange', newDateRange);
              }}
              isMobile={true}
            />

            <TransportationSection
              transportation={formData.transportation}
              dark={dark}
              onFocus={handleInputFocus}
              onChange={(value) => updateField('transportation', value)}
              isMobile={true}
            />

            <ContentSection
              content={formData.content}
              dark={dark}
              onChange={(value) => updateField('content', value)}
              onFocus={handleInputFocus}
              isMobile={true}
            />

            <PhotoUploadSection
              photos={formData.photos}
              dark={dark}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              updatePhotoStatus={updatePhotoStatus}
              onSortPhotos={sortPhotos}
              draggedIndex={draggedIndex}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onFocus={handleInputFocus}
              isMobile={true}
            />
          </div>

          <FooterSection
            dark={dark}
            onClose={onClose}
            onSubmit={handleSubmit}
            isMobile={true}
          />
        </form>
      </div>
    </div>
  );
};

export default MobileLayout;
