// frontend/src/utils/deviceDetector.ts

/**
 * 设备检测工具类
 */

export interface DeviceInfo {
  isAppleDevice: boolean;
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isMac: boolean;
  iOSVersion: number | null;
  isSafari: boolean;
  isIOSChrome: boolean;
  isIOSFirefox: boolean;
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * 检测设备信息
 */
export const detectDevice = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return getDefaultDeviceInfo();
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  const vendor = navigator.vendor.toLowerCase();

  // Apple 设备检测
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isMac = /macintosh|mac os x/.test(userAgent) && !/(windows|android)/.test(userAgent);
  const isApplePlatform = platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad');
  const isAppleVendor = vendor.includes('apple');
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIPadPro = maxTouchPoints > 0 && platform.includes('mac') && isAppleVendor;

  const isAppleDevice = isIOS || isMac || isApplePlatform || isAppleVendor || isIPadPro;

  // iOS 版本检测
  let iOSVersion: number | null = null;
  if (isIOS) {
    const match = userAgent.match(/os (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      iOSVersion = parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  // 浏览器检测
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSChrome = /crios/.test(userAgent);
  const isIOSFirefox = /fxios/.test(userAgent);

  // 设备类型检测
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) ||
    (platform === 'macintel' && maxTouchPoints > 1);
  const isDesktop = !isMobile && !isTablet;

  return {
    isAppleDevice,
    isIOS,
    isIPad: /ipad/.test(userAgent) || (platform === 'macintel' && maxTouchPoints > 1),
    isIPhone: /iphone/.test(userAgent),
    isMac,
    iOSVersion,
    isSafari,
    isIOSChrome,
    isIOSFirefox,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isMobile,
    isTablet,
    isDesktop,
  };
};

/**
 * 获取默认设备信息（SSR 环境下使用）
 */
const getDefaultDeviceInfo = (): DeviceInfo => ({
  isAppleDevice: false,
  isIOS: false,
  isIPad: false,
  isIPhone: false,
  isMac: false,
  iOSVersion: null,
  isSafari: false,
  isIOSChrome: false,
  isIOSFirefox: false,
  userAgent: '',
  platform: '',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
});
