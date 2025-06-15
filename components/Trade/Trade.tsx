'use client';
import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { toast } from 'sonner';
import { getExplorerUrl, createTradeRecord, executeBlockchainTrade } from '@/utils/tradeUtils';
import { useWalletData } from '@/hooks/useWalletData';
import { useTradeHistory, type TradeRecord } from '@/hooks/useTradeHistory';
import CandlestickChart from './CandlestickChart';
import TokenSelector from './TokenSelector';
import PriceStrategy from './PriceStrategy';
import VolumeBot from './VolumeBot';
import TradeHistoryStats from './TradeHistoryStats';
import NetworkStatusComponent from './NetworkStatus';
import ApiStatus from './ApiStatus';
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
  const chainId = useChainId();
  const { wallets: importedWallets, hasWallets } = useWalletData();
  const {
    tradeHistory,
    addTrade,
    clearHistory,
    getHistoryByToken,
    exportHistory,
    importHistory,
    historyCount
  } = useTradeHistory();



  // 代币状态
  const [selectedToken, setSelectedToken] = useState<TokenPrice | null>(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const [currentPrice, setCurrentPrice] = useState('0');
  const [priceData, setPriceData] = useState<CandleData[]>([]);

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
    }, 5000, chainId);
  };

  // 处理交易执行
  const handleTradeExecuted = (trade: any) => {
    console.log('📊 接收到交易执行:', trade);

    // 转换为完整的交易记录格式
    const tradeRecord: Omit<TradeRecord, 'id'> = {
      type: trade.type,
      amount: trade.amount,
      price: trade.price,
      timestamp: trade.timestamp,
      wallet: trade.wallet,
      tokenAddress: selectedToken?.address || trade.tokenAddress,
      tokenSymbol: selectedToken?.symbol || trade.tokenSymbol,
      chainId: trade.chainId || chainId,
      txHash: trade.txHash,
      status: trade.status || 'success'
    };

    console.log('💾 保存交易记录:', tradeRecord);
    addTrade(tradeRecord);
    console.log('✅ 交易记录已添加，当前历史数量:', historyCount + 1);
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

        setTimeout(async () => {
          try {
            // 执行真实的区块链交易
            const txHash = await executeBlockchainTrade({
              tokenAddress: selectedToken!.address,
              amount: buyAmount,
              tradeType: 'BUY',
              walletPrivateKey: 'YOUR_WALLET_PRIVATE_KEY', // 需要实现安全的私钥获取
              chainId: chainId
            });

            const trade = createTradeRecord({
              type: 'PUMP_BUY',
              amount: buyAmount,
              price: currentPrice,
              wallet: walletAddress,
              tokenAddress: selectedToken!.address,
              tokenSymbol: selectedToken!.symbol,
              chainId: chainId,
              txHash: txHash,
              status: 'success'
            });

            handleTradeExecuted(trade);
            toast.success(`钱包 ${walletAddress.slice(0, 8)}... 拉升买入成功 ${buyAmount}`, {
              duration: 2000,
              description: `交易哈希: ${txHash.slice(0, 10)}...`
            });
          } catch (error) {
            console.error('拉升交易失败:', error);

            // 记录失败的交易
            const failedTrade = createTradeRecord({
              type: 'PUMP_BUY',
              amount: buyAmount,
              price: currentPrice,
              wallet: walletAddress,
              tokenAddress: selectedToken!.address,
              tokenSymbol: selectedToken!.symbol,
              chainId: chainId,
              txHash: 'failed',
              status: 'failed'
            });

            handleTradeExecuted(failedTrade);
            toast.error(`钱包 ${walletAddress.slice(0, 8)}... 拉升买入失败`, { duration: 2000 });
          }
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

        setTimeout(async () => {
          try {
            // 执行真实的区块链交易
            const txHash = await executeBlockchainTrade({
              tokenAddress: selectedToken!.address,
              amount: sellAmount,
              tradeType: 'SELL',
              walletPrivateKey: 'YOUR_WALLET_PRIVATE_KEY', // 需要实现安全的私钥获取
              chainId: chainId
            });

            const trade = createTradeRecord({
              type: 'DUMP_SELL',
              amount: sellAmount,
              price: currentPrice,
              wallet: walletAddress,
              tokenAddress: selectedToken!.address,
              tokenSymbol: selectedToken!.symbol,
              chainId: chainId,
              txHash: txHash,
              status: 'success'
            });

            handleTradeExecuted(trade);
            toast.success(`钱包 ${walletAddress.slice(0, 8)}... 砸盘卖出成功 ${sellAmount}`, {
              duration: 2000,
              description: `交易哈希: ${txHash.slice(0, 10)}...`
            });
          } catch (error) {
            console.error('砸盘交易失败:', error);

            // 记录失败的交易
            const failedTrade = createTradeRecord({
              type: 'DUMP_SELL',
              amount: sellAmount,
              price: currentPrice,
              wallet: walletAddress,
              tokenAddress: selectedToken!.address,
              tokenSymbol: selectedToken!.symbol,
              chainId: chainId,
              txHash: 'failed',
              status: 'failed'
            });

            handleTradeExecuted(failedTrade);
            toast.error(`钱包 ${walletAddress.slice(0, 8)}... 砸盘卖出失败`, { duration: 2000 });
          }
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
                  }, interval * 1000, chainId);
                }
              }}
            />
          </div>
        )}
        {/* 交易历史 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 w-1/3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">交易历史</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">共 {historyCount} 条</span>
              <button
                onClick={() => {
                  if (confirm('确定要清空所有交易历史吗？此操作不可恢复。')) {
                    clearHistory();
                    toast.success('交易历史已清空');
                  }
                }}
                disabled={historyCount === 0}
                className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                title="清空交易历史"
              >
                清空
              </button>
            </div>
          </div>

          {/* 筛选器 */}
          {selectedToken && historyCount > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-400">筛选:</span>
                <button
                  onClick={() => {
                    const tokenHistory = getHistoryByToken(selectedToken.address);
                    console.log(`当前代币 ${selectedToken.symbol} 的交易记录:`, tokenHistory);
                    toast.info(`当前代币共有 ${tokenHistory.length} 条交易记录`);
                  }}
                  className="rounded-md bg-blue-600/20 px-2 py-1 text-blue-400 hover:bg-blue-600/30"
                >
                  仅显示 {selectedToken.symbol}
                </button>
                <span className="text-gray-500">|</span>
                <span className="text-gray-400">共 {getHistoryByToken(selectedToken.address).length} 条</span>
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {tradeHistory.length === 0 ? (
              <p className="text-center text-gray-400 text-sm">暂无交易记录</p>
            ) : (
              <div className="space-y-2">
                {tradeHistory.slice(0, 50).map((trade) => (
                  <div key={trade.id} className="rounded-lg border border-gray-700 p-3 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${trade.type.includes('BUY') ? 'text-green-500' :
                          trade.type.includes('SELL') ? 'text-red-500' :
                            trade.type.includes('VOLUME') ? 'text-purple-500' :
                              'text-orange-500'
                          }`}>
                          {trade.type.includes('VOLUME') ?
                            `🤖 ${trade.type.replace('VOLUME_', '')}` :
                            trade.type
                          }
                        </span>
                        {trade.tokenSymbol && (
                          <span className="text-blue-400 text-xs">
                            {trade.tokenSymbol}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">{new Date(trade.timestamp).toLocaleString()}</span>
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
                      {trade.txHash && trade.txHash !== 'pending' && trade.txHash !== 'failed' && (
                        <div className="flex justify-between items-center">
                          <span>交易哈希:</span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-xs">{trade.txHash.slice(0, 8)}...{trade.txHash.slice(-8)}</span>
                            <button
                              onClick={() => {
                                const explorerUrl = getExplorerUrl(trade.chainId || chainId, trade.txHash!);
                                if (explorerUrl) {
                                  window.open(explorerUrl, '_blank');
                                } else {
                                  navigator.clipboard.writeText(trade.txHash!);
                                  toast.success('交易哈希已复制到剪贴板');
                                }
                              }}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                              title={getExplorerUrl(trade.chainId || chainId, trade.txHash!) ? '在区块链浏览器中查看' : '复制交易哈希'}
                            >
                              {getExplorerUrl(trade.chainId || chainId, trade.txHash!) ? '🔗' : '📋'}
                            </button>
                          </div>
                        </div>
                      )}
                      {trade.txHash === 'failed' && (
                        <div className="flex justify-between">
                          <span>交易哈希:</span>
                          <span className="text-red-400 text-xs">交易失败</span>
                        </div>
                      )}
                      {trade.txHash === 'pending' && (
                        <div className="flex justify-between">
                          <span>交易哈希:</span>
                          <span className="text-yellow-400 text-xs">等待确认...</span>
                        </div>
                      )}
                      {trade.status && (
                        <div className="flex justify-between">
                          <span>状态:</span>
                          <span className={`text-xs ${trade.status === 'success' ? 'text-green-400' :
                            trade.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {trade.status === 'success' ? '成功' :
                              trade.status === 'pending' ? '等待中' : '失败'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 交易历史操作 */}
          {historyCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const data = exportHistory();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `trade-history-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('交易历史已导出');
                  }}
                  className="flex-1 rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  导出
                </button>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const data = event.target?.result as string;
                        if (importHistory(data)) {
                          toast.success('交易历史导入成功');
                        } else {
                          toast.error('导入失败，文件格式不正确');
                        }
                      };
                      reader.readAsText(file);
                    }
                    // 清空input值，允许重复选择同一文件
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="import-history"
                />
                <button
                  onClick={() => document.getElementById('import-history')?.click()}
                  className="flex-1 rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                >
                  导入
                </button>
              </div>
            </div>
          )}
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

      {/* 交易统计 */}
      {historyCount > 0 && (
        <div className="mt-6">
          <TradeHistoryStats
            tradeHistory={tradeHistory}
            selectedTokenAddress={selectedToken?.address}
          />
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 rounded-lg bg-[#FFFFFF1A] p-6">
        <h2 className="text-lg font-semibold text-blue-400 mb-3">功能说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>💾 代币管理:</strong> 自动保存输入的代币地址，支持快速切换</p>
            <p><strong>📊 价格控制:</strong> 设置买入/卖出阈值，系统自动监控并执行交易</p>
            <p><strong>📈 K线图表:</strong> 实时显示价格走势，可调整刷新频率</p>
            <p><strong>📋 交易历史:</strong> 自动保存所有交易记录到本地存储，支持导入导出</p>
          </div>
          <div>
            <p><strong>🚀 拉升砸盘:</strong> 批量账户协同操作，影响代币价格走势</p>
            <p><strong>🤖 刷单功能:</strong> 自动生成交易，增加代币交易量和活跃度</p>
            <p><strong>📊 数据统计:</strong> 实时分析交易数据，提供详细的统计信息</p>
            <p><strong>⚠️ 风险提示:</strong> 请在测试网络充分测试后再使用真实资金</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trade;