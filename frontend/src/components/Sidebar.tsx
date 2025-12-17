import React, {Suspense, lazy, useState, startTransition} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom';

type Props = {
  dark: boolean;
  setDark: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  hideMobileButtons: () => void;
};

// 定义侧边栏的背景色
const sidebarDayBg = '#c5d6f0';
const sidebarNightBg = '#1A1A33';

export default function Sidebar({dark, setDark, isMobile, toggleSidebar, hideMobileButtons}: Props) {
  const {t, i18n} = useTranslation()
  const navigate = useNavigate();
  const handleAddDiary = () => {
    // 跳转到新建日记页面
    navigate('/new-diary');
    console.log('点击新增')

    if (isMobile) {
      // 如果是移动端，点击后可以关闭侧边栏
      toggleSidebar()
      hideMobileButtons()
    }
  };

  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

  // 从后端api获取
  const sidebarData = {
    diaryTotal: 0,
    guideTotal: 0,
    diaryList: [
      {id:1, title:"广州 - 2025年", pathId: 1}
    ],
    guideList: [
      {id:1, title:"广州攻略 - 2025年", pathId: 1}
    ],
  }

  // 从后端api获取
  const userInfo = {
    userName: "",
    userAvatarUrl:"",
    traveledPlaceTotal: 0,
    totalGuideDiary:0,
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
            <div className="font-semibold">{userInfo.userName? userInfo.userName : "Carol" }</div>
            <div className="text-xs opacity-60">{t('AddTypeVisited')} : {userInfo.traveledPlaceTotal} </div>
          </div>
        </div>

        {/* Search */}
        <input className="w-full border rounded p-2 " placeholder="🔍"/>

        {/* Add buttons */}
        <div className="flex w-full">
          <button
              className={`flex-1 bg-guide text-white rounded px-4 py-1 whitespace-nowrap ${
                  userInfo.totalGuideDiary === 0
                      ? 'animate-pulse ring-2 ring-blue-500 hover:animate-none'
                      : ''
              }`}
              onClick={handleAddDiary}
          >
            {t('addGuide')}
          </button>
        </div>


        {/* Tabs */}
        {/*<div className="flex gap-4 font-semibold">*/}
        {/*  */}
        {/*  {userInfo.totalGuideDiary === 0 ? (*/}
        {/*      <div>aaa</div>*/}
        {/*      ):*/}
        {/*      (<div>{t('guide')} - {sidebarData.guideTotal}</div>*/}
        {/*  <div>{t('diary')} - {sidebarData.diaryTotal}</div>*/}
        {/*)}*/}

        {/*</div>*/}

        {/* List area */}
        <div className="flex-1 overflow-auto text-sm opacity-80">
          {userInfo.totalGuideDiary === 0 ? (
              <div className="flex flex-col items-center h-full text-center space-y-4">
                <div className="text-4xl">🌍</div>
                <div className="text-lg font-semibold">{t('Your journey starts here')}</div>
                <div className="text-sm opacity-70">{t('Click + to add your first journey')} ✈️</div>
              </div>
          ) : (
              <ul className="space-y-2">
                {sidebarData.diaryList.map(item => (
                    <li
                        key={item.id}
                        className="p-2 border rounded cursor-pointer"
                        onClick={() => {
                          navigate(`/diary/${item.pathId}`)
                          if (isMobile) toggleSidebar()
                        }}
                    >
                      {item.title}
                    </li>
                ))}
              </ul>
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
