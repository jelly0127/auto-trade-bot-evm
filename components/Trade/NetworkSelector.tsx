'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  EVM_NETWORKS,
  getMainnetConfigs,
  getTestnetConfigs,
  type NetworkConfig
} from '@/config/tradeConfig';

interface NetworkSelectorProps {
  selectedChainId: number;
  onNetworkChange: (chainId: number) => void;
  showTestnets?: boolean;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  selectedChainId,
  onNetworkChange,
  showTestnets = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTestnetToggle, setShowTestnetToggle] = useState(showTestnets);

  const selectedNetwork = EVM_NETWORKS[selectedChainId];
  const mainnetConfigs = getMainnetConfigs();
  const testnetConfigs = getTestnetConfigs();

  const handleNetworkSelect = (chainId: number) => {
    onNetworkChange(chainId);
    setIsOpen(false);

    const network = EVM_NETWORKS[chainId];
    toast.success(`已切换到 ${network.name}`, {
      description: `DEX: ${network.dex.name}`
    });
  };

  const getNetworkIcon = (network: NetworkConfig) => {
    const iconMap: { [key: string]: string } = {
      'ETH': '🔷',
      'BSC': '🟡',
      'MATIC': '🟣',
      'ARB': '🔵',
      'OP': '🔴',
      'AVAX': '🔺',
      'FTM': '👻',
      'CRO': '💎',
      'ONE': '🌈'
    };
    return iconMap[network.shortName] || '⚡';
  };

  const getNetworkStatus = (network: NetworkConfig) => {
    // 这里可以添加网络状态检查逻辑
    return 'online'; // 'online' | 'slow' | 'offline'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'slow': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="relative">
      {/* 当前选择的网络 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-lg bg-[#FFFFFF1A] border border-gray-600 px-3 py-2 text-sm hover:bg-[#FFFFFF2A] transition-colors"
      >
        <span className="text-lg">{getNetworkIcon(selectedNetwork)}</span>
        <div className="flex flex-col items-start">
          <span className="font-medium">{selectedNetwork.shortName}</span>
          <span className="text-xs text-gray-400">{selectedNetwork.dex.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 网络选择下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 rounded-lg bg-[#1A1A1A] border border-gray-600 shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* 测试网开关 */}
          <div className="p-3 border-b border-gray-600">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTestnetToggle}
                onChange={(e) => setShowTestnetToggle(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-sm text-gray-300">显示测试网</span>
            </label>
          </div>

          {/* 主网列表 */}
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-400 px-2 py-1 mb-1">
              主网 ({mainnetConfigs.length})
            </div>
            {mainnetConfigs.map((network) => {
              const isSelected = network.chainId === selectedChainId;
              const status = getNetworkStatus(network);

              return (
                <button
                  key={network.chainId}
                  onClick={() => handleNetworkSelect(network.chainId)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-[#FFFFFF1A] transition-colors ${isSelected ? 'bg-blue-600/20 border border-blue-500/30' : ''
                    }`}
                >
                  <span className="text-lg">{getNetworkIcon(network)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{network.name}</span>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {network.dex.name} • {network.nativeCurrency.symbol}
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* 测试网列表 */}
          {showTestnetToggle && (
            <div className="p-2 border-t border-gray-600">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1 mb-1">
                测试网 ({testnetConfigs.length})
              </div>
              {testnetConfigs.map((network) => {
                const isSelected = network.chainId === selectedChainId;
                const status = getNetworkStatus(network);

                return (
                  <button
                    key={network.chainId}
                    onClick={() => handleNetworkSelect(network.chainId)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-[#FFFFFF1A] transition-colors ${isSelected ? 'bg-blue-600/20 border border-blue-500/30' : ''
                      }`}
                  >
                    <span className="text-lg">{getNetworkIcon(network)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{network.name}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                        <span className="text-xs bg-orange-600/20 text-orange-400 px-1 rounded">TEST</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {network.dex.name} • {network.nativeCurrency.symbol}
                      </div>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 网络信息 */}
          <div className="p-3 border-t border-gray-600 bg-[#0F0F0F]">
            <div className="text-xs text-gray-400">
              <div className="flex justify-between mb-1">
                <span>当前网络:</span>
                <span className="text-white">{selectedNetwork.name}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>链ID:</span>
                <span className="text-white">{selectedNetwork.chainId}</span>
              </div>
              <div className="flex justify-between">
                <span>原生代币:</span>
                <span className="text-white">{selectedNetwork.nativeCurrency.symbol}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NetworkSelector; 