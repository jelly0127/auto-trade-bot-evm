'use client';
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import CandlestickChart from './CandlestickChart';
import TokenSelector from './TokenSelector';
import PriceStrategy from './PriceStrategy';
import VolumeBot from './VolumeBot';
import NetworkStatusComponent from './NetworkStatus';
import { priceService, type TokenPrice, type CandleData, formatPrice } from '@/lib/priceService';

// 拉升/砸盘配置
interface PumpDumpConfig {
  percentage: string;
  duration: string;
  walletCount: string;
  selectedWallets: string[];
}

const Trade = () => {
  const { address, isConnected } = useAccount();
  const { wallets: importedWallets, hasWallets } = useWalletData();

  // 代币状态
  const [selectedToken, setSelectedToken] = useState<TokenPrice | null>(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const [currentPrice, setCurrentPrice] = useState('0');
  const [priceData, setPriceData] = useState<CandleData[]>([]);

  // 交易历史
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  // 拉升砸盘状态
  const [isPumping, setIsPumping] = useState(false);
  const [isDumping, setIsDumping] = useState(false);
  const [pumpConfig, setPumpConfig] = useState<PumpDumpConfig>({
    percentage: '',
    duration: '',
    walletCount: '',
    selectedWallets: []
  });
  const [dumpConfig, setDumpConfig] = useState<PumpDumpConfig>({
    percentage: '',
    duration: '',
    walletCount: '',
    selectedWallets: []
  });

  // 处理代币选择
  const handleTokenSelect = async (token: TokenPrice) => {
    setSelectedToken(token);
    setCurrentPrice(formatPrice(token.price));

    // 获取K线数据
    const candleData = await priceService.getCandleData(token.address);
    setPriceData(candleData);

    // 启动价格订阅
    priceService.subscribeToPrice(token.address, (price) => {
      setCurrentPrice(formatPrice(price));
    }, 5000);
  };

  // 处理交易执行
  const handleTradeExecuted = (trade: any) => {
    setTradeHistory(prev => [trade, ...prev.slice(0, 49)]);
  };

  // 拉升钱包选择切换
  const togglePumpWallet = (address: string) => {
    setPumpConfig(prev => ({
      ...prev,
      selectedWallets: prev.selectedWallets.includes(address)
        ? prev.selectedWallets.filter(addr => addr !== address)
        : [...prev.selectedWallets, address]
    }));
  };

  // 砸盘钱包选择切换
  const toggleDumpWallet = (address: string) => {
    setDumpConfig(prev => ({
      ...prev,
      selectedWallets: prev.selectedWallets.includes(address)
        ? prev.selectedWallets.filter(addr => addr !== address)
        : [...prev.selectedWallets, address]
    }));
  };

  // 拉升全选钱包
  const selectAllPumpWallets = () => {
    setPumpConfig(prev => ({
      ...prev,
      selectedWallets: importedWallets.map(wallet => wallet.address)
    }));
    toast.success(`拉升已选择所有 ${importedWallets.length} 个钱包`);
  };

  // 拉升取消全选
  const deselectAllPumpWallets = () => {
    setPumpConfig(prev => ({
      ...prev,
      selectedWallets: []
    }));
    toast.info('拉升已取消选择所有钱包');
  };

  // 砸盘全选钱包
  const selectAllDumpWallets = () => {
    setDumpConfig(prev => ({
      ...prev,
      selectedWallets: importedWallets.map(wallet => wallet.address)
    }));
    toast.success(`砸盘已选择所有 ${importedWallets.length} 个钱包`);
  };

  // 砸盘取消全选
  const deselectAllDumpWallets = () => {
    setDumpConfig(prev => ({
      ...prev,
      selectedWallets: []
    }));
    toast.info('砸盘已取消选择所有钱包');
  };

  // 执行拉升
  const executePump = async () => {
    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    if (pumpConfig.selectedWallets.length === 0) {
      toast.error('请至少选择一个钱包进行拉升');
      return;
    }

    setIsPumping(true);
    const selectedWallets = pumpConfig.selectedWallets;
    const duration = parseInt(pumpConfig.duration) || 10;

    toast.success(`开始拉升 ${pumpConfig.percentage}%，使用 ${selectedWallets.length} 个钱包，持续 ${duration} 分钟`);

    try {
      // 使用选中的钱包进行拉升
      selectedWallets.forEach((walletAddress, i) => {
        const buyAmount = (Math.random() * 0.01 + 0.001).toFixed(6);

        setTimeout(() => {
          const trade = {
            type: 'PUMP_BUY',
            amount: buyAmount,
            price: currentPrice,
            timestamp: new Date().toLocaleString(),
            wallet: walletAddress
          };
          handleTradeExecuted(trade);
          toast.info(`钱包 ${walletAddress.slice(0, 8)}... 执行拉升买入 ${buyAmount}`, { duration: 2000 });
        }, i * 2000);
      });

      setTimeout(() => {
        setIsPumping(false);
        toast.success('拉升完成');
      }, duration * 60 * 1000);

    } catch (error) {
      setIsPumping(false);
      toast.error('拉升失败');
    }
  };

  // 执行砸盘
  const executeDump = async () => {
    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    if (dumpConfig.selectedWallets.length === 0) {
      toast.error('请至少选择一个钱包进行砸盘');
      return;
    }

    setIsDumping(true);
    const selectedWallets = dumpConfig.selectedWallets;
    const duration = parseInt(dumpConfig.duration) || 10;

    toast.success(`开始砸盘 ${dumpConfig.percentage}%，使用 ${selectedWallets.length} 个钱包，持续 ${duration} 分钟`);

    try {
      // 使用选中的钱包进行砸盘
      selectedWallets.forEach((walletAddress, i) => {
        const sellAmount = (Math.random() * 0.01 + 0.001).toFixed(6);

        setTimeout(() => {
          const trade = {
            type: 'DUMP_SELL',
            amount: sellAmount,
            price: currentPrice,
            timestamp: new Date().toLocaleString(),
            wallet: walletAddress
          };
          handleTradeExecuted(trade);
          toast.info(`钱包 ${walletAddress.slice(0, 8)}... 执行砸盘卖出 ${sellAmount}`, { duration: 2000 });
        }, i * 2000);
      });

      setTimeout(() => {
        setIsDumping(false);
        toast.success('砸盘完成');
      }, duration * 60 * 1000);

    } catch (error) {
      setIsDumping(false);
      toast.error('砸盘失败');
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      priceService.cleanup();
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="mx-auto h-full w-full max-w-[1280px] p-6">
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 flex flex-col items-center justify-center">
          <h1 className="mb-4 text-2xl font-bold">自动做市机器人</h1>
          <p className="mb-4 text-gray-400">请先连接钱包以使用交易功能</p>
          <appkit-button />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full w-full px-6 max-w-[1280px]">


      {/* 代币选择和钱包状态 */}
      <div className='flex flex-row gap-x-6'>
        <TokenSelector
          address={address}
          tokenAddress={tokenAddress}
          setTokenAddress={setTokenAddress}
          selectedToken={selectedToken}
          onTokenSelect={handleTokenSelect}
        />


      </div>

      <div className='flex flex-row w-full gap-x-5 mt-6 justify-between'>
        {/* K线图 */}
        {selectedToken && (
          <div className=" w-2/3 h-full">
            <CandlestickChart
              data={priceData}
              currentPrice={currentPrice}
              tokenInfo={{
                symbol: selectedToken.symbol,
                name: selectedToken.name,
                address: selectedToken.address
              }}
              onRefreshIntervalChange={(interval) => {
                // 更新价格订阅频率
                if (selectedToken) {
                  priceService.subscribeToPrice(selectedToken.address, (price) => {
                    setCurrentPrice(formatPrice(price));
                  }, interval * 1000);
                }
              }}
            />
          </div>
        )}
        {/* 交易历史 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 w-1/3">
          <h2 className="text-lg font-semibold mb-4">交易历史</h2>
          <div className="max-h-80 overflow-y-auto">
            {tradeHistory.length === 0 ? (
              <p className="text-center text-gray-400 text-sm">暂无交易记录</p>
            ) : (
              <div className="space-y-2">
                {tradeHistory.map((trade, index) => (
                  <div key={index} className="rounded-lg border border-gray-700 p-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold ${trade.type.includes('BUY') ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {trade.type}
                      </span>
                      <span className="text-gray-400">{trade.timestamp}</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between">
                        <span>数量:</span>
                        <span>{trade.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>价格:</span>
                        <span>${trade.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>钱包:</span>
                        <span className="font-mono">{trade.wallet.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 价格控制 */}
      <div className="flex w-full gap-6 mt-6">

        <div className='w-2/3'>
          <PriceStrategy
            selectedToken={selectedToken}
            currentPrice={currentPrice}
            onTradeExecuted={handleTradeExecuted}
          />
        </div>



        <div className='w-1/3 h-full'>
          {/* 刷单功能 */}
          <VolumeBot
            selectedToken={selectedToken}
            currentPrice={currentPrice}
            onTradeExecuted={handleTradeExecuted}
          />

        </div>


      </div>

      {/* 拉升砸盘*/}
      <div className='mt-6 flex flex-row w-full gap-x-6'>

        {/* 拉升功能 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 w-1/2">
          <h2 className="text-lg font-semibold mb-4">拉升功能</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">拉升百分比 (%)</label>
              <input
                type="number"
                placeholder="目标拉升百分比"
                value={pumpConfig.percentage}
                onChange={(e) => setPumpConfig(prev => ({ ...prev, percentage: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">持续时间 (分钟)</label>
              <input
                type="number"
                placeholder="拉升持续时间"
                value={pumpConfig.duration}
                onChange={(e) => setPumpConfig(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 拉升钱包选择 */}
            {hasWallets() && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">选择拉升钱包</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllPumpWallets}
                      disabled={pumpConfig.selectedWallets.length === importedWallets.length}
                      className="rounded-md bg-orange-600 px-2 py-1 text-xs cursor-pointer text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      全选
                    </button>
                    <button
                      onClick={deselectAllPumpWallets}
                      disabled={pumpConfig.selectedWallets.length === 0}
                      className="rounded-md bg-gray-600 px-2 py-1 text-xs cursor-pointer text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      取消全选
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50/5">
                  <div className="space-y-1 p-2">
                    {importedWallets.map((wallet, index) => (
                      <label key={wallet.address} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50/10 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={pumpConfig.selectedWallets.includes(wallet.address)}
                          onChange={() => togglePumpWallet(wallet.address)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-xs font-mono flex-1">
                          #{index + 1} {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>已选择 {pumpConfig.selectedWallets.length} / {importedWallets.length} 个钱包</span>
                  {pumpConfig.selectedWallets.length === 0 && (
                    <span className="text-yellow-400">请选择钱包进行拉升</span>
                  )}
                </div>
              </div>
            )}

            {!hasWallets() && (
              <div className="text-center py-4 text-gray-400 bg-gray-50/5 rounded-lg">
                <p className="text-sm">请先在"钱包工具"中导入钱包数据</p>
                <p className="text-xs mt-1">导入后可选择多个钱包进行拉升</p>
              </div>
            )}

            <button
              onClick={executePump}
              disabled={!selectedToken || isPumping || pumpConfig.selectedWallets.length === 0}
              className="w-full rounded-md bg-orange-600 cursor-pointer px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPumping ? '拉升中...' : '开始拉升'}
            </button>
          </div>
        </div>

        {/* 砸盘功能 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 w-1/2">
          <h2 className="text-lg font-semibold mb-4">砸盘功能</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">砸盘百分比 (%)</label>
              <input
                type="number"
                placeholder="目标砸盘百分比"
                value={dumpConfig.percentage}
                onChange={(e) => setDumpConfig(prev => ({ ...prev, percentage: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">持续时间 (分钟)</label>
              <input
                type="number"
                placeholder="砸盘持续时间"
                value={dumpConfig.duration}
                onChange={(e) => setDumpConfig(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 砸盘钱包选择 */}
            {hasWallets() && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">选择砸盘钱包</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllDumpWallets}
                      disabled={dumpConfig.selectedWallets.length === importedWallets.length}
                      className="rounded-md bg-red-600 cursor-pointer px-2 py-1 text-xs  text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      全选
                    </button>
                    <button
                      onClick={deselectAllDumpWallets}
                      disabled={dumpConfig.selectedWallets.length === 0}
                      className="rounded-md bg-gray-600 cursor-pointer px-2 py-1 text-xs  text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      取消全选
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50/5">
                  <div className="space-y-1 p-2">
                    {importedWallets.map((wallet, index) => (
                      <label key={wallet.address} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50/10 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={dumpConfig.selectedWallets.includes(wallet.address)}
                          onChange={() => toggleDumpWallet(wallet.address)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs font-mono flex-1">
                          #{index + 1} {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>已选择 {dumpConfig.selectedWallets.length} / {importedWallets.length} 个钱包</span>
                  {dumpConfig.selectedWallets.length === 0 && (
                    <span className="text-yellow-400">请选择钱包进行砸盘</span>
                  )}
                </div>
              </div>
            )}

            {!hasWallets() && (
              <div className="text-center py-4 text-gray-400 bg-gray-50/5 rounded-lg">
                <p className="text-sm">请先在"钱包工具"中导入钱包数据</p>
                <p className="text-xs mt-1">导入后可选择多个钱包进行砸盘</p>
              </div>
            )}

            <button
              onClick={executeDump}
              disabled={!selectedToken || isDumping || dumpConfig.selectedWallets.length === 0}
              className="w-full rounded-md bg-red-600 cursor-pointer px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDumping ? '砸盘中...' : '开始砸盘'}
            </button>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 rounded-lg bg-[#FFFFFF1A] p-6">
        <h2 className="text-lg font-semibold text-blue-400 mb-3">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>💾 代币管理:</strong> 自动保存输入的代币地址，支持快速切换</p>
            <p><strong>📊 价格控制:</strong> 设置买入/卖出阈值，系统自动监控并执行交易</p>
            <p><strong>📈 K线图表:</strong> 实时显示价格走势，可调整刷新频率</p>
          </div>
          <div>
            <p><strong>🚀 拉升砸盘:</strong> 批量账户协同操作，影响代币价格走势</p>
            <p><strong>🤖 刷单功能:</strong> 自动生成交易，增加代币交易量和活跃度</p>
            <p><strong>⚠️ 风险提示:</strong> 请在测试网络充分测试后再使用真实资金</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trade;