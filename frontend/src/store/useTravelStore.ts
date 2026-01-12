// src/store/useTravelStore.ts
import { create } from 'zustand';
import api from '../services/api';
import { DiarySummary, DiaryListResponse, DiaryDetail } from '@/types/diary';

// @ts-ignore
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

// 定义 Store 的状态类型
interface TravelState {
  // --- 数据状态 ---
  diaries: DiarySummary[];
  allDiaries:DiarySummary[];
  total: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  currentDiary: DiaryDetail | null;
  diaryTotal: number;
  guideTotal: number;
  placeTotal: number;
  initialized: boolean;
  allDiariesInitialized: boolean;

  // --- 用户状态 ---
  isLoggedIn: boolean;
  user: any | null;

  // --- UI 状态 ---
  isMobile: boolean;
  darkMode: boolean;
  showLeftRightButtonsMobile:boolean;

  // --- Google Maps API 状态 ---
  isGoogleMapsLoading: boolean; // 新增：标记 API 是否正在加载
  isGoogleMapsLoaded: boolean;  // 新增：标记 API 是否已成功加载
  googleMapsError: string | null; // 新增：记录加载错误
  googleMapsApiLang: string | null;

  // --- 动作 (Actions) ---
  // A. 获取分页列表
  fetchDiaries: (page?: number, pageSize?: number) => Promise<DiaryListResponse>;
  // B. 获取全部日记 (常用于 3D 地球打点)
  fetchAllDiaries: (force?: boolean, keyword?:string, type?:'visited'|'wishlist') => Promise<void>;
  // 创建日记 Action
  createDiary: (data: Omit<DiaryDetail, 'id' | 'created_time' | 'updated_at' | 'location_id' | 'user_id'>) => Promise<DiaryDetail>;
  // C. 获取详情
  fetchDiaryDetail: (id: number) => Promise<DiaryDetail>;
  // D. 更新日记 (包含局部状态更新)
  updateDiary: (id: number, data: any) => Promise<any>; // 新增
  clearCurrentDiary: () => void;
  // E. 删除日记
  deleteDiary: (id: number) => Promise<void>;

  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // UI 控制 Actions
  setIsMobile: (isMobile: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setShowLeftRightButtonsMobile: (show: boolean) => void;

  // 用户相关
  checkAuth: () => Promise<void>;
  logout: () => void;

  // Google Maps Action
  loadGoogleMaps: (lang: string) => Promise<void>; // 新增：加载 Google Maps API 的 Action
}

export const useTravelStore = create<TravelState>((set, get) => ({
  diaries: [],
  allDiaries:[],
  total: 0,
  diaryTotal: 0,
  guideTotal: 0,
  placeTotal:0,
  currentPage: 1,
  loading: false,
  error: null,
  currentDiary: null,
  isLoggedIn: false,
  user: null,
  isMobile: false,
  darkMode: false,
  showLeftRightButtonsMobile: false,
  initialized:false,
  allDiariesInitialized:false,

  // --- Google Maps API 初始状态 ---
  isGoogleMapsLoading: false,
  isGoogleMapsLoaded: false,
  googleMapsError: null,
  googleMapsApiLang: null,

  searchKeyword: '',
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  activeTab:'',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowLeftRightButtonsMobile:(show) => set({showLeftRightButtonsMobile:show}),

  // --- 动作实现 ---

  // 加载 Google Maps API 的实现
  loadGoogleMaps: (lang) => {
    return new Promise((resolve, reject) => {
      // 1. 如果已经加载成功，直接成功返回
      if (get().isGoogleMapsLoaded && get().googleMapsApiLang === lang) {
        console.log('这个语言的 Google Maps API 已加载，跳过。');
        return resolve();
      }
      // 2. 如果正在加载中，也直接返回一个等待中的 Promise (这里我们简单返回，让调用者等待状态变化)
      if (get().isGoogleMapsLoading) {
        console.log('Google Maps API 正在加载中，请等待...');
        return resolve();
      }
      // 3. 最终检查 window 对象，作为双重保险
      // @ts-ignore
      if (window.google && window.google.maps && get().googleMapsApiLang === lang) {
        console.log('这个语言的 Google Maps API 已存在于 window 对象，直接标记为已加载。');
        set({ isGoogleMapsLoaded: true });
        return resolve();
      }

      // 如果以上条件都不满足，开始加载
      console.log('开始加载 Google Maps API...');
      set({ isGoogleMapsLoading: true, googleMapsError: null });

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=${lang}`;
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';

      script.onload = () => {
        console.log('✅ Google Maps API 加载完毕');
        set({ isGoogleMapsLoading: false, isGoogleMapsLoaded: true, googleMapsApiLang: lang });
        resolve();
      };

      script.onerror = () => {
        const errorMsg = '❌ 加载 Google Maps API 失败';
        console.error(errorMsg);
        set({ isGoogleMapsLoading: false, isGoogleMapsLoaded: false, googleMapsError: errorMsg, googleMapsApiLang: null });
        script.remove();
        reject(new Error(errorMsg));
      };

      document.head.appendChild(script);
    });
  },

  // 设置移动端状态
  setIsMobile: (isMobile) => set({ isMobile }),

  // 切换暗黑模式
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // 直接设置暗黑模式 (例如从系统配置同步)
  setDarkMode: (isDark) => set({ darkMode: isDark }),

  // 在 useTravelStore.ts 中修改 fetchDiaries 函数
  fetchDiaries: async (page = 1, pageSize = 10) => {
    console.log(`call 获取日记fetchDiaries called: page=${page}, pageSize=${pageSize}`);
    set({ loading: true, error: null });
    try {
      const response = await api.get<DiaryListResponse>('/entries', {
        params: { page, page_size: pageSize }
      });

      console.log(`获取日记成功 fetchDiaries success: got ${response.data.items.length} items, total=${response.data.total}`);

      set({
        diaries: response.data.items,
        total: response.data.total,
        currentPage: page,
        loading: false,
        diaryTotal:response.data.diary_total,
        guideTotal:response.data.guide_total,
        placeTotal:response.data.place_total,
        initialized: true,
      });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || '获取列表失败';
      console.error('获取日记失败 fetchDiaries failed:', err);
      set({ error: msg, loading: false });
      throw err;
    }
  },

// B. 获取全部 (用于地图展示)
  fetchAllDiaries: async (force = false, keyword,type) => {
    // 1. 【修改保护逻辑】如果已经初始化过 且 不是强制刷新，则直接返回
    if (get().allDiariesInitialized && !force) {
      console.log('fetchAllDiaries: Already initialized and not forced, skipping fetch.');
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await api.get<DiaryListResponse>('/entries', {
        params: {get_all: true, keyword: keyword ? keyword : null, entry_type: type}
      });
      set({
        allDiaries: response.data.items,
        loading: false,
        diaryTotal:response.data.diary_total,
        guideTotal:response.data.guide_total,
        placeTotal:response.data.place_total,
        total: response.data.total,
        allDiariesInitialized: true
      });
      if(keyword && !type){
        console.log('只有关键词没有类型')
      }
    } catch (err: any) {
      console.error('获取全部日记失败 fetchAllDiaries failed:', err);
      set({
        error: '获取全部数据失败',
        loading: false,
      });
    }
  },

  // C. 获取详情
  fetchDiaryDetail: async (id) => {
    set({ currentDiary: null });
    try {
      const response = await api.get<DiaryDetail>(`/entries/${id}`);
      set({ currentDiary: response.data });
      return response.data;
    } catch (err: any) {
      throw err;
    }
  },

  clearCurrentDiary: () => set({ currentDiary: null }),

  // 创建日记 Action
  createDiary: async (newDiaryData) => {
    try {
      const response = await api.post<DiaryDetail>('/entries', newDiaryData);
      console.log('日记创建成功, Diary created successfully.');
      await get().fetchAllDiaries(true);
      return response.data;
    } catch (err: any) {
      console.error('创建日记失败, Create diary failed:', err);
      throw err;
    }
  },

  // D. 更新
  updateDiary: async (id, data) => {
    try {
      console.log(`[Store] 准备更新日记，ID: ${id}`, data);
      const response = await api.put<DiaryDetail>(`/entries/${id}`, data);
      const updatedDiary = response.data;
      console.log('[Store] 日记更新成功:', updatedDiary);

      set(state => ({
        allDiaries: state.allDiaries.map(diary =>
          diary.id === id ? { ...diary, ...updatedDiary } : diary
        ),
        diaries: state.diaries.map(diary =>
          diary.id === id ? { ...diary, ...updatedDiary } : diary
        ),
        currentDiary: state.currentDiary?.id === id ? updatedDiary : state.currentDiary,
      }));

      return updatedDiary;
    } catch (error: any) {
      console.error(`[Store] 更新日记失败，ID: ${id}`, error);
      throw error;
    }
  },

  // E. 删除
  deleteDiary: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/entries/${id}`);
      console.log(`日记 ${id} 删除成功, Diary ${id} deleted successfully.`);

      set(state => ({
        allDiaries: state.allDiaries.filter(d => d.id !== id),
        diaries: state.diaries.filter(d => d.id !== id),
        currentDiary: state.currentDiary?.id === id ? null : state.currentDiary,
        loading: false
      }));

    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  // 用户认证
  checkAuth: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, isLoggedIn: true });
    } catch {
      set({ user: null, isLoggedIn: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/logout');
      set({ loading: false, user: null, isLoggedIn: false, diaries: [], allDiaries:[], currentDiary:null });
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },
}));
