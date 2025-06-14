'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import { type TokenPrice } from '@/lib/priceService';

// 刷单配置
interface VolumeConfig {
  enabled: boolean;
  interval: string;        // 刷单间隔（秒）
  minAmount: string;       // 最小交易金额
  maxAmount: string;       // 最大交易金额
  selectedWallets: string[]; // 选中的钱包
}

interface VolumeBotProps {
  selectedToken: TokenPrice | null;
  currentPrice: string;
  onTradeExecuted: (trade: any) => void;
}

const VolumeBot: React.FC<VolumeBotProps> = ({
  selectedToken,
  currentPrice,
  onTradeExecuted
}) => {
  const { wallets: importedWallets, hasWallets } = useWalletData();

  // 刷单配置
  const [volumeConfig, setVolumeConfig] = useState<VolumeConfig>({
    enabled: false,
    interval: '30',
    minAmount: '0.001',
    maxAmount: '0.01',
    selectedWallets: []
  });

  // 操作状态
  const [isVolumeBot, setIsVolumeBot] = useState(false);
  const [volumeInterval, setVolumeInterval] = useState<NodeJS.Timeout | null>(null);

  // 钱包选择切换
  const toggleWalletForVolume = (address: string) => {
    setVolumeConfig(prev => ({
      ...prev,
      selectedWallets: prev.selectedWallets.includes(address)
        ? prev.selectedWallets.filter(addr => addr !== address)
        : [...prev.selectedWallets, address]
    }));
  };

  // 全选钱包
  const selectAllWallets = () => {
    setVolumeConfig(prev => ({
      ...prev,
      selectedWallets: importedWallets.map(wallet => wallet.address)
    }));
    toast.success(`已选择所有 ${importedWallets.length} 个钱包`);
  };

  // 取消全选
  const deselectAllWallets = () => {
    setVolumeConfig(prev => ({
      ...prev,
      selectedWallets: []
    }));
    toast.info('已取消选择所有钱包');
  };

  // 开始刷单
  const startVolumeBot = () => {
    if (!hasWallets() || volumeConfig.selectedWallets.length === 0) {
      toast.error('请选择钱包进行刷单');
      return;
    }

    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    setIsVolumeBot(true);
    toast.success(`刷单机器人已启动，使用 ${volumeConfig.selectedWallets.length} 个钱包`);

    const interval = setInterval(() => {
      const randomWallet = volumeConfig.selectedWallets[
        Math.floor(Math.random() * volumeConfig.selectedWallets.length)
      ];
      const randomAmount = (
        Math.random() * (parseFloat(volumeConfig.maxAmount) - parseFloat(volumeConfig.minAmount)) +
        parseFloat(volumeConfig.minAmount)
      ).toFixed(6);

      const tradeType = Math.random() > 0.5 ? 'BUY' : 'SELL';

      const trade = {
        type: `VOLUME_${tradeType}`,
        amount: randomAmount,
        price: currentPrice,
        timestamp: new Date().toLocaleString(),
        wallet: randomWallet
      };

      onTradeExecuted(trade);
    }, parseInt(volumeConfig.interval) * 1000);

    setVolumeInterval(interval);
  };

  // 停止刷单
  const stopVolumeBot = () => {
    if (volumeInterval) {
      clearInterval(volumeInterval);
      setVolumeInterval(null);
    }
    setIsVolumeBot(false);
    toast.info('刷单机器人已停止');
  };

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-6 h-full">
      <h2 className="text-lg font-semibold mb-4">刷单功能</h2>

      <div className="space-y-4">
        {/* 基础配置 */}
        <div>
          <label className="block text-sm font-medium mb-1">交易间隔 (秒)</label>
          <input
            type="number"
            placeholder="每次交易间隔"
            value={volumeConfig.interval}
            onChange={(e) => setVolumeConfig(prev => ({ ...prev, interval: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">最小金额</label>
            <input
              type="number"
              step="0.001"
              placeholder="最小交易金额"
              value={volumeConfig.minAmount}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, minAmount: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">最大金额</label>
            <input
              type="number"
              step="0.001"
              placeholder="最大交易金额"
              value={volumeConfig.maxAmount}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, maxAmount: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 钱包选择 */}
        {hasWallets() && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">选择刷单钱包</label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllWallets}
                  disabled={volumeConfig.selectedWallets.length === importedWallets.length}
                  className="rounded-md bg-blue-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  全选
                </button>
                <button
                  onClick={deselectAllWallets}
                  disabled={volumeConfig.selectedWallets.length === 0}
                  className="rounded-md bg-gray-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  取消全选
                </button>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50/5">
              <div className="space-y-1 p-2">
                {importedWallets.slice(0, 20).map((wallet, index) => (
                  <label key={wallet.address} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50/10 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={volumeConfig.selectedWallets.includes(wallet.address)}
                      onChange={() => toggleWalletForVolume(wallet.address)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-mono flex-1">
                      #{index + 1} {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </span>
                  </label>
                ))}

                {importedWallets.length > 20 && (
                  <div className="text-xs text-gray-400 text-center p-2">
                    还有 {importedWallets.length - 20} 个钱包未显示
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>已选择 {volumeConfig.selectedWallets.length} / {importedWallets.length} 个钱包</span>
              {volumeConfig.selectedWallets.length > 0 && (
                <span className="text-green-400">
                  预计 {(60 / parseInt(volumeConfig.interval || '30') * volumeConfig.selectedWallets.length).toFixed(1)} 笔/分钟
                </span>
              )}
            </div>
          </div>
        )}

        {!hasWallets() && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">请先在"钱包工具"中导入钱包数据</p>
            <p className="text-xs mt-1">导入钱包后即可使用刷单功能</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={startVolumeBot}
            disabled={!hasWallets() || !selectedToken || isVolumeBot || volumeConfig.selectedWallets.length === 0}
            className="flex-1 rounded-md bg-purple-600 cursor-pointer px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isVolumeBot ? '刷单中...' : '开始刷单'}
          </button>
          {isVolumeBot && (
            <button
              onClick={stopVolumeBot}
              className="flex-1 rounded-md bg-gray-600 cursor-pointer px-4 py-2 text-white hover:bg-gray-700"
            >
              停止刷单
            </button>
          )}
        </div>

        {/* 状态显示 */}
        {isVolumeBot && (
          <div className="rounded-lg bg-purple-50/10 border border-purple-500/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-400 font-semibold">🤖 刷单机器人运行中</span>
              <span className="text-purple-300">每 {volumeConfig.interval}s 一次交易</span>
            </div>
            <div className="text-xs text-purple-300 mt-1">
              使用 {volumeConfig.selectedWallets.length} 个钱包 |
              交易金额: {volumeConfig.minAmount} - {volumeConfig.maxAmount} ETH
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeBot; 