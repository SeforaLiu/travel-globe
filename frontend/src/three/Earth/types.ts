import * as THREE from 'three';

export interface Diary {
  id: number;
  title: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  location_name:string;
  created_time: string;
}

export interface GroupedPoint {
  key: string;
  diaries: Diary[];
  position: THREE.Vector3;
  latestDiary: Diary;
}
