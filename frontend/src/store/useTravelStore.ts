import { create } from 'zustand';
import api from '../services/api';
import { DiarySummary, DiaryListResponse, DiaryDetail } from '@/types/diary';

// 定义 Store 的状态类型
interface TravelState {
  // --- 数据状态 ---
  diaries: DiarySummary[];     // 当前显示的日记列表
  allDiaries:DiarySummary[];
  total: number;               // 总条数
  currentPage: number;         // 当前页码
  loading: boolean;
  error: string | null;
  currentDiary: DiaryDetail | null; // 当前正在查看/编辑的详情
  diaryTotal: number;
  guideTotal: number;
  placeTotal: number;
  initialized: boolean; // 新增：标记是否完成过初次加载
  allDiariesInitialized: boolean;

  // --- 用户状态 ---
  isLoggedIn: boolean;
  user: any | null;

  isMobile: boolean;
  darkMode: boolean;

  // --- 动作 (Actions) ---
  // A. 获取分页列表
  fetchDiaries: (page?: number, pageSize?: number) => Promise<DiaryListResponse>;
  // B. 获取全部日记 (常用于 3D 地球打点)
  fetchAllDiaries: (force?: boolean) => Promise<void>;
  // 【新增】创建日记 Action
  createDiary: (data: Omit<DiaryDetail, 'id' | 'created_time' | 'updated_at' | 'location_id' | 'user_id'>) => Promise<DiaryDetail>;
  // C. 获取详情
  fetchDiaryDetail: (id: number) => Promise<DiaryDetail>;
  // D. 更新日记 (包含局部状态更新)
  updateDiary: (id: number, data: Partial<DiaryDetail>) => Promise<DiaryDetail>;
  // E. 删除日记
  deleteDiary: (id: number) => Promise<void>;

  // UI 控制 Actions
  setIsMobile: (isMobile: boolean) => void; // 新增：设置移动端状态
  toggleDarkMode: () => void;               // 新增：切换暗黑模式
  setDarkMode: (isDark: boolean) => void;   // 新增：直接设置暗黑模式

  // 用户相关
  checkAuth: () => Promise<void>;
  logout: () => void;
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

  // --- 动作实现 ---

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
    console.log(`call 获取全部日记 fetchAllDiaries called. Force refresh: ${force}`);
    set({ loading: true, error: null });
    try {
      const response = await api.get<DiaryListResponse>('/entries', {
        params: { get_all: true }
      });
      console.log(`获取全部日记成功 fetchAllDiaries success: got ${response.data.items.length} items.`);
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
        // 失败时不再标记为 true，以便下次可以重试。
        // 但在强制刷新场景下，这可能不是最佳选择，具体取决于产品需求。
        // 为简单起见，我们先保持原样，成功后标记。
      });
    }
  },

  // C. 获取详情
  fetchDiaryDetail: async (id) => {
    set({ loading: true });
    try {
      const response = await api.get<DiaryDetail>(`/entries/${id}`);
      set({ currentDiary: response.data, loading: false });
      return response.data; // 正常返回 DiaryDetail
    } catch (err: any) {
      set({ loading: false });
      throw err; // 抛出错误，符合 Promise 失败的逻辑
    }
  },

  // 【新增】创建日记 Action
  createDiary: async (newDiaryData) => {
    set({ loading: true });
    try {
      const response = await api.post<DiaryDetail>('/entries', newDiaryData);
      console.log('日记创建成功, Diary created successfully.');

      // 【核心】强制刷新 allDiaries 列表
      await get().fetchAllDiaries(true);

      // 注意：此时 loading 状态可能已被 fetchAllDiaries 重置
      // 我们可以在这里再次设置，或让 fetchAllDiaries 处理
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      console.error('创建日记失败, Create diary failed:', err);
      set({ loading: false, error: '创建日记失败' });
      throw err;
    }
  },

  // D. 更新 - 【重点修改】
  updateDiary: async (id, updateData) => {
    set({ loading: true });
    try {
      const response = await api.put<DiaryDetail>(`/entries/${id}`, updateData);
      console.log(`日记 ${id} 更新成功, Diary ${id} updated successfully.`);

      // 【核心】强制刷新 allDiaries 列表
      await get().fetchAllDiaries(true);

      // 局部更新分页列表（如果存在）
      const updatedDiaries = get().diaries.map(d => d.id === id ? { ...d, ...response.data } : d);
      set({
        diaries: updatedDiaries,
        currentDiary: response.data,
        loading: false
      });
      return response.data;
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  // E. 删除 - 【重点修改】
  deleteDiary: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/entries/${id}`);
      console.log(`日记 ${id} 删除成功, Diary ${id} deleted successfully.`);

      // 【核心】强制刷新 allDiaries 列表
      await get().fetchAllDiaries(true);

      // 从本地分页列表状态中移除
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

      const updatedUser = get().user;
      const updatedStatus = get().isLoggedIn;

      console.log('useTravelStore---user', updatedUser);
      console.log('useTravelStore---isLoggedIn', updatedStatus);
    } catch {
      set({ user: null, isLoggedIn: false });
    }
  },

  logout: () => set({ user: null, isLoggedIn: false, diaries: [] })
}));