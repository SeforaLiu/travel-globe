// GenericDialog.tsx

import React, { ReactNode } from 'react';
// 导入 lucide-react 图标库，与 MoodDialog 保持一致
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  HelpCircle,
} from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost';

export interface DialogButton {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  dataTestId?: string;
}

export interface GenericDialogProps {
  // 新增：控制对话框的显示状态
  isOpen: boolean;

  // 基础配置
  title: string | ReactNode;
  description?: string | ReactNode;
  dark?: boolean;

  // 图标相关
  icon?: ReactNode;
  iconVariant?: 'success' | 'warning' | 'error' | 'info' | 'question';

  // 内容区域
  children?: ReactNode;

  // 按钮配置
  primaryButton?: DialogButton;
  secondaryButton?: DialogButton;
  additionalButtons?: DialogButton[];
  // 如果需要取消按钮，可以这样传递：
  // secondaryButton={{ label: 'Cancel', onClick: handleCancel, variant: 'ghost' }}

  // 样式配置
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // 移除了 'full'，因为对话框通常不应占满全屏
  showCloseButton?: boolean;
  onClose: () => void;

  // 国际化
  t?: (key: string) => string;

  // 其他
  className?: string;
  dataTestId?: string;
}

const GenericDialog: React.FC<GenericDialogProps> = ({
                                                       isOpen,
                                                       title,
                                                       description,
                                                       dark = false,
                                                       icon,
                                                       iconVariant,
                                                       children,
                                                       primaryButton,
                                                       secondaryButton,
                                                       additionalButtons = [],
                                                       maxWidth = 'md',
                                                       showCloseButton = true,
                                                       onClose,
                                                       t,
                                                       className = '',
                                                       dataTestId = 'generic-dialog',
                                                     }) => {
  if (!isOpen) {
    return null;
  }

  // 获取图标颜色
  const getIconColor = () => {
    if (iconVariant) {
      const colors = {
        success: 'text-green-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
        info: 'text-blue-500',
        question: 'text-purple-500',
      };
      return colors[iconVariant];
    }
    return dark ? 'text-gray-400' : 'text-gray-500';
  };

  // 获取按钮样式 (全新设计的现代样式)
  const getButtonClasses = (variant: ButtonVariant = 'primary') => {
    const baseClasses =
      'w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
    const darkOffset = dark ? 'dark:focus:ring-offset-gray-900' : 'focus:ring-offset-white';

    const variants = {
      primary: dark
        ? 'bg-slate-50 text-slate-900 hover:bg-slate-200 focus:ring-slate-400'
        : 'bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500',
      secondary: dark
        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus:ring-gray-600'
        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',
      success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      outline: dark
        ? 'border border-gray-700 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
      ghost: dark
        ? 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 focus:ring-gray-500'
        : 'bg-gray-100 text-gray-800 hover:text-gray-900 hover:bg-gray-200 focus:ring-gray-400',
    };

    return `${baseClasses} ${darkOffset} ${variants[variant]}`;
  };

  // 获取最大宽度类
  const getMaxWidthClass = () => {
    const widths = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };
    return widths[maxWidth];
  };

  // 获取默认图标 (使用 lucide-react)
  const getDefaultIcon = () => {
    if (icon) return icon;
    const iconProps = { size: 28, 'aria-hidden': true };

    const icons = {
      success: <CheckCircle2 {...iconProps} />,
      warning: <AlertTriangle {...iconProps} />,
      error: <XCircle {...iconProps} />,
      info: <Info {...iconProps} />,
      question: <HelpCircle {...iconProps} />,
    };

    return iconVariant ? icons[iconVariant] : null;
  };

  // 收集所有按钮
  const allButtons: DialogButton[] = [];
  if (secondaryButton) allButtons.push({ variant: 'ghost', ...secondaryButton }); // 默认次要按钮为 ghost
  if (primaryButton) allButtons.push({ variant: 'primary', ...primaryButton });
  // 你可以根据需要调整按钮顺序
  // if (additionalButtons.length > 0) allButtons.push(...additionalButtons);

  // 渲染按钮
  const renderButton = (button: DialogButton, index: number) => (
    <button
      key={`button-${index}`}
      onClick={button.onClick}
      disabled={button.disabled || button.loading}
      className={`${getButtonClasses(button.variant)} ${button.className || ''}`}
      data-testid={button.dataTestId}
    >
      {button.loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {button.label}
    </button>
  );

  return (
    // 1. 背景遮罩层：提供背景模糊和半透明效果，让对话框更突出
    <div
      data-testid={dataTestId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose} // 点击背景关闭对话框
    >
      {/* 2. 对话框面板：阻止事件冒泡到背景层 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full ${getMaxWidthClass()} rounded-2xl p-6 shadow-2xl transform transition-all
          ${dark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900'}
          ${className}
        `}
      >
        {/* 3. 头部区域：标题和关闭按钮分离 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 4. 内容区域：图标和文字左右布局 */}
        <div className="flex items-start gap-4">
          {icon || iconVariant ? (
            <div className={`flex-shrink-0 mt-1 ${getIconColor()}`}>{getDefaultIcon()}</div>
          ) : null}

          <div className="flex-1 mt-1">
            {description && (
              <p className={`text-base ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{description}</p>
            )}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>

        {/* 5. 按钮区域：采用纯 CSS 响应式设计 */}
        {/* 在小屏幕上 (默认) 是垂直排列，在 sm 及以上屏幕是水平排列 */}
        {(primaryButton || secondaryButton || additionalButtons.length > 0) && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            {secondaryButton && renderButton({ variant: 'ghost', ...secondaryButton }, 1)}
            {primaryButton && renderButton({ variant: 'primary', ...primaryButton }, 0)}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericDialog;
