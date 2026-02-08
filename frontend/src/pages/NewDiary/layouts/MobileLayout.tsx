import React from 'react';
import TitleSection from '../sections/TitleSection';
import LocationSection from '../sections/LocationSection';
import DateSection from '../sections/DateSection';
import TransportationSection from '../sections/TransportationSection';
import ContentSection from '../sections/ContentSection';
import PhotoUploadSection from '../sections/PhotoUploadSection';
import FooterSection from '../sections/FooterSection';
import {FormData} from '../types';
import {Sparkles} from "lucide-react";
import {t} from "i18next";

type Props = {
  dark: boolean;
  formData: FormData;
  t: any;
  onClose: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  sortPhotos: (fromIndex: number, toIndex: number) => void;
  handleLocationSelect: (place: any) => void;
  handleLocationChange: (value: string) => void;
  handleMapClick: (latLng: { lat: number; lng: number }, address: string) => void;
  handleLocationInputFocus: () => void;
  showMapPreview: boolean;
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragEnter: (e: React.DragEvent, index: number) => void;
  handleTouchStart: (e: React.TouchEvent, index: number) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  isUploading: boolean;
  loading?: boolean;
  isEditMode?: boolean;
  onOpenAI?: () => void;
};

const MobileLayout: React.FC<Props> = ({
                                         dark,
                                         formData,
                                         onClose,
                                         handleSubmit,
                                         updateField,
                                         addPhotos,
                                         removePhoto,
                                         sortPhotos,
                                         handleLocationSelect,
                                         handleLocationChange,
                                         handleMapClick,
                                         handleLocationInputFocus,
                                         draggedIndex,
                                         handleDragStart,
                                         handleDragEnter,
                                         handleTouchStart,
                                         handleTouchMove,
                                         handleTouchEnd,
                                         showMapPreview,
                                         isUploading,
                                         loading,
                                         isEditMode,
                                         onOpenAI
                                       }) => {
  return (
    <div className={`fixed inset-0 z-50 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className={`flex flex-col h-full w-full ${dark ? 'bg-gray-900' : 'bg-white'}`}>
        <div
          className={`flex justify-between items-center p-4 ${dark ? 'bg-gray-800' : 'bg-gray-50'} border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{isEditMode ? t('common.edit') : t('addNewDiaryOrGuide')}</h2>
            {onOpenAI && !isEditMode && (
              <button
                onClick={onOpenAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-200 dark:border-blue-800 transition-all group"
              >
                <Sparkles size={14} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"/>
                <span
                  className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {t('ai.diary generator mobile name')}
                </span>
              </button>
            )}
          </div>
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
              dateStart={formData.dateStart}
              dateEnd={formData.dateEnd}
              dark={dark}
              onDateChange={(dateStart, dateEnd) => {
                updateField('dateStart', dateStart);
                updateField('dateEnd', dateEnd);
              }}
              isMobile={true}
            />

            <TransportationSection
              transportation={formData.transportation}
              dark={dark}
              onChange={(value) => updateField('transportation', value)}
              isMobile={true}
            />

            <ContentSection
              content={formData.content}
              dark={dark}
              onChange={(value) => updateField('content', value)}
              isMobile={true}
            />

            <PhotoUploadSection
              photos={formData.photos}
              dark={dark}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              onSortPhotos={sortPhotos}
              draggedIndex={draggedIndex}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              isMobile={true}
            />
          </div>

          <FooterSection
            dark={dark}
            onClose={onClose}
            onSubmit={handleSubmit}
            isMobile={true}
            isUploading={isUploading}
            loading={loading}
          />
        </form>
      </div>
    </div>
  );
};

export default MobileLayout;
