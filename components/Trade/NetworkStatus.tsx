'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  speed: number | null; // KB/s
  latency: number | null; // ms
  lastChecked: Date | null;
}

interface NetworkStatusProps {
  className?: string;
}

const NetworkStatusComponent: React.FC<NetworkStatusProps> = ({ className = '' }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    speed: null,
    latency: null,
    lastChecked: null
  });

  const [isChecking, setIsChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);

  // 测试网络速度
  const measureNetworkSpeed = async (): Promise<{ speed: number; latency: number }> => {
    const startTime = performance.now();

    try {
      // 使用小文件测试延迟
      const latencyStart = performance.now();
      await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const latency = performance.now() - latencyStart;

      // 使用稍大的文件测试速度（约100KB）
      const speedStart = performance.now();
      const response = await fetch('https://httpbin.org/bytes/102400', {
        cache: 'no-cache'
      });

      if (!response.ok) throw new Error('Network test failed');

      const data = await response.arrayBuffer();
      const speedEnd = performance.now();

      const duration = (speedEnd - speedStart) / 1000; // 转换为秒
      const sizeKB = data.byteLength / 1024; // 转换为KB
      const speed = sizeKB / duration; // KB/s

      return { speed, latency };
    } catch (error) {
      // 备用测试方法
      try {
        const testStart = performance.now();
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors'
        });
        const testLatency = performance.now() - testStart;

        return { speed: 0, latency: testLatency };
      } catch (backupError) {
        throw new Error('All network tests failed');
      }
    }
  };

  // 执行网络检测
  const checkNetworkStatus = async () => {
    setIsChecking(true);

    try {
      const { speed, latency } = await measureNetworkSpeed();

      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        speed: Math.round(speed),
        latency: Math.round(latency),
        lastChecked: new Date()
      }));

    } catch (error) {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        speed: null,
        latency: null,
        lastChecked: new Date()
      }));

      console.error('Network check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      toast.success('网络已连接');
      if (autoCheck) {
        checkNetworkStatus();
      }
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        speed: null,
        latency: null,
        lastChecked: new Date()
      }));
      toast.error('网络连接断开');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始化检测
    if (typeof navigator !== 'undefined' && navigator.onLine && autoCheck) {
      checkNetworkStatus();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoCheck]);

  // 自动检测定时器
  useEffect(() => {
    if (!autoCheck) return;

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        checkNetworkStatus();
      }
    }, 5000); // 每5秒检测一次

    return () => clearInterval(interval);
  }, [autoCheck]);

  // 获取网络速度等级
  const getSpeedLevel = (speed: number | null): { level: string; color: string; text: string } => {
    if (!speed || speed === 0) return { level: 'unknown', color: 'text-gray-400', text: '未知' };

    if (speed > 1000) return { level: 'excellent', color: 'text-green-400', text: '优秀' };
    if (speed > 500) return { level: 'good', color: 'text-blue-400', text: '良好' };
    if (speed > 100) return { level: 'fair', color: 'text-yellow-400', text: '一般' };
    return { level: 'poor', color: 'text-red-400', text: '较慢' };
  };

  // 获取延迟等级
  const getLatencyLevel = (latency: number | null): { level: string; color: string; text: string } => {
    if (!latency) return { level: 'unknown', color: 'text-gray-400', text: '未知' };

    if (latency < 50) return { level: 'excellent', color: 'text-green-400', text: '优秀' };
    if (latency < 100) return { level: 'good', color: 'text-blue-400', text: '良好' };
    if (latency < 200) return { level: 'fair', color: 'text-yellow-400', text: '一般' };
    return { level: 'poor', color: 'text-red-400', text: '较高' };
  };

  const speedInfo = getSpeedLevel(networkStatus.speed);
  const latencyInfo = getLatencyLevel(networkStatus.latency);

  return (
    <div className={`rounded-lg bg-[#FFFFFF1A] p-2  ${className}`}>
      {/* <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold">网络状态</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoCheck(!autoCheck)}
            className={`text-[10px] px-2 py-1 rounded ${autoCheck ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
              }`}
            title={autoCheck ? '自动检测已开启' : '自动检测已关闭'}
          >
            {autoCheck ? '自动' : '手动'}
          </button>
          <button
            onClick={checkNetworkStatus}
            disabled={isChecking}
            className="text-[10px] px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isChecking ? '检测中...' : '立即检测'}
          </button>
        </div>
      </div> */}

      <div className="space-y-2 ">
        {/* 连接状态 */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">状态:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${networkStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            {/* <span className={`text-[10px] font-semibold ${networkStatus.isOnline ? 'text-green-400' : 'text-red-400'
              }`}>
              {networkStatus.isOnline ? '在线' : '离线'}
            </span> */}
          </div>
        </div>

        {/* 网络速度 */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">速度:</span>
          <div className="flex items-center space-x-2">
            {networkStatus.speed !== null ? (
              <>
                <span className="text-[10px] font-mono">
                  {networkStatus.speed > 1024
                    ? `${(networkStatus.speed / 1024).toFixed(1)} MB/s`
                    : `${networkStatus.speed} KB/s`
                  }
                </span>
                <span className={`text-[10px] ${speedInfo.color}`}>
                  ({speedInfo.text})
                </span>
              </>
            ) : (
              <span className="text-[10px] text-gray-400">
                {isChecking ? '测试中...' : '未检测'}
              </span>
            )}
          </div>
        </div>

        {/* 网络延迟 */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">延迟:</span>
          <div className="flex items-center space-x-2">
            {networkStatus.latency !== null ? (
              <>
                <span className="text-[10px] font-mono">
                  {networkStatus.latency}ms
                </span>
                <span className={`text-[10px] ${latencyInfo.color}`}>
                  ({latencyInfo.text})
                </span>
              </>
            ) : (
              <span className="text-[10px] text-gray-400">
                {isChecking ? '测试中...' : '未检测'}
              </span>
            )}
          </div>
        </div>

        {/* 最后检测时间 */}
        {/* {networkStatus.lastChecked && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">最后检测:</span>
            <span className="text-[10px] text-gray-500">
              {networkStatus.lastChecked.toLocaleTimeString()}
            </span>
          </div>
        )} */}

        {/* 网络质量指示器 */}
        <div className="mt-2 pt-1 border-t border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-400">网络质量:</span>
            {/* <span className="text-[10px] text-gray-400">
              {networkStatus.isOnline ? '当前状态' : '连接异常'}
            </span> */}
          </div>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((level) => {
              let isActive = false;
              if (networkStatus.isOnline && networkStatus.speed !== null) {
                if (networkStatus.speed > 1000) isActive = level <= 5;
                else if (networkStatus.speed > 500) isActive = level <= 4;
                else if (networkStatus.speed > 100) isActive = level <= 3;
                else if (networkStatus.speed > 50) isActive = level <= 2;
                else isActive = level <= 1;
              }

              return (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded ${isActive
                    ? level <= 2 ? 'bg-red-500' : level <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                    : 'bg-gray-600'
                    }`}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusComponent; 