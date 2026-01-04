import React, {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom';
import {useTravelStore} from "@/store/useTravelStore";

type Props = {
  dark: boolean;
  setDark: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  hideMobileButtons: () => void;
  isLoggedIn: boolean;
};

// 定义侧边栏的背景色
const sidebarDayBg = '#c5d6f0';
const sidebarNightBg = '#1A1A33';

export default function Sidebar({dark, setDark, isMobile, toggleSidebar, hideMobileButtons, isLoggedIn}: Props) {
  const {t, i18n} = useTranslation()
  const user = useTravelStore((state) => state.user);
  const navigate = useNavigate();

  const {
    diaries,
    currentPage,
    total,
    fetchDiaries,
    fetchAllDiaries,
    loading,
    initialized,
    placeTotal
  } = useTravelStore();

  // 关键修改：添加数据获取逻辑
  useEffect(() => {
    if (isLoggedIn && !initialized && !loading) {
      console.log('Sidebar: 第一次加载数据');

      fetchDiaries(1, 10).catch(err => {
        console.error('获取失败:', err);
      });
    }
  }, [isLoggedIn, initialized, loading]);

  const handleAddDiary = () => {
    navigate(isLoggedIn ? '/new-diary' : '/login');

    if (isMobile) {
      // 如果是移动端，点击后可以关闭侧边栏
      toggleSidebar()
      hideMobileButtons()
    }
  };

  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

  // 关键修改：使用 store 中的真实数据替换硬编码数据
  const sidebarData = {
    diaryTotal: total,  // 使用 store 中的 total
    guideTotal: 0,      // 暂时保留，后续可以添加攻略功能
    diaryList: diaries.map(diary => ({
      id: diary.id,
      title: diary.title || `${diary.location_name || '未命名地点'} - ${new Date(diary.date_start).getFullYear()}`,
      // 使用 diary.id 作为 pathId，或者根据你的路由结构调整
      pathId: diary.id,
      startDate: diary.date_start
    })),
  }

  // 展开时的内容
  return (
    <div
      className={`p-4 space-y-4 h-full flex flex-col ${textColor}`}
      style={{backgroundColor: sidebarBg}}
    >
      {/* Controls */}
      <div className="flex gap-4 justify-between">
        <button onClick={() => setDark(!dark)}
                className="px-3 border rounded">
          {dark ? '🌙' : '☀️'}
        </button>
        <select value={i18n.language} onChange={e => i18n.changeLanguage(e.target.value)}
                className="border rounded p-1 w-24">
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="it">Italiano</option>
        </select>
      </div>

      {/* Title / Logo */}
      <div className="cursor-pointer flex items-center justify-between" onClick={() => navigate('/')}>
        <div className="text-2xl font-bold">{t('title')}</div>
        <img src="/logo/logo-placeholder-image.png"
             alt="logo"
             className="rounded w-14"
        />
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <img src="/avatar/avatar.png"
             alt="avatar"
             className="rounded-full w-12"
        />
        <div>
          <div className="font-semibold">{user?.username? user?.username : t('unlogged visitor') }</div>
          <div className="text-xs opacity-60">
            {t('AddTypeVisited')}: {placeTotal}
          </div>
        </div>
      </div>

      {/* Search */}
      <input className="w-full border rounded p-2 " placeholder="🔍"/>

      {/* Add buttons */}
      <div className="flex w-full">
        <button
          className={`flex-1 bg-guide text-white rounded px-4 py-1 whitespace-nowrap ${
            !isLoggedIn
              ? 'animate-pulse ring-2 ring-blue-500 hover:animate-none'
              : ''
          }`}
          onClick={handleAddDiary}
        >
          {!isLoggedIn? t('login to create journal'): t('addGuide')}
        </button>
      </div>

      {/* Tabs */}
      {isLoggedIn && sidebarData.diaryTotal > 0 && (
        <div className="cursor-pointer flex gap-4 font-semibold">
          <div className="px-2 py-1 rounded bg-opacity-20 bg-blue-500">
            {t('diary')}: {sidebarData.diaryTotal}
          </div>
           <div className="px-2 py-1 rounded bg-opacity-20 bg-guide">
              {t('guide')}: {sidebarData.guideTotal}
            </div>
        </div>
      )}

      {/* List area */}
      <div className="flex-1 overflow-auto text-sm opacity-80">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center h-full text-center space-y-4">
            <div className="text-4xl">🌍</div>
            <div className="text-lg font-semibold">{t('Your journey starts here')}</div>
            <div className="text-sm opacity-70">{t('Click + to add your first journey')} ✈️</div>
          </div>
        ) : (
          <>
            {/* 加载状态提示 */}
            {loading && diaries.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="mt-2 text-sm opacity-70">{t('Loading diaries...')}</div>
              </div>
            )}

            {/* 空状态提示 */}
            {!loading && diaries.length === 0 && (
              <div className="flex flex-col items-center h-full text-center space-y-4">
                <div className="text-4xl">📝</div>
                <div className="text-lg font-semibold">{t('No diaries yet')}</div>
                <div className="text-sm opacity-70">
                  {t('Click the button above to create your first diary')}
                </div>
              </div>
            )}

            {/* 显示日记列表 */}
            {!loading && diaries.length > 0 && (
              <ul className="space-y-2">
                {sidebarData.diaryList.map(item => (
                  <li
                    key={item.id}
                    className="p-2 border rounded cursor-pointer hover:bg-opacity-20 hover:bg-blue-500 transition-colors"
                    onClick={() => {
                      navigate(`/diary/${item.pathId}`)
                      if (isMobile) toggleSidebar()
                    }}
                  >
                    {item.title}{item.startDate?` - ${item.startDate}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* PC 端折叠按钮 */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className="mt-auto self-end px-2 py-1 border rounded opacity-70 hover:opacity-100"
        >
          {`<`}
        </button>
      )}
    </div>
  )
}
