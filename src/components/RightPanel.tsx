import React from 'react'

export default function RightPanel() {
  // 这里是静态示例内容，你可以替换为来自 state/localStorage/后端的数据
  const latestDiary = {
    id: 'd1',
    title: '海边黄昏',
    place: '八里海',
    date: '2025-11-01',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/2560px-Placeholder_view_vector.svg.png'
  }

  const nextGuide = {
    id: 'g1',
    title: '北欧极光之旅',
    place: '挪威 Tromsø',
    departAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10) // 10 天后
  }

  // countdown helper
  const diffDays = Math.ceil((nextGuide.departAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-3 space-y-4 text-sm border-2 border-b-diary">
      {/* 最新日记卡 */}
      <div className="rounded p-3 bg-white/10 backdrop-blur border">
        <div className="flex items-center gap-3">
          <img src={latestDiary.cover} alt="cover" className="w-20 h-14 object-cover rounded" />
          <div>
            <div className="font-bold">{latestDiary.title}</div>
            <div className="text-xs opacity-70">{latestDiary.place} · {latestDiary.date}</div>
            <button className="mt-2 text-xs underline">查看详情</button>
          </div>
        </div>
      </div>

      {/* 下一站愿景卡 */}
      <div className="rounded p-3 bg-white/10 backdrop-blur border">
        <div className="font-bold">下一站愿景</div>
        <div className="mt-2">{nextGuide.title}</div>
        <div className="text-xs opacity-70">{nextGuide.place}</div>
        <div className="mt-2 font-mono">{diffDays} 天后出发</div>
      </div>
    </div>
  )
}
