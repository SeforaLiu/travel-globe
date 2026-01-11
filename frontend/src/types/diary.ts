// 定义类型
export interface DiarySummary {
  id: number;
  entry_type: 'visited' | 'wishlist';
  title: string;
  location_name: string;
  coordinates: { lat: number; lng: number };
  date_start: string | null;
  date_end: string | null;
  transportation: string | null;
  created_time: string | null;
  user_id: number;
}

export interface DiaryListResponse {
  keyword: string | null | undefined;
  items: DiarySummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  diary_total: number;
  guide_total:number;
  place_total: number;
}

export interface DiaryDetail extends DiarySummary {
  content: string | null;
  photos: any[];
  location_id: number | null;
}