import React, { ReactNode } from 'react';

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
  showCancelButton?: boolean;
  cancelButtonLabel?: string;
  onCancel?: () => void;

  // 样式配置
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  fullScreenOnMobile?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;

  // 国际化
  t?: (key: string) => string;

  // 其他
  className?: string;
  dataTestId?: string;
}

const GenericDialog: React.FC<GenericDialogProps> = ({
                                                       title,
                                                       description,
                                                       dark = false,
                                                       icon,
                                                       iconVariant,
                                                       children,
                                                       primaryButton,
                                                       secondaryButton,
                                                       additionalButtons = [],
                                                       showCancelButton = true,
                                                       cancelButtonLabel = 'Cancel',
                                                       onCancel,
                                                       maxWidth = 'lg',
                                                       fullScreenOnMobile = false,
                                                       showCloseButton = true,
                                                       onClose,
                                                       t,
                                                       className = '',
                                                       dataTestId = 'generic-dialog',
                                                     }) => {
  // 获取图标颜色
  const getIconColor = () => {
    if (iconVariant) {
      const colors = {
        success: dark ? 'text-green-400' : 'text-green-600',
        warning: dark ? 'text-yellow-400' : 'text-yellow-600',
        error: dark ? 'text-red-400' : 'text-red-600',
        info: dark ? 'text-blue-400' : 'text-blue-600',
        question: dark ? 'text-purple-400' : 'text-purple-600',
      };
      return colors[iconVariant];
    }
    return dark ? 'text-gray-400' : 'text-gray-500';
  };

  // 获取按钮样式
  const getButtonClasses = (variant: ButtonVariant = 'primary') => {
    const baseClasses = 'px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: dark
        ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
        : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400',

      secondary: dark
        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400',

      danger: dark
        ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
        : 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400',

      warning: dark
        ? 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500'
        : 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',

      success: dark
        ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
        : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400',

      outline: dark
        ? 'border border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',

      ghost: dark
        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
    };

    return `${baseClasses} ${variants[variant]}`;
  };

  // 获取最大宽度类
  const getMaxWidthClass = () => {
    const widths = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full',
    };
    return widths[maxWidth];
  };

  // 获取默认图标
  const getDefaultIcon = () => {
    if (icon) return icon;

    const icons = {
      success: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      error: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      info: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      question: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    return iconVariant ? icons[iconVariant] : null;
  };

  // 收集所有按钮
  const allButtons: DialogButton[] = [];

  if (primaryButton) allButtons.push(primaryButton);
  if (secondaryButton) allButtons.push(secondaryButton);
  if (additionalButtons.length > 0) allButtons.push(...additionalButtons);

  // 渲染按钮
  const renderButton = (button: DialogButton, index: number) => (
    <button
      key={`button-${index}`}
      onClick={button.onClick}
      disabled={button.disabled}
      className={`${getButtonClasses(button.variant)} ${button.className || ''}`}
      data-testid={button.dataTestId}
    >
      {button.loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {button.label}
        </span>
      ) : (
        button.label
      )}
    </button>
  );

  return (
    <div
      data-testid={dataTestId}
      className={`
        ${dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-xl p-6 w-full
        ${getMaxWidthClass()}
        ${fullScreenOnMobile ? 'sm:rounded-lg sm:p-6' : ''}
        ${className}
        transition-all duration-200 ease-in-out
      `}
    >
      {/* 关闭按钮 */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={`
            absolute top-4 right-4
            ${dark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
            p-1 rounded-full hover:bg-opacity-20
            ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
            transition-colors
          `}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 图标区域 */}
      <div className="flex items-start mb-4">
        {icon || iconVariant ? (
          <div className={`flex-shrink-0 ${getIconColor()}`}>
            {getDefaultIcon()}
          </div>
        ) : null}

        <div className={`${icon || iconVariant ? 'ml-4' : ''} flex-1`}>
          {/* 标题 */}
          <h3 className="text-xl font-bold">
            {title}
          </h3>

          {/* 描述 */}
          {description && (
            <p className={`text-sm ${dark ? 'opacity-90' : 'text-gray-600'} mt-1`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* 自定义内容区域 */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}

      {/* 按钮区域 */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {/* 主按钮和次按钮在一行 */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {allButtons.map((button, index) => (
            <div key={`button-container-${index}`} className="flex-1">
              {renderButton(button, index)}
            </div>
          ))}
        </div>

        {/* 取消按钮单独一行或跟随布局 */}
        {showCancelButton && onCancel && (
          <button
            onClick={onCancel}
            className={`
              ${allButtons.length === 0 ? 'flex-1' : 'w-full sm:w-auto'}
              ${getButtonClasses('ghost')}
              ${allButtons.length === 0 ? '' : 'mt-3 sm:mt-0 sm:ml-3'}
            `}
            data-testid="cancel-button"
          >
            {t ? t('common.cancel') : cancelButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default GenericDialog;
