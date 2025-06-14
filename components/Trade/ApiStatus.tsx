'use client';
import React, { useState, useEffect } from 'react';

interface ApiStatusProps {
  className?: string;
}

interface ApiHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: Date | null;
  responseTime?: number;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ className = '' }) => {
  const [apiStatuses, setApiStatuses] = useState<ApiHealth[]>([
    { name: 'DexScreener', status: 'unknown', lastCheck: null },
    { name: 'CoinGecko', status: 'unknown', lastCheck: null },
  ]);

  const checkApiHealth = async () => {
    const testAddress = '0x0292280a1a45cbc01b7311137f4017c3fb014444'; // 测试地址
    const newStatuses: ApiHealth[] = [];

    // 检查 DexScreener
    try {
      const start = Date.now();
      const response = await fetch(`/api/dexscreener?address=${testAddress}`);
      const responseTime = Date.now() - start;

      newStatuses.push({
        name: 'DexScreener',
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime
      });
    } catch (error) {
      newStatuses.push({
        name: 'DexScreener',
        status: 'down',
        lastCheck: new Date()
      });
    }

    // 检查 CoinGecko
    try {
      const start = Date.now();
      const response = await fetch(`/api/coingecko?address=${testAddress}&platform=binance-smart-chain`);
      const responseTime = Date.now() - start;

      newStatuses.push({
        name: 'CoinGecko',
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime
      });
    } catch (error) {
      newStatuses.push({
        name: 'CoinGecko',
        status: 'down',
        lastCheck: new Date()
      });
    }

    setApiStatuses(newStatuses);
  };

  useEffect(() => {
    // 初始检查
    checkApiHealth();

    // 每30秒检查一次
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ApiHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: ApiHealth['status']) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'down': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusText = (status: ApiHealth['status']) => {
    switch (status) {
      case 'healthy': return '正常';
      case 'degraded': return '缓慢';
      case 'down': return '离线';
      default: return '未知';
    }
  };

  return (
    <div className={`rounded-lg bg-[#FFFFFF1A] p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">API状态</h3>
        <button
          onClick={checkApiHealth}
          className="text-xs text-blue-400 hover:text-blue-300"
          title="刷新状态"
        >
          🔄
        </button>
      </div>

      <div className="space-y-2">
        {apiStatuses.map((api) => (
          <div key={api.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span>{getStatusIcon(api.status)}</span>
              <span>{api.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={getStatusColor(api.status)}>
                {getStatusText(api.status)}
              </span>
              {api.responseTime && (
                <span className="text-gray-500">
                  {api.responseTime}ms
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {apiStatuses.some(api => api.lastCheck) && (
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-500">
          最后检查: {apiStatuses[0]?.lastCheck?.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default ApiStatus; 