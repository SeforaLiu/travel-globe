// src/components/AIChatWidget.tsx
import React, {useState, useRef, useEffect, useCallback} from 'react'; // 【修改】新增 useCallback
import {Send, X, MessageCircle, Loader2, Bot, Maximize2, Minimize2} from 'lucide-react';
import {toast} from 'sonner';
import ReactMarkdown from 'react-markdown';
import {sendChatMessage, ChatMessage} from '@/services/ai';
import {useTranslation} from 'react-i18next';
import {useTravelStore} from "@/store/useTravelStore";
import {useResponsiveLayout} from "@/hooks/useResponsiveLayout";

interface AIChatWidgetProps {
  isMobile: boolean;
  dark: boolean;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({isMobile, dark}) => {
  const setShowLeftRightButtonsMobile = useTravelStore(state => state.setShowLeftRightButtonsMobile)
  const showSidebar = useTravelStore(state => state.showSidebar)


  const {t, ready} = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (ready && messages.length === 0) {
      setMessages([
        { role: 'assistant', content: t('ai.helloMsg') }
      ]);
    }
  }, [ready, t, messages.length]);

  useEffect(() => {
    setMessages(prev => {
      if (
        prev.length === 1 &&
        prev[0].role === 'assistant'
      ) {
        return [{ role: 'assistant', content: t('ai.helloMsg') }];
      }
      return prev;
    });
  }, [t]);


  // --- 状态管理 ---
  const [btnPos, setBtnPos] = useState({x: 0, y: 0});
  const [winPos, setWinPos] = useState({x: 0, y: 0});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Refs
  const isDraggingRef = useRef(false); // 逻辑判断用，不触发渲染
  const dragStartPosRef = useRef({x: 0, y: 0}); // 鼠标起始位置
  const elementStartPosRef = useRef({x: 0, y: 0}); // 元素起始偏移量
  const boundsRef = useRef({minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity}); // 移动边界

  const btnRef = useRef<HTMLButtonElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const winCenterRef = useRef<{x: number; y: number} | null>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isExpanded]);

  useEffect(() => {
    if (isMobile || !winCenterRef.current) return;

    const center = winCenterRef.current;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const winW = isExpanded ? Math.min(800, viewportW * 0.95) : 384;
    const winH = isExpanded ? Math.min(700, viewportH * 0.9) : 600;

    let left = center.x - winW / 2;
    let top = center.y - winH / 2;

    left = Math.max(16, Math.min(left, viewportW - winW - 16));
    top = Math.max(16, Math.min(top, viewportH - winH - 16));

    const baseRight = 24;
    const baseBottom = 96;

    const defaultLeft = viewportW - baseRight - winW;
    const defaultTop = viewportH - baseBottom - winH;

    setWinPos({
      x: left - defaultLeft,
      y: top - defaultTop
    });
  }, [isExpanded, isMobile]);


  const handleSend = async () => {
    if (!input.trim()) return;
    if (loading) return;

    const userMsg: ChatMessage = {role: 'user', content: input};
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const newHistory = [...messages, userMsg];
      const response = await sendChatMessage(newHistory);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error(error);
      toast.error(t('ai.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- 核心拖拽逻辑 (带边界限制) ---
  const handleDragStart = useCallback(( // 【优化】使用 useCallback 避免不必要的重新创建
    e: React.MouseEvent | React.TouchEvent,
    type: 'button' | 'window'
  ) => {
    isDraggingRef.current = false;

    const element = type === 'button' ? btnRef.current : winRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    boundsRef.current = {
      minX: -rect.left,
      maxX: viewportW - rect.right,
      minY: -rect.top,
      maxY: viewportH - rect.bottom
    };

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragStartPosRef.current = {x: clientX, y: clientY};
    elementStartPosRef.current = type === 'button' ? {...btnPos} : {...winPos};

    setIsDraggingState(true);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const rawDeltaX = currentX - dragStartPosRef.current.x;
      const rawDeltaY = currentY - dragStartPosRef.current.y;

      if (Math.abs(rawDeltaX) > 5 || Math.abs(rawDeltaY) > 5) {
        isDraggingRef.current = true;
      }

      const clampedDeltaX = Math.min(Math.max(rawDeltaX, boundsRef.current.minX), boundsRef.current.maxX);
      const clampedDeltaY = Math.min(Math.max(rawDeltaY, boundsRef.current.minY), boundsRef.current.maxY);

      const newPos = {
        x: elementStartPosRef.current.x + clampedDeltaX,
        y: elementStartPosRef.current.y + clampedDeltaY
      };

      if (type === 'button') {
        setBtnPos(newPos);
      } else {
        setWinPos(newPos);
      }
    };

    const handleUp = () => {
      setIsDraggingState(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, {passive: false});
    document.addEventListener('touchend', handleUp);
  }, [btnPos, winPos]); // 【优化】依赖 btnPos 和 winPos

  const handleButtonClick = () => {
    if (isDraggingRef.current) return;

    const btn = btnRef.current;
    const win = winRef.current;

    if (btn) {
      const btnRect = btn.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // 窗口尺寸（小窗）
      const winW = 384; // w-96
      const winH = 600;

      // 目标：窗口中心 ≈ 按钮中心
      let left = btnRect.left + btnRect.width / 2 - winW / 2;
      let top = btnRect.top + btnRect.height / 2 - winH / 2;

      // 防止出屏
      left = Math.max(16, Math.min(left, viewportW - winW - 16));
      top = Math.max(16, Math.min(top, viewportH - winH - 16));

      // 转成基于 right / bottom 的 transform
      const baseRight = 24;
      const baseBottom = 96;

      const defaultLeft = viewportW - baseRight - winW;
      const defaultTop = viewportH - baseBottom - winH;

      setWinPos({
        x: left - defaultLeft,
        y: top - defaultTop
      });
    }

    setIsOpen(true);
    setShowLeftRightButtonsMobile(false)

  };

  // --- 渲染：悬浮按钮 ---
  if (!isOpen) {
    return (
      <button
        ref={btnRef}
        onMouseDown={(e) => handleDragStart(e, 'button')}
        onTouchStart={(e) => handleDragStart(e, 'button')}
        onClick={handleButtonClick}
        className={`fixed z-50 p-4 rounded-full shadow-lg active:scale-95
          ${dark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'}
          ${isDraggingState ? '' : 'transition-transform'}
          cursor-move touch-none
        `}
        style={{
          transform: `translate3d(${btnPos.x}px, ${btnPos.y}px, 0)`,
          bottom: '1.5rem',
          right: '1.5rem',
          touchAction: 'none'
        }}
      >
        <MessageCircle size={28}/>
      </button>
    );
  }

  // --- 渲染：聊天窗口 ---
  // 计算窗口尺寸类名
  const windowSizeClass = isMobile
    ? 'inset-0 w-full h-full rounded-none'
    : isExpanded
      ? 'w-[800px] h-[700px] max-w-[95vw] max-h-[90vh] rounded-2xl border' // 大窗模式
      : 'w-96 h-[600px] rounded-2xl border'; // 普通模式

  return (
    <div
      ref={winRef}
      className={`fixed z-50 flex flex-col shadow-2xl overflow-hidden
        ${windowSizeClass}
        ${dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
      `}
      style={!isMobile ? {
        transform: `translate3d(${winPos.x}px, ${winPos.y}px, 0)`,
        bottom: '6rem', // 初始位置
        right: '1.5rem', // 初始位置
        // 同样，拖拽时移除 transition 效果
        transition: isDraggingState ? 'none' : 'width 0.3s, height 0.3s, transform 0.1s'
      } : {}}
    >
      {/* Header */}
      <div
        className={`p-4 flex justify-between items-center border-b select-none
          ${dark ? 'bg-gray-800 border-gray-700' : 'bg-blue-500 text-white'}
          ${!isMobile ? 'cursor-move' : ''}
        `}
        onMouseDown={(e) => !isMobile && handleDragStart(e, 'window')}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <Bot size={24}/>
          <h3 className="font-bold text-lg">{t('ai.name')}</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* 大窗/小窗切换按钮 (仅PC显示) */}
          {!isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                const rect = winRef.current?.getBoundingClientRect();
                if (rect) {
                  winCenterRef.current = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  };
                }

                setIsExpanded(v => !v);
              }}
              className="p-1 hover:bg-white/20 rounded-full transition"
              title={isExpanded ? t('ai.mini window') : t('ai.full window')}
            >
              {isExpanded ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
            </button>
          )}

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setWinPos({x: 0, y: 0});
              setIsExpanded(false);
              setMessages([]);
              if(!showSidebar){
              setShowLeftRightButtonsMobile(true)
              }
            }}
            className="p-1 hover:bg-white/20 rounded-full transition"
          >
            <X size={24}/>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user'
              ? (dark ? 'bg-blue-600 text-white rounded-br-none' : 'bg-blue-500 text-white rounded-br-none')
              : (dark ? 'bg-gray-800 text-gray-100 rounded-bl-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm')
            }
            `}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-1" {...props} />,
                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-blue-500" {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className={`p-3 rounded-2xl rounded-bl-none ${dark ? 'bg-gray-800' : 'bg-white border'}`}>
              <Loader2 className="animate-spin w-5 h-5 text-blue-500"/>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input Area */}
      <div className={`p-3 border-t ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('ai.placeholder')}
            className={`flex-1 resize-none rounded-xl p-3 max-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${dark ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-900 placeholder-gray-500'}
            `}
            rows={1}
            style={{minHeight: '44px'}}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`p-3 rounded-xl transition-colors flex-shrink-0
              ${loading || !input.trim()
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
            }
            `}
          >
            <Send size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
};
