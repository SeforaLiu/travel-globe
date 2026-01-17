import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom';
import { useTravelStore } from "@/store/useTravelStore";
// 引入 Lucide 图标，替代 Emoji
import {
  Moon, Sun, LogOut, Search, MapPin, BookOpen,
  Plus, ChevronLeft, Globe, Languages, X, LogIn
} from 'lucide-react';
import {toast} from "sonner";

type Props = {
  dark: boolean;
  setDark: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  hideMobileButtons: () => void;
  isLoggedIn: boolean;
  handleClickLogout: () => void;
  handleShowSidebar:() => void;
};

type TabType = 'visited' | 'wishlist';

// 稍微调整背景色，使其在暗黑模式下更有质感
const sidebarDayBg = '#eef2f6'; // 更柔和的浅蓝灰
const sidebarNightBg = '#0f172a'; // 深蓝黑 (Slate-900)

export default function Sidebar({
                                  dark,
                                  setDark,
                                  isMobile,
                                  toggleSidebar,
                                  hideMobileButtons,
                                  isLoggedIn,
                                  handleClickLogout,
                                  handleShowSidebar
                                }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate();

  const searchKeyword = useTravelStore((state) => state.searchKeyword);
  const setSearchKeyword = useTravelStore((state) => state.setSearchKeyword);
  const user = useTravelStore((state) => state.user);
  const loading = useTravelStore((state) => state.loading);
  const guideTotal = useTravelStore((state) => state.guideTotal);
  const diaryTotal = useTravelStore((state) => state.diaryTotal);
  const placeTotal = useTravelStore((state) => state.placeTotal);
  const total = useTravelStore((state) => state.total);
  const fetchAllDiaries = useTravelStore((state) => state.fetchAllDiaries);
  const allDiaries = useTravelStore((state) => state.allDiaries);
  const activeTab = useTravelStore((state) => state.activeTab);
  const setActiveTab = useTravelStore((state) => state.setActiveTab);

  const handleAddDiary = () => {
    if(isLoggedIn){
      navigate('/new-diary')
    }else{
      toast.info(t('please login first'))
      navigate('/login')
    }
    if (isMobile) {
      toggleSidebar()
      hideMobileButtons()
    }
  };

  // 动态计算样式类
  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-slate-200' : 'text-slate-700';
  const inputBg = dark ? 'bg-slate-800' : 'bg-white';
  const borderColor = dark ? 'border-slate-700' : 'border-slate-200';

  const handleClickTab = async (tab:TabType | '') => {
    setActiveTab(tab)
    try {
      const apiTab = tab === '' ? undefined : (tab as TabType);
      await fetchAllDiaries(true, searchKeyword, apiTab)
      if(isMobile) handleShowSidebar()
    } catch (err) {
      console.error(err);
    }
  }

  const handleSearchKeyWord = async (queryOverride?: string) => {
    const query = typeof queryOverride === 'string' ? queryOverride : searchKeyword;
    const validTab: TabType | undefined = (activeTab === 'visited' || activeTab === 'wishlist')
      ? activeTab
      : undefined;

    try {
      await fetchAllDiaries(true, query, validTab)
      if(isMobile) handleShowSidebar()
    } catch (err) {
      console.error(err);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchKeyWord();
    }
  };

  return (
    <div
      className={`
        flex flex-col h-full 
        ${textColor} 
        transition-colors duration-300
        shadow-xl z-50
      `}
      style={{ backgroundColor: sidebarBg }}
    >
      <div className="p-5 space-y-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo/logo_new.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              {t('title')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`
                p-2 rounded-full transition-all duration-200
                ${dark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-white hover:bg-gray-100 text-slate-600 shadow-sm'}
              `}
            >
              {dark ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="relative group">
              <div className={`
                p-2 rounded-full cursor-pointer transition-all duration-200
                ${dark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100 shadow-sm'}
              `}>
                <Languages size={18} />
              </div>
              <select
                value={i18n.language}
                onChange={e => i18n.changeLanguage(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`
          flex items-center gap-3 p-3 rounded-2xl border transition-colors
          ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}
        `}>
          <img
            src="/avatar/avatar.png"
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {user?.username || t('unlogged visitor')}
            </div>
            <div className="text-xs opacity-60 flex items-center gap-1">
              <MapPin size={10} />
              {t('AddTypeVisited')}: {placeTotal}
            </div>
          </div>
          {isLoggedIn && (
            <button
              onClick={handleClickLogout}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
              title={t('logout')}
            >
              <LogOut size={16} />
            </button>
          )}
          {!isLoggedIn && (
            <button
              onClick={()=>navigate('/login')}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
              title={t('Login')}
            >
              <LogIn size={16} />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={16} />
          </div>
          <input
            className={`
              w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none border transition-all
              ${inputBg} ${borderColor}
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            `}
            placeholder={t('common.search')}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchKeyword && (
            <button
              onClick={() => {
                setSearchKeyword('');
                handleSearchKeyWord('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isLoggedIn && total > 0 && (
          <div className={`
            flex p-1 rounded-xl border
            ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}
          `}>
            <button
              onClick={() => handleClickTab('visited')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === 'visited'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
              `}
            >
              <MapPin size={14} />
              {t('diary')} ({diaryTotal})
            </button>
            <button
              onClick={() => handleClickTab('wishlist')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === 'wishlist'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
              `}
            >
              <BookOpen size={14} />
              {t('guide')} ({guideTotal})
            </button>
            {activeTab && (
              <button
                onClick={() => handleClickTab('')}
                className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={t('common.reset')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <button
          className={`
            w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30
            bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
            active:scale-95 transition-all duration-200
            ${!isLoggedIn ? 'animate-pulse' : ''}
          `}
          onClick={handleAddDiary}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>{!isLoggedIn ? t('login to create journal') : t('addGuide')}</span>
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-custom">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <Globe size={48} className="text-blue-400/50" />
            <div>
              <div className="text-lg font-semibold">{t('Your journey starts here')}</div>
              <div className="text-sm mt-1">{t('Click + to add your first journey')}</div>
            </div>
          </div>
        ) : (
          <>
            {loading && allDiaries.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="mt-3 text-sm">{t('Loading diaries...')}</div>
              </div>
            )}

            {!loading && allDiaries.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
                <BookOpen size={48} className="text-slate-400/50" />
                <div>
                  <div className="text-lg font-semibold">{t('No diaries yet')}</div>
                  <div className="text-sm mt-1">{t('Click the button above to create your first diary')}</div>
                </div>
              </div>
            )}

            {!loading && allDiaries.length > 0 && (
              <ul className="space-y-2.5">
                {allDiaries.map(item => (
                  <li
                    key={item.id}
                    className={`
                      group p-3 rounded-xl border cursor-pointer transition-all duration-200
                      ${dark
                      ? 'bg-slate-800/40 border-slate-700 hover:bg-blue-900/30 hover:border-blue-700/50'
                      : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100'}
                    `}
                    onClick={() => {
                      navigate(`/diary/${item.id}`)
                      if (isMobile) toggleSidebar()
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </span>
                      <ChevronLeft size={14} className="opacity-0 group-hover:opacity-100 rotate-180 transition-opacity text-slate-400" />
                    </div>
                    {item.date_start && (
                      <div className="text-xs opacity-50 mt-1">
                        {item.date_start} {item.date_end ? `- ${item.date_end}` : ''}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* PC Collapse Button */}
      {!isMobile && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={toggleSidebar}
            className={`
              w-full flex items-center justify-center p-2 rounded-lg transition-colors
              ${dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}
            `}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      )}
    </div>
  )
}