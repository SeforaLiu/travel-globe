import React, { useEffect, useState } from 'react';
import {useTravelStore} from "@/store/useTravelStore";
import {DiarySummary} from "@/types/diary";

export const DiaryManager: React.FC = () => {
  // 1. 从 Store 中挑选需要的状态和方法
  const {
    diaries,
    loading,
    error,
    currentPage,
    total, // 注意：如果后端没返回总页数，可以根据 total 计算
    fetchDiaries,
    fetchAllDiaries,
    updateDiary,
    deleteDiary
  } = useTravelStore();

  // 局部状态仅保留 UI 交互相关的
  const [isExporting, setIsExporting] = useState(false);

  // 假设后端每页返回 10 条，计算总页数
  const totalPages = Math.ceil(total / 10) || 1;

  // 2. 初始化加载
  useEffect(() => {
    fetchDiaries(1, 10);
  }, [fetchDiaries]);

  // 3. 导出全部（这里演示如何从 Store 获取数据）
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 也可以直接调用 fetchAllDiaries 更新 Store 中的 diaries 再读取，
      // 但为了不破坏当前分页 UI，建议这里直接发起局部请求或从 Store 逻辑获取
      const response = await fetchDiaries(1, 999); // 临时获取大量数据
      const data = JSON.stringify(response.items, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel_records_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      // 导出完恢复第一页
      fetchDiaries(1, 10);
    } catch (err) {
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 4. 编辑逻辑
  const handleEdit = async (diary: DiarySummary) => {
    const newTitle = prompt('请输入新标题:', diary.title);
    if (!newTitle || newTitle === diary.title) return;

    try {
      await updateDiary(diary.id, { title: newTitle });
      // 注意：Store 里的 updateDiary 已经处理了本地状态更新，
      // 这里不需要手动重新 loadPage，UI 会自动变化
    } catch (err) {
      alert('更新失败');
    }
  };

  // 5. 删除逻辑
  const handleDelete = async (diaryId: number) => {
    if (!confirm('确定删除吗？')) return;
    try {
      await deleteDiary(diaryId);
      // Store 里的 deleteDiary 已经执行了 filter，UI 会自动同步
    } catch (err) {
      alert('删除失败');
    }
  };

  // --- UI 渲染部分 ---

  if (loading && diaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-500">正在开启地图档案...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">旅行日记管理</h1>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {isExporting ? '导出中...' : '导出 JSON'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>抱歉，数据加载遇到了问题：{error}</p>
          <button onClick={() => fetchDiaries(currentPage)} className="underline mt-2">点击重试</button>
        </div>
      )}

      <div className="grid gap-4">
        {diaries.map((diary) => (
          <div key={diary.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-800">{diary.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    diary.entry_type === 'visited' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {diary.entry_type === 'visited' ? '已足迹' : '想去'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>📍 {diary.location_name}</span>
                  <span>📅 {diary.date_start || '未设定'}</span>
                  {diary.transportation && <span>🚗 {diary.transportation}</span>}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(diary)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(diary.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {diaries.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 text-lg">世界这么大，不想去看看吗？</p>
        </div>
      )}

      {/* 分页控制：状态全部来自 Store */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-10">
          <button
            onClick={() => fetchDiaries(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:border-blue-500 disabled:opacity-30"
          >
            ←
          </button>
          <span className="font-medium text-gray-600">
             {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => fetchDiaries(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:border-blue-500 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* 异步操作时的全局微型加载条 */}
      {loading && diaries.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-xs shadow-2xl animate-bounce">
          正在同步云端数据...
        </div>
      )}
    </div>
  );
};