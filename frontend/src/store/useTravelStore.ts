import { create } from 'zustand';
import api from '../services/api';
import { DiarySummary, DiaryListResponse, DiaryDetail } from '@/types/diary';

// 定义 Store 的状态类型
interface TravelState {
  // --- 数据状态 ---
  diaries: DiarySummary[];     // 当前显示的日记列表
  total: number;               // 总条数
  currentPage: number;         // 当前页码
  loading: boolean;
  error: string | null;
  currentDiary: DiaryDetail | null; // 当前正在查看/编辑的详情
  diaryTotal: number;
  guideTotal: number;
  placeTotal: number;
  initialized: boolean, // 新增：标记是否完成过初次加载

  // --- 用户状态 ---
  isLoggedIn: boolean;
  user: any | null;

  isMobile: boolean;
  darkMode: boolean;

  // --- 动作 (Actions) ---
  // A. 获取分页列表
  fetchDiaries: (page?: number, pageSize?: number) => Promise<DiaryListResponse>;
  // B. 获取全部日记 (常用于 3D 地球打点)
  fetchAllDiaries: () => Promise<void>;
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
  fetchAllDiaries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<DiaryListResponse>('/entries', {
        params: { get_all: true }
      });
      set({ diaries: response.data.items, loading: false });
    } catch (err: any) {
      set({ error: '获取全部数据失败', loading: false });
    }
  },

  // C. 获取详情
  fetchDiaryDetail: async (id) => {
    set({ loading: true });
    try {
      const response = await api.get<DiaryDetail>(`/entries/${id}`);
      set({ currentDiary: response.data, loading: false });
      return response.data;
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },


  // D. 更新
  updateDiary: async (id, updateData) => {
    set({ loading: true });
    try {
      const response = await api.put<DiaryDetail>(`/entries/${id}`, updateData);
      // 同步更新本地列表中的数据，避免重新请求整个列表
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

  // E. 删除
  deleteDiary: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/entries/${id}`);
      // 从本地状态中移除，实现即时 UI 反馈
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