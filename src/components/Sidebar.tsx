import React from 'react'
import {useTranslation} from 'react-i18next'

type Props = {
  dark: boolean;
  setDark: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

// 定义侧边栏的背景色
const sidebarDayBg = '#c5d6f0';
const sidebarNightBg = '#1A1A33';

export default function Sidebar({dark, setDark, isMobile, toggleSidebar}: Props) {
  const {t, i18n} = useTranslation()

  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

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
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">{t('title')}</div>
        <img src="https://www.largeherds.co.za/wp-content/uploads/2024/01/logo-placeholder-image.png"
             alt="logo"
             className="rounded w-14"
        />
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
             alt="avatar"
             className="rounded-full w-12"
        />
        <div>
          <div className="font-semibold">Carol</div>
          <div className="text-xs opacity-60">去过: 32 | 旅行: 185天</div>
        </div>
      </div>

      {/* Search */}
      <input className="w-full border rounded p-2 " placeholder="🔍"/>

      {/* Add buttons */}
      <div className="flex gap-2 w-full">
        <button className=" flex-1 bg-diary text-white rounded px-4 py-1 whitespace-nowrap">{t('addDiary')}</button>
        <button className=" flex-1 bg-guide text-white rounded px-4 py-1 whitespace-nowrap">{t('addGuide')}</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 font-semibold">
        <div>日记(15)</div>
        <div>攻略(5)</div>
      </div>

      {/* List area (auto expand) */}
      <div className="flex-1 overflow-auto text-sm opacity-80">
        <ul className="space-y-2">
          <li className="p-2 border rounded">上海 — 2025-06-01</li>
          <li className="p-2 border rounded">罗马 — 2024-09-12</li>
          <li className="p-2 border rounded">巴黎 — 2023-11-05</li>
          <li className="p-2 border rounded">巴黎 — 2023-11-05</li>
          <li className="p-2 border rounded">巴黎 — 2023-11-05</li>
          <li className="p-2 border rounded">巴黎 — 2023-11-05</li>
          <li className="p-2 border rounded">巴黎 — 2023-11-05</li>
        </ul>
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