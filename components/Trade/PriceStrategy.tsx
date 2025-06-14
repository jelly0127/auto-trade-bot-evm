'use client';
import React, { useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import { priceService, type TokenPrice } from '@/lib/priceService';

// 交易策略类型
interface TradingStrategy {
  enabled: boolean;
  buyThreshold: string;    // 买入价格阈值
  sellThreshold: string;   // 卖出价格阈值
  buyAmount: string;       // 买入数量
  sellAmount: string;      // 卖出数量
  selectedWallets: string[]; // 选中的钱包
}

interface PriceStrategyProps {
  selectedToken: TokenPrice | null;
  currentPrice: string;
  onTradeExecuted: (trade: any) => void;
}

const PriceStrategy: React.FC<PriceStrategyProps> = ({
  selectedToken,
  currentPrice,
  onTradeExecuted
}) => {
  const chainId = useChainId();
  const { wallets: importedWallets, hasWallets } = useWalletData();

  // 价格控制策略
  const [strategy, setStrategy] = useState<TradingStrategy>({
    enabled: false,
    buyThreshold: '',
    sellThreshold: '',
    buyAmount: '',
    sellAmount: '',
    selectedWallets: []
  });

  // 操作状态
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringCleanup, setMonitoringCleanup] = useState<(() => void) | null>(null);

  // 执行买入订单
  const executeBuyOrder = useCallback(async (amount: string) => {
    try {
      // 从选中的钱包中随机选择一个
      const selectedWallet = strategy.selectedWallets.length > 0
        ? strategy.selectedWallets[Math.floor(Math.random() * strategy.selectedWallets.length)]
        : 'main';

      const trade = {
        type: 'BUY',
        amount,
        price: currentPrice,
        timestamp: new Date().toLocaleString(),
        wallet: selectedWallet
      };
      onTradeExecuted(trade);
      toast.success(`自动买入 ${amount} 代币 (钱包: ${selectedWallet.slice(0, 8)}...)`);
    } catch (error) {
      toast.error('买入失败');
    }
  }, [currentPrice, onTradeExecuted, strategy.selectedWallets]);

  // 执行卖出订单
  const executeSellOrder = useCallback(async (amount: string) => {
    try {
      // 从选中的钱包中随机选择一个
      const selectedWallet = strategy.selectedWallets.length > 0
        ? strategy.selectedWallets[Math.floor(Math.random() * strategy.selectedWallets.length)]
        : 'main';

      const trade = {
        type: 'SELL',
        amount,
        price: currentPrice,
        timestamp: new Date().toLocaleString(),
        wallet: selectedWallet
      };
      onTradeExecuted(trade);
      toast.success(`自动卖出 ${amount} 代币 (钱包: ${selectedWallet.slice(0, 8)}...)`);
    } catch (error) {
      toast.error('卖出失败');
    }
  }, [currentPrice, onTradeExecuted, strategy.selectedWallets]);

  // 开始价格监控
  const startPriceMonitoring = () => {
    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    setIsMonitoring(true);
    toast.success('价格监控已启动');

    // 订阅价格更新
    const priceCallback = (price: number) => {
      // 检查交易条件
      if (strategy.enabled) {
        if (price <= parseFloat(strategy.buyThreshold) && strategy.buyAmount) {
          executeBuyOrder(strategy.buyAmount);
        }
        if (price >= parseFloat(strategy.sellThreshold) && strategy.sellAmount) {
          executeSellOrder(strategy.sellAmount);
        }
      }
    };

    priceService.subscribeToPrice(selectedToken.address, priceCallback, 3000, chainId);

    // 清理函数
    const cleanup = () => {
      if (selectedToken) {
        priceService.unsubscribeFromPrice(selectedToken.address, priceCallback);
      }
      setIsMonitoring(false);
      setMonitoringCleanup(null);
    };

    setMonitoringCleanup(() => cleanup);
  };

  // 停止价格监控
  const stopPriceMonitoring = () => {
    if (monitoringCleanup) {
      monitoringCleanup();
      toast.info('价格监控已停止');
    }
  };

  // 钱包选择切换
  const toggleWalletForStrategy = (address: string) => {
    setStrategy(prev => ({
      ...prev,
      selectedWallets: prev.selectedWallets.includes(address)
        ? prev.selectedWallets.filter(addr => addr !== address)
        : [...prev.selectedWallets, address]
    }));
  };

  // 全选钱包
  const selectAllWallets = () => {
    setStrategy(prev => ({
      ...prev,
      selectedWallets: importedWallets.map(wallet => wallet.address)
    }));
    toast.success(`已选择所有 ${importedWallets.length} 个钱包`);
  };

  // 取消全选
  const deselectAllWallets = () => {
    setStrategy(prev => ({
      ...prev,
      selectedWallets: []
    }));
    toast.info('已取消选择所有钱包');
  };

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-6 space-y-6 w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">价格控制</h2>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={strategy.enabled}
            onChange={(e) => setStrategy(prev => ({ ...prev, enabled: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">启用自动交易</span>
        </label>
      </div>

      {/* 买卖配置 */}
      <div className=" flex flex-row gap-x-5">
        {/* 买入配置 */}
        <div className="rounded-lg border border-green-500/30 bg-green-50/5 p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-3">买入配置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">买入阈值 ($)</label>
              <input
                type="number"
                step="0.000001"
                placeholder="价格低于此值时买入"
                value={strategy.buyThreshold}
                onChange={(e) => setStrategy(prev => ({ ...prev, buyThreshold: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">买入数量</label>
              <input
                type="number"
                step="0.001"
                placeholder="每次买入数量"
                value={strategy.buyAmount}
                onChange={(e) => setStrategy(prev => ({ ...prev, buyAmount: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {strategy.buyThreshold && currentPrice && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400">当前价格: ${currentPrice}</span>
              <span className={`ml-2 ${parseFloat(currentPrice) <= parseFloat(strategy.buyThreshold) ? 'text-green-400' : 'text-gray-400'}`}>
                {parseFloat(currentPrice) <= parseFloat(strategy.buyThreshold) ? '✓ 满足买入条件' : '○ 未满足买入条件'}
              </span>
            </div>
          )}
        </div>

        {/* 卖出配置 */}
        <div className="rounded-lg border border-red-500/30 bg-red-50/5 p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3">卖出配置</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">卖出阈值 ($)</label>
              <input
                type="number"
                step="0.000001"
                placeholder="价格高于此值时卖出"
                value={strategy.sellThreshold}
                onChange={(e) => setStrategy(prev => ({ ...prev, sellThreshold: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">卖出数量</label>
              <input
                type="number"
                step="0.001"
                placeholder="每次卖出数量"
                value={strategy.sellAmount}
                onChange={(e) => setStrategy(prev => ({ ...prev, sellAmount: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {strategy.sellThreshold && currentPrice && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400">当前价格: ${currentPrice}</span>
              <span className={`ml-2 ${parseFloat(currentPrice) >= parseFloat(strategy.sellThreshold) ? 'text-red-400' : 'text-gray-400'}`}>
                {parseFloat(currentPrice) >= parseFloat(strategy.sellThreshold) ? '✓ 满足卖出条件' : '○ 未满足卖出条件'}
              </span>
            </div>
          )}
        </div>







      </div>

      {/* 监控控制 */}
      <div>
        <div className="flex space-x-2">
          <button
            onClick={startPriceMonitoring}
            disabled={!selectedToken || isMonitoring}
            className="flex-1 rounded-md bg-green-600 cursor-pointer px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isMonitoring ? '监控中...' : '开始价格监控'}
          </button>
          {isMonitoring && (
            <button
              onClick={stopPriceMonitoring}
              className="flex-1 rounded-md bg-gray-600 cursor-pointer px-4 py-2 text-white hover:bg-gray-700"
            >
              停止监控
            </button>
          )}
        </div>

        {/* 监控状态 */}
        {isMonitoring && (
          <div className="rounded-lg bg-green-50/10 border border-green-500/30 p-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-400 font-semibold">📊 价格监控已启动</span>
              <span className="text-green-300">实时监控中...</span>
            </div>
            <div className="text-xs text-green-300 mt-1">
              {strategy.enabled ? (
                <>
                  自动交易已启用 |
                  {strategy.buyThreshold && `买入 < $${strategy.buyThreshold}`}
                  {strategy.buyThreshold && strategy.sellThreshold && ' | '}
                  {strategy.sellThreshold && `卖出 > $${strategy.sellThreshold}`}
                </>
              ) : (
                '自动交易未启用，仅监控价格变化'
              )}
            </div>
          </div>
        )}
      </div>
      {/* 钱包 */}
      <div>
        {/* 钱包选择 */}
        {hasWallets() && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">选择交易钱包</label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllWallets}
                  disabled={strategy.selectedWallets.length === importedWallets.length}
                  className="rounded-md bg-blue-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  全选
                </button>
                <button
                  onClick={deselectAllWallets}
                  disabled={strategy.selectedWallets.length === 0}
                  className="rounded-md bg-gray-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  取消全选
                </button>
              </div>
            </div>

            <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50/5">
              <div className="space-y-1 p-2">
                {importedWallets.slice(0, 10).map((wallet, index) => (
                  <label key={wallet.address} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50/10 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={strategy.selectedWallets.includes(wallet.address)}
                      onChange={() => toggleWalletForStrategy(wallet.address)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-mono flex-1">
                      #{index + 1} {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </span>
                  </label>
                ))}

                {importedWallets.length > 10 && (
                  <div className="text-xs text-gray-400 text-center p-2">
                    还有 {importedWallets.length - 10} 个钱包未显示
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>已选择 {strategy.selectedWallets.length} / {importedWallets.length} 个钱包</span>
              {strategy.selectedWallets.length === 0 && (
                <span className="text-yellow-400">未选择钱包将使用主钱包交易</span>
              )}
            </div>
          </div>
        )}

        {!hasWallets() && (
          <div className="text-center py-4 text-gray-400 bg-gray-50/5 rounded-lg">
            <p className="text-sm">请先在"钱包工具"中导入钱包数据</p>
            <p className="text-xs mt-1">导入后可选择多个钱包进行自动交易</p>
          </div>
        )}
      </div>

      {/* 使用提示 */}
      {/* <div className="text-xs text-gray-400 bg-gray-50/5 rounded-lg p-3">
        <p><strong>使用说明:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>设置买入阈值：当价格低于此值时自动买入</li>
          <li>设置卖出阈值：当价格高于此值时自动卖出</li>
          <li>启用自动交易开关后，系统会自动执行交易</li>
          <li>建议先在测试网络测试策略的有效性</li>
        </ul>
      </div> */}
    </div>
  );
};

export default PriceStrategy;
