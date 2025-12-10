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

const DesktopLayout: React.FC<Props> = ({
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
    <div className={`h-full p-6 overflow-hidden ${dark ? "bg-black" : "bg-white"}`}>
      <div className={`max-w-full mx-auto ${dark ? "bg-gray-900" : "bg-white"} rounded-xl shadow-lg overflow-hidden`}>
        <HeaderSection dark={dark} onClose={onClose} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto scrollbar-custom" style={{maxHeight: 'calc(100vh - 120px)'}}>
          <div className="space-y-6">
            <TitleSection
              title={formData.title}
              type={formData.type}
              dark={dark}
              onFocus={handleInputFocus}
              onTitleChange={(value) => updateField('title', value)}
              onTypeChange={(value) => updateField('type', value)}
            />

            <div className="grid grid-cols-2 gap-6">
              <LocationSection
                location={formData.location}
                coordinates={formData.coordinates}
                dark={dark}
                onLocationSelect={handleLocationSelect}
                onLocationChange={handleLocationChange}
                onMapClick={handleMapClick}
                onInputFocus={handleLocationInputFocus}
                showMapPreview={showMapPreview}
              />

              <TransportationSection
                transportation={formData.transportation}
                dark={dark}
                onFocus={handleInputFocus}
                onChange={(value) => updateField('transportation', value)}
              />
            </div>

            <DateSection
              dateRange={formData.dateRange}
              dark={dark}
              onFocus={handleInputFocus}
              onDateChange={(index, date) => {
                const newDateRange: [Date | null, Date | null] = [...formData.dateRange];
                newDateRange[index] = date;
                updateField('dateRange', newDateRange);
              }}
            />

            <ContentSection
              content={formData.content}
              dark={dark}
              onChange={(value) => updateField('content', value)}
              onFocus={handleInputFocus}
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
              onDragEnd={handleDragEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onFocus={handleInputFocus}
            />
          </div>

          <FooterSection
            dark={dark}
            onClose={onClose}
            onSubmit={handleSubmit}
          />
        </form>
      </div>
    </div>
  );
};

export default DesktopLayout;