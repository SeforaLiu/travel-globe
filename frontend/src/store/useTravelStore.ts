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

  // --- Google Maps API 状态 ---
  isGoogleMapsLoading: boolean; // 新增：标记 API 是否正在加载
  isGoogleMapsLoaded: boolean;  // 新增：标记 API 是否已成功加载
  googleMapsError: string | null; // 新增：记录加载错误

  // --- 动作 (Actions) ---
  // A. 获取分页列表
  fetchDiaries: (page?: number, pageSize?: number) => Promise<DiaryListResponse>;
  // B. 获取全部日记 (常用于 3D 地球打点)
  fetchAllDiaries: (force?: boolean) => Promise<void>;
  // 创建日记 Action
  createDiary: (data: Omit<DiaryDetail, 'id' | 'created_time' | 'updated_at' | 'location_id' | 'user_id'>) => Promise<DiaryDetail>;
  // C. 获取详情
  fetchDiaryDetail: (id: number) => Promise<DiaryDetail>;
  // D. 更新日记 (包含局部状态更新)
  updateDiary: (id: number, data: any) => Promise<any>; // 新增
  clearCurrentDiary: () => void;
  // E. 删除日记
  deleteDiary: (id: number) => Promise<void>;

  // UI 控制 Actions
  setIsMobile: (isMobile: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;

  // 用户相关
  checkAuth: () => Promise<void>;
  logout: () => void;

  // Google Maps Action
  loadGoogleMaps: () => Promise<void>; // 新增：加载 Google Maps API 的 Action
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
  initialized:false,
  allDiariesInitialized:false,

  // --- Google Maps API 初始状态 ---
  isGoogleMapsLoading: false,
  isGoogleMapsLoaded: false,
  googleMapsError: null,

  // --- 动作实现 ---

  // 新增：加载 Google Maps API 的实现
  loadGoogleMaps: () => {
    return new Promise((resolve, reject) => {
      // 核心：防止重复加载的逻辑
      // 1. 如果已经加载成功，直接成功返回
      if (get().isGoogleMapsLoaded) {
        console.log('Google Maps API 已加载，跳过。');
        return resolve();
      }
      // 2. 如果正在加载中，也直接返回一个等待中的 Promise (这里我们简单返回，让调用者等待状态变化)
      // 实践中，可以设计更复杂的逻辑，如返回一个正在进行中的 Promise
      if (get().isGoogleMapsLoading) {
        console.log('Google Maps API 正在加载中，请等待...');
        // 这是一个简化的处理，高级用法可以订阅加载完成事件
        // 但对于大多数场景，组件会根据 isGoogleMapsLoaded 状态重新渲染，所以这样就够了
        return resolve();
      }
      // 3. 最终检查 window 对象，作为双重保险
      // @ts-ignore
      if (window.google && window.google.maps) {
        console.log('Google Maps API 已存在于 window 对象，直接标记为已加载。');
        set({ isGoogleMapsLoaded: true });
        return resolve();
      }

      // 如果以上条件都不满足，开始加载
      console.log('开始加载 Google Maps API...');
      set({ isGoogleMapsLoading: true, googleMapsError: null });

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('✅ Google Maps API 加载完毕');
        set({ isGoogleMapsLoading: false, isGoogleMapsLoaded: true });
        resolve();
      };

      script.onerror = () => {
        const errorMsg = '❌ 加载 Google Maps API 失败';
        console.error(errorMsg);
        set({ isGoogleMapsLoading: false, isGoogleMapsLoaded: false, googleMapsError: errorMsg });
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
  fetchAllDiaries: async (force = false) => {
    // 1. 【修改保护逻辑】如果已经初始化过 且 不是强制刷新，则直接返回
    if (get().allDiariesInitialized && !force) {
      console.log('fetchAllDiaries: Already initialized and not forced, skipping fetch.');
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await api.get<DiaryListResponse>('/entries', {
        params: { get_all: true }
      });
      set({
        allDiaries: response.data.items,
        loading: false,
        diaryTotal:response.data.diary_total,
        guideTotal:response.data.guide_total,
        placeTotal:response.data.place_total,
        total: response.data.total,
        allDiariesInitialized: true // 无论如何，执行后都应标记为已初始化
      });
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
    // 【优化】在获取详情前，先清空旧数据，可以改善用户体验
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

  // 【新增】创建日记 Action
  createDiary: async (newDiaryData) => {
    set({ loading: true });
    try {
      const response = await api.post<DiaryDetail>('/entries', newDiaryData);
      console.log('日记创建成功, Diary created successfully.');
      await get().fetchAllDiaries(true);
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      console.error('创建日记失败, Create diary failed:', err);
      set({ loading: false, error: '创建日记失败' });
      throw err;
    }
  },

  // D. 更新
  updateDiary: async (id, data) => {
    try {
      set({ loading: true, error: null });
      console.log(`[Store] 准备更新日记，ID: ${id}`, data);
      const response = await api.put(`/entries/${id}`, data);
      console.log('[Store] 日记更新成功:', response.data);
      // 更新成功后，刷新日记列表以显示最新数据
      await get().fetchAllDiaries(true); // 或者只更新列表中的单个条目以提高性能
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      console.error(`[Store] 更新日记失败，ID: ${id}`, error);
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  // E. 删除
  deleteDiary: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/entries/${id}`);
      console.log(`日记 ${id} 删除成功, Diary ${id} deleted successfully.`);
      await get().fetchAllDiaries(true);
      set({
        diaries: get().diaries.filter(d => d.id !== id),
        loading: false
      });
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

  logout: () => set({ user: null, isLoggedIn: false, diaries: [] })
}));
