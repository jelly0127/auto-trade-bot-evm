'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import { type TokenPrice } from '@/lib/priceService';
import { createTradeRecord, executeBlockchainTrade } from '@/utils/tradeUtils';
import { defaultTradeConfig, getRpcUrl, MAINNET_CONFIG } from '@/config/tradeConfig';

// 刷单模式类型
type VolumeBotMode = 'INTERVAL' | 'BATCH_SELL';

// 刷单配置
interface VolumeConfig {
  enabled: boolean;
  mode: VolumeBotMode;     // 模式：定时刷单 | 批量卖出
  interval: string;        // 刷单间隔（秒）
  minAmount: string;       // 最小交易金额
  maxAmount: string;       // 最大交易金额
  sellPercentage: string;  // 批量卖出百分比
  selectedWallets: string[]; // 选中的钱包
  enableBuy: boolean;      // 启用买入
  enableSell: boolean;     // 启用卖出
}

interface VolumeBotProps {
  selectedToken: TokenPrice | null;
  currentPrice: string;
  onTradeExecuted: (trade: any) => void;
  chainId: number;
}

const VolumeBot: React.FC<VolumeBotProps> = ({
  selectedToken,
  currentPrice,
  onTradeExecuted,
  chainId
}) => {
  const { wallets: importedWallets, hasWallets } = useWalletData();

  // 刷单配置
  const [volumeConfig, setVolumeConfig] = useState<VolumeConfig>({
    enabled: false,
    mode: 'INTERVAL',        // 默认定时刷单模式
    interval: '30',
    minAmount: '0.0001',
    maxAmount: '0.0002',
    sellPercentage: '10',    // 默认卖出10%
    selectedWallets: [],
    enableBuy: true,         // 默认启用买入
    enableSell: true         // 默认启用卖出
  });

  // 操作状态
  const [isVolumeBot, setIsVolumeBot] = useState(false);
  const [volumeInterval, setVolumeInterval] = useState<NodeJS.Timeout | null>(null);
  const [tradeCount, setTradeCount] = useState(0);

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

  // 批量卖出功能
  const executeBatchSell = async () => {
    if (!selectedToken || !hasWallets()) {
      toast.error('请选择代币和钱包数据');
      return;
    }

    if (volumeConfig.selectedWallets.length === 0) {
      toast.error('请选择要执行批量卖出的钱包');
      return;
    }

    const percentage = parseFloat(volumeConfig.sellPercentage);
    if (percentage <= 0 || percentage > 100) {
      toast.error('卖出百分比必须在1-100之间');
      return;
    }

    const confirmMessage = `确认批量卖出操作？\n\n将对 ${volumeConfig.selectedWallets.length} 个钱包执行卖出 ${percentage}% 持仓的操作\n\n此操作不可撤销，请确认！`;

    if (!confirm(confirmMessage)) {
      return;
    }

    toast.info(`开始批量卖出 ${percentage}% 持仓，共 ${volumeConfig.selectedWallets.length} 个钱包`);

    let successCount = 0;
    let failCount = 0;

    // 并发执行所有钱包的卖出操作
    const promises = volumeConfig.selectedWallets.map(async (walletAddress, index) => {
      try {
        console.log(`🔄 [${index + 1}/${volumeConfig.selectedWallets.length}] 执行批量卖出: ${walletAddress.slice(0, 8)}... - ${percentage}%`);

        // 执行卖出交易
        const txHash = await executeBlockchainTrade({
          tokenAddress: selectedToken!.address,
          amount: percentage.toString(), // 传递百分比
          tradeType: 'SELL',
          walletPrivateKey: getWalletPrivateKey(walletAddress),
          chainId: chainId
        });

        const trade = createTradeRecord({
          type: 'BATCH_SELL',
          amount: `${percentage}%`,
          price: currentPrice,
          wallet: walletAddress,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          chainId: chainId,
          txHash: txHash,
          status: 'success'
        });

        console.log(`✅ [${index + 1}] 批量卖出成功:`, trade);
        onTradeExecuted(trade);
        successCount++;

        return { success: true, wallet: walletAddress, txHash };
      } catch (error) {
        console.error(`❌ [${index + 1}] 批量卖出失败:`, error);

        const failedTrade = createTradeRecord({
          type: 'BATCH_SELL',
          amount: `${percentage}%`,
          price: currentPrice,
          wallet: walletAddress,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          chainId: chainId,
          txHash: 'failed',
          status: 'failed'
        });

        onTradeExecuted(failedTrade);
        failCount++;

        return { success: false, wallet: walletAddress, error };
      }
    });

    // 等待所有交易完成
    const results = await Promise.allSettled(promises);

    // 显示结果统计
    toast.success(`批量卖出完成！成功: ${successCount}笔，失败: ${failCount}笔`, {
      duration: 5000
    });

    console.log(`📊 批量卖出统计: 成功 ${successCount}笔, 失败 ${failCount}笔`);
  };

  // 开始刷单
  const startVolumeBot = async () => {
    if (!selectedToken || !hasWallets()) {
      toast.error('请选择代币和钱包数据');
      return;
    }

    if (volumeConfig.mode === 'BATCH_SELL') {
      // 批量卖出模式
      await executeBatchSell();
      return;
    }

    // 定时刷单模式
    if (!volumeConfig.enableBuy && !volumeConfig.enableSell) {
      toast.error('请至少选择买入或卖出其中一种交易类型');
      return;
    }

    toast.success(`刷单机器人已启动，使用 ${volumeConfig.selectedWallets.length} 个钱包`);

    const interval = setInterval(async () => {
      const randomWallet = volumeConfig.selectedWallets[
        Math.floor(Math.random() * volumeConfig.selectedWallets.length)
      ];
      const randomAmount = (
        Math.random() * (parseFloat(volumeConfig.maxAmount) - parseFloat(volumeConfig.minAmount)) +
        parseFloat(volumeConfig.minAmount)
      ).toFixed(6);

      // 根据用户选择决定交易类型
      let tradeType: 'BUY' | 'SELL';
      if (volumeConfig.enableBuy && volumeConfig.enableSell) {
        // 两种都启用，随机选择
        tradeType = Math.random() > 0.5 ? 'BUY' : 'SELL';
      } else if (volumeConfig.enableBuy) {
        // 只启用买入
        tradeType = 'BUY';
      } else {
        // 只启用卖出
        tradeType = 'SELL';
      }

      try {
        console.log(`🤖 执行刷单交易: ${tradeType} ${randomAmount} BNB`);
        console.log(`💼 使用钱包: ${randomWallet.slice(0, 8)}...`);

        // 执行真实的区块链交易
        const txHash = await executeBlockchainTrade({
          tokenAddress: selectedToken!.address,
          amount: randomAmount,
          tradeType: tradeType,
          walletPrivateKey: getWalletPrivateKey(randomWallet),
          chainId: chainId
        });

        const trade = createTradeRecord({
          type: `VOLUME_${tradeType}`,
          amount: randomAmount,
          price: currentPrice,
          wallet: randomWallet,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          chainId: chainId,
          txHash: txHash,
          status: 'success'
        });

        console.log('🤖 刷单交易执行成功:', trade);
        onTradeExecuted(trade);
        setTradeCount(prev => prev + 1);

        // 添加toast提示（30%的概率显示提示）
        if (Math.random() < 0.3) {
          toast.success(`刷单 ${tradeType}: ${randomAmount}`, {
            duration: 1500,
            description: `交易哈希: ${txHash.slice(0, 10)}...`
          });
        }
      } catch (error) {
        console.error('🤖 刷单交易失败:', error);

        // 记录失败的交易
        const failedTrade = createTradeRecord({
          type: `VOLUME_${tradeType}`,
          amount: randomAmount,
          price: currentPrice,
          wallet: randomWallet,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          chainId: chainId,
          txHash: 'failed',
          status: 'failed'
        });

        onTradeExecuted(failedTrade);

        if (Math.random() < 0.2) { // 20%的概率显示错误提示
          toast.error(`刷单失败: ${error instanceof Error ? error.message : '未知错误'}`, {
            duration: 2000
          });
        }
      }
    }, parseInt(volumeConfig.interval) * 1000);

    setVolumeInterval(interval);
    setIsVolumeBot(true);
  };

  // 获取钱包私钥的辅助函数
  const getWalletPrivateKey = (walletAddress: string): string => {
    if (!importedWallets) {
      throw new Error('钱包数据未导入');
    }

    const wallet = importedWallets.find(w => w.address === walletAddress);
    if (!wallet) {
      throw new Error(`找不到钱包: ${walletAddress}`);
    }

    return wallet.privateKey;
  };

  // 停止刷单
  const stopVolumeBot = () => {
    if (volumeInterval) {
      clearInterval(volumeInterval);
      setVolumeInterval(null);
    }
    setIsVolumeBot(false);
    toast.info(`刷单机器人已停止，共执行了 ${tradeCount} 笔交易`);
  };

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-6 h-full">
      <h2 className="text-lg font-semibold mb-4">刷单功能</h2>

      <div className="space-y-4">
        {/* 模式切换 */}
        <div>
          <label className="block text-sm font-medium mb-2">操作模式</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setVolumeConfig(prev => ({ ...prev, mode: 'INTERVAL' }))}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${volumeConfig.mode === 'INTERVAL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              🔄 定时刷单
            </button>
            <button
              onClick={() => setVolumeConfig(prev => ({ ...prev, mode: 'BATCH_SELL' }))}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${volumeConfig.mode === 'BATCH_SELL'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              📦 批量卖出
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {volumeConfig.mode === 'INTERVAL'
              ? '按时间间隔自动执行买入/卖出交易'
              : '一次性批量卖出指定百分比的持仓'
            }
          </div>
        </div>

        {/* 定时刷单模式的配置 */}
        {volumeConfig.mode === 'INTERVAL' && (
          <>
            {/* 交易类型选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">交易类型选择</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={volumeConfig.enableBuy}
                    onChange={(e) => setVolumeConfig(prev => ({ ...prev, enableBuy: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 rounded"
                  />
                  <span className="text-sm text-green-400">🟢 买入</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={volumeConfig.enableSell}
                    onChange={(e) => setVolumeConfig(prev => ({ ...prev, enableSell: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-red-400">🔴 卖出</span>
                </label>
              </div>
              {!volumeConfig.enableBuy && !volumeConfig.enableSell && (
                <p className="text-xs text-yellow-400 mt-1">⚠️ 请至少选择一种交易类型</p>
              )}
            </div>

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
                  step="0.0001"
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
                  step="0.0002"
                  placeholder="最大交易金额"
                  value={volumeConfig.maxAmount}
                  onChange={(e) => setVolumeConfig(prev => ({ ...prev, maxAmount: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        {/* 批量卖出模式的配置 */}
        {volumeConfig.mode === 'BATCH_SELL' && (
          <div>
            <label className="block text-sm font-medium mb-1">卖出百分比 (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              placeholder="输入卖出百分比 (1-100)"
              value={volumeConfig.sellPercentage}
              onChange={(e) => setVolumeConfig(prev => ({ ...prev, sellPercentage: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex space-x-2 mt-2">
              {[10, 25, 50, 75, 100].map(percent => (
                <button
                  key={percent}
                  onClick={() => setVolumeConfig(prev => ({ ...prev, sellPercentage: percent.toString() }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${volumeConfig.sellPercentage === percent.toString()
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              💡 将卖出每个钱包中 {volumeConfig.sellPercentage}% 的代币持仓
            </p>
          </div>
        )}

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
        <div className="space-y-2">
          <div className="flex space-x-2">
            {volumeConfig.mode === 'INTERVAL' ? (
              <>
                <button
                  onClick={startVolumeBot}
                  disabled={
                    !hasWallets() ||
                    !selectedToken ||
                    isVolumeBot ||
                    volumeConfig.selectedWallets.length === 0 ||
                    (!volumeConfig.enableBuy && !volumeConfig.enableSell)
                  }
                  className="flex-1 rounded-md bg-purple-600 cursor-pointer px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isVolumeBot ? '刷单中...' : '🔄 开始定时刷单'}
                </button>
                {isVolumeBot && (
                  <button
                    onClick={stopVolumeBot}
                    className="flex-1 rounded-md bg-gray-600 cursor-pointer px-4 py-2 text-white hover:bg-gray-700"
                  >
                    停止刷单
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={startVolumeBot}
                disabled={
                  !hasWallets() ||
                  !selectedToken ||
                  volumeConfig.selectedWallets.length === 0 ||
                  parseFloat(volumeConfig.sellPercentage) <= 0 ||
                  parseFloat(volumeConfig.sellPercentage) > 100
                }
                className="flex-1 rounded-md bg-red-600 cursor-pointer px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                📦 执行批量卖出 ({volumeConfig.sellPercentage}%)
              </button>
            )}
          </div>
        </div>

        {/* 状态显示 */}
        {isVolumeBot && volumeConfig.mode === 'INTERVAL' && (
          <div className="rounded-lg bg-purple-50/10 border border-purple-500/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-400 font-semibold">🤖 刷单机器人运行中</span>
              <span className="text-purple-300">每 {volumeConfig.interval}s 一次交易</span>
            </div>
            <div className="text-xs text-purple-300 mt-1">
              使用 {volumeConfig.selectedWallets.length} 个钱包 |
              交易金额: {volumeConfig.minAmount} - {volumeConfig.maxAmount} |
              交易类型: {volumeConfig.enableBuy && volumeConfig.enableSell ? '买入+卖出' : volumeConfig.enableBuy ? '仅买入' : '仅卖出'}
            </div>
            <div className="text-xs text-purple-200 mt-2 flex items-center justify-between">
              <span>已执行交易: <strong>{tradeCount}</strong> 笔</span>
              <span>运行时间: {Math.floor(tradeCount * parseInt(volumeConfig.interval) / 60)}分{(tradeCount * parseInt(volumeConfig.interval)) % 60}秒</span>
            </div>
          </div>
        )}

        {/* 批量卖出模式提示 */}
        {volumeConfig.mode === 'BATCH_SELL' && (
          <div className="rounded-lg bg-red-50/10 border border-red-500/30 p-3">
            <div className="flex items-center text-sm">
              <span className="text-red-400 font-semibold">📦 批量卖出模式</span>
            </div>
            <div className="text-xs text-red-300 mt-1">
              将对 {volumeConfig.selectedWallets.length} 个钱包执行卖出 {volumeConfig.sellPercentage}% 持仓的操作
            </div>
            <div className="text-xs text-red-200 mt-2">
              ⚠️ 此操作将立即执行，无时间间隔，请确认后再点击执行按钮
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeBot; 