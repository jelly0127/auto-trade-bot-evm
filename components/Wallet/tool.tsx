'use client';
import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from 'wagmi';
import { formatEther, parseEther, parseUnits, erc20Abi, isAddress } from 'viem';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import WalletDataStatus from '@/components/Wallet/WalletDataStatus';


interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  decimals: number;
  isNative?: boolean;
}

interface BatchTarget {
  address: string;
  amount: string;
}

const Tool = () => {
  const { address, isConnected, chain } = useAccount();
  const { wallets: importedWallets, hasWallets, saveWallets, clearWallets } = useWalletData(); // 使用共享的钱包数据
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // 批量分发状态
  const [distributionTargets, setDistributionTargets] = useState<BatchTarget[]>([]);
  const [globalDistributionAmount, setGlobalDistributionAmount] = useState(''); // 公共数量输入框
  const [isDistributing, setIsDistributing] = useState(false);

  // 批量归并状态
  const [mergeDestination, setMergeDestination] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [estimatedGasFee, setEstimatedGasFee] = useState('0');
  const [maxAvailableAmount, setMaxAvailableAmount] = useState('0');
  const [selectedWalletsForMerge, setSelectedWalletsForMerge] = useState<string[]>([]); // 选择要归并的钱包



  // 获取原生代币余额
  const { data: nativeBalance } = useBalance({
    address: address,
  });

  // 获取ERC20代币余额
  const { data: tokenBalance } = useReadContract({
    address: selectedToken?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!selectedToken && !selectedToken.isNative && !!address,
    },
  });

  // 写入合约的hook
  const { writeContract, data: hash, isPending } = useWriteContract();

  // 发送原生代币交易的hook
  const { sendTransaction, data: txHash } = useSendTransaction();

  // 等待交易确认
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: hash || txHash,
  });

  // 获取代币余额
  const fetchTokenBalances = async () => {
    if (!address || !isConnected) return;

    setIsLoadingBalances(true);
    try {
      const balances: TokenBalance[] = [];

      // 添加原生代币
      if (nativeBalance) {
        balances.push({
          symbol: chain?.nativeCurrency?.symbol || 'ETH',
          address: 'native',
          balance: formatEther(nativeBalance.value),
          decimals: 18,
          isNative: true,
        });
      }

      // 获取常见ERC20代币余额
      // for (const [symbol, tokenInfo] of Object.entries([{}])) {
      //   try {
      //     // 这里可以添加实际的代币余额查询逻辑
      //     // 暂时显示为示例数据
      //     balances.push({
      //       symbol,
      //       address: tokenInfo.address,
      //       balance: '0',
      //       decimals: tokenInfo.decimals,
      //     });
      //   } catch (error) {
      //     console.error(`Error fetching ${symbol} balance:`, error);
      //   }
      // }

      setTokenBalances(balances);
    } catch (error) {
      toast.error('获取代币余额失败');
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // 添加分发目标
  const addDistributionTarget = () => {
    setDistributionTargets([...distributionTargets, { address: '', amount: '' }]);
  };

  // 移除分发目标
  const removeDistributionTarget = (index: number) => {
    setDistributionTargets(distributionTargets.filter((_, i) => i !== index));
  };

  // 更新分发目标
  const updateDistributionTarget = (index: number, field: 'address' | 'amount', value: string) => {
    const updated = [...distributionTargets];
    updated[index][field] = value;
    setDistributionTargets(updated);
  };

  // 应用公共数量到所有地址
  const applyGlobalAmountToAll = () => {
    if (!globalDistributionAmount || parseFloat(globalDistributionAmount) <= 0) {
      toast.error('请输入有效的公共分发数量');
      return;
    }

    const updated = distributionTargets.map(target => ({
      ...target,
      amount: globalDistributionAmount
    }));
    setDistributionTargets(updated);
    toast.success(`已将数量 ${globalDistributionAmount} 应用到所有 ${distributionTargets.length} 个地址`);
  };

  // 从钱包数据加载分发目标
  const loadWalletsAsTargets = () => {
    if (!hasWallets()) {
      toast.error('没有可用的钱包数据');
      return;
    }

    const targets: BatchTarget[] = importedWallets.map(wallet => ({
      address: wallet.address,
      amount: '', // 默认为空，用户可以设置
    }));

    setDistributionTargets(targets);
    toast.success(`已加载 ${targets.length} 个钱包地址作为分发目标`);
  };

  // 清除所有分发目标
  const clearAllDistributionTargets = () => {
    if (distributionTargets.length === 0) {
      toast.info('没有分发地址需要清除');
      return;
    }

    if (window.confirm(`确定要清除所有 ${distributionTargets.length} 个分发地址吗？`)) {
      setDistributionTargets([]);
      setGlobalDistributionAmount(''); // 同时清空公共数量
      toast.success('已清除所有分发地址');
    }
  };

  // 确认清除钱包数据
  const handleClearWalletData = () => {
    if (!hasWallets()) {
      toast.info('没有钱包数据需要清除');
      return;
    }

    if (window.confirm(`确定要删除所有本地存储的钱包数据吗？\n\n这将删除 ${importedWallets.length} 个钱包的地址和私钥信息，此操作不可撤销！`)) {
      clearWallets();
      setSelectedWalletsForMerge([]); // 清空选择状态
      toast.success('已清除所有本地钱包数据');
    }
  };

  // 批量分发代币
  const handleBatchDistribution = async () => {
    if (!selectedToken || !isConnected || distributionTargets.length === 0) {
      toast.error('请选择代币并添加分发目标');
      return;
    }

    // 验证地址和金额
    for (const target of distributionTargets) {
      if (!isAddress(target.address)) {
        toast.error(`无效的地址: ${target.address}`);
        return;
      }
      if (!target.amount || parseFloat(target.amount) <= 0) {
        toast.error('请输入有效的分发金额');
        return;
      }
    }

    setIsDistributing(true);
    try {
      for (const target of distributionTargets) {
        if (selectedToken.isNative) {
          // 分发原生代币 (ETH/BNB等)
          await sendTransaction({
            to: target.address as `0x${string}`,
            value: parseEther(target.amount),
          });
        } else {
          // 分发ERC20代币
          await writeContract({
            address: selectedToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [target.address as `0x${string}`, parseUnits(target.amount, selectedToken.decimals)],
          });
        }
      }

      toast.success('批量分发完成！');
      setDistributionTargets([]);
    } catch (error) {
      toast.error(`分发失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsDistributing(false);
    }
  };

  // 切换钱包选择状态
  const toggleWalletSelection = (address: string) => {
    if (selectedWalletsForMerge.includes(address)) {
      setSelectedWalletsForMerge(selectedWalletsForMerge.filter(addr => addr !== address));
    } else {
      setSelectedWalletsForMerge([...selectedWalletsForMerge, address]);
    }
  };

  // 全选/取消全选钱包
  const toggleSelectAll = () => {
    if (selectedWalletsForMerge.length === importedWallets.length) {
      setSelectedWalletsForMerge([]);
    } else {
      setSelectedWalletsForMerge(importedWallets.map(wallet => wallet.address));
    }
  };

  // 计算gas费用和最大可用数量
  const calculateMaxAvailableAmount = async () => {
    if (!selectedToken) return;

    try {
      // 预估gas费用 (这里使用固定值，实际应该通过estimateGas计算)
      const estimatedGas = selectedToken.isNative ? '0.0002' : '0.0001'; // ETH
      setEstimatedGasFee(estimatedGas);

      // 计算最大可用数量
      const currentBalance = parseFloat(selectedToken.balance);
      const gasFee = parseFloat(estimatedGas);

      let maxAmount = '0';
      if (selectedToken.isNative) {
        // 原生代币需要预留gas费用
        maxAmount = Math.max(0, currentBalance - gasFee).toFixed(6);
      } else {
        // ERC20代币不需要预留gas费用，但需要确保有足够的原生代币支付gas
        maxAmount = currentBalance.toFixed(6);
      }

      setMaxAvailableAmount(maxAmount);
    } catch (error) {
      console.error('计算最大可用数量失败:', error);
    }
  };

  // 批量归并代币
  const handleBatchMerge = async () => {
    if (!selectedToken || !mergeDestination || selectedWalletsForMerge.length === 0) {
      toast.error('请选择代币、设置归并目标地址并选择要归并的钱包');
      return;
    }

    if (!isAddress(mergeDestination)) {
      toast.error('无效的归并目标地址');
      return;
    }

    // 获取选中的钱包数据（包含私钥）
    const selectedWalletData = importedWallets.filter(wallet =>
      selectedWalletsForMerge.includes(wallet.address)
    );

    if (selectedWalletData.length === 0) {
      toast.error('未找到选中的钱包数据');
      return;
    }

    setIsMerging(true);
    try {
      toast.info(`准备归并 ${selectedWalletData.length} 个钱包的 ${selectedToken.symbol} 到目标地址`);

      // 这里实现具体的归并逻辑
      // 注意：实际使用私钥时需要确保安全性
      for (const wallet of selectedWalletData) {
        // 使用私钥签名并发送交易的逻辑
        console.log(`归并钱包 ${wallet.address} 的 ${selectedToken.symbol} 到 ${mergeDestination}`);
        // 实际实现需要使用私钥创建transaction并发送
      }

      toast.success(`成功发起 ${selectedWalletData.length} 个钱包的代币归并操作`);
    } catch (error) {
      toast.error(`归并失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsMerging(false);
    }
  };



  // 组件挂载时获取余额
  useEffect(() => {
    if (isConnected) {
      fetchTokenBalances();
    }
  }, [isConnected, address, nativeBalance]);

  // 当选择代币时计算最大可用数量
  useEffect(() => {
    if (selectedToken) {
      calculateMaxAvailableAmount();
    }
  }, [selectedToken]);

  if (!isConnected) {
    return (
      <div className="mx-auto h-full w-full max-w-6xl p-6">
        <div className="rounded-lg bg-[#FFFFFF1A] p-6 text-center">
          <h1 className="mb-4 text-2xl font-bold">钱包工具</h1>
          <p className="mb-4 text-gray-400">请先连接钱包以使用代币管理功能</p>
          <appkit-button />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full w-full max-w-6xl p-6">
      <h1 className="text-center text-3xl font-bold mb-6">钱包工具</h1>

      {/* 钱包连接状态 */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-[#FFFFFF1A] p-4">
        <div>
          <p className="text-sm text-gray-400">已连接钱包</p>
          <p className="font-mono text-sm">{address}</p>
          <p className="text-sm text-gray-400">
            网络: {chain?.name} ({chain?.id})
          </p>
          {hasWallets() && (
            <p className="text-sm text-blue-400 mt-1">
              本地存储: {importedWallets.length} 个钱包
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {hasWallets() && (
            <button
              onClick={handleClearWalletData}
              className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              title="删除所有本地存储的钱包数据"
            >
              清除本地钱包数据
            </button>
          )}
        </div>
      </div>

      {/* 代币选择区域 */}
      <div className="mb-6 rounded-lg bg-[#FFFFFF1A] p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">选择代币</h2>
            <button
              onClick={fetchTokenBalances}
              disabled={isLoadingBalances}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingBalances ? '加载中...' : '刷新余额'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tokenBalances.map((token, index) => (
              <div
                key={index}
                onClick={() => setSelectedToken(token)}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${selectedToken?.address === token.address
                  ? 'border-blue-500 bg-blue-50/10'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{token.symbol}</span>
                    {selectedToken?.address === token.address && (
                      <span className="text-xs text-blue-500">已选择</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    余额: {parseFloat(token.balance).toFixed(4)}
                  </p>
                  {!token.isNative && (
                    <p className="font-mono text-xs text-gray-500">
                      {token.address.slice(0, 10)}...{token.address.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 批量分发区域 */}
      <div className="mb-6 rounded-lg bg-[#FFFFFF1A] p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">批量分发代币</h2>
            <div className="space-x-2">
              {hasWallets() && (
                <button
                  onClick={loadWalletsAsTargets}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  title="从已导入的钱包中加载分发目标"
                >
                  加载钱包数据
                </button>
              )}
              <button
                onClick={addDistributionTarget}
                className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              >
                添加地址
              </button>
              {distributionTargets.length > 0 && (
                <button
                  onClick={clearAllDistributionTargets}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                  title="清除所有分发地址"
                >
                  清除全部
                </button>
              )}
            </div>
          </div>

          {/* 公共数量输入框 */}
          <div className="rounded-lg border border-gray-300 bg-gray-50/5 p-4">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium whitespace-nowrap">统一数量:</label>
              <input
                type="number"
                placeholder="输入要分发的数量"
                value={globalDistributionAmount}
                onChange={(e) => setGlobalDistributionAmount(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={applyGlobalAmountToAll}
                disabled={distributionTargets.length === 0}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
              >
                应用到所有
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              设置统一数量后点击"应用到所有"可批量填充，或单独为每个地址设置不同数量
            </p>
            {hasWallets() ? (
              <p className="mt-1 text-xs text-blue-400">
                💡 可点击"加载钱包数据"快速加载已导入的 {importedWallets.length} 个钱包地址
              </p>
            ) : (
              <p className="mt-1 text-xs text-yellow-500">
                ⚠️ 请先在"批量钱包生成器"中导入包含私钥的Excel文件
              </p>
            )}
          </div>

          {distributionTargets.length > 0 && (
            <div className="space-y-3">
              {distributionTargets.map((target, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="min-w-[30px] text-sm">#{index + 1}</span>
                  <input
                    type="text"
                    placeholder="接收地址"
                    value={target.address}
                    onChange={(e) => updateDistributionTarget(index, 'address', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="数量"
                    value={target.amount}
                    onChange={(e) => updateDistributionTarget(index, 'amount', e.target.value)}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeDistributionTarget(index)}
                    className="rounded-md bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {selectedToken ? `已选择: ${selectedToken.symbol}` : '请先选择代币'}
            </p>
            <button
              onClick={handleBatchDistribution}
              disabled={!selectedToken || distributionTargets.length === 0 || isDistributing}
              className="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isDistributing ? '分发中...' : '开始批量分发'}
            </button>
          </div>
        </div>
      </div>

      {/* 批量归并区域 */}
      <div className="mb-6 rounded-lg bg-[#FFFFFF1A] p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">批量归并代币</h2>
            <div className="text-sm text-gray-400">
              共享钱包: {hasWallets() ? `${importedWallets.length}个` : '未导入'}
            </div>
          </div>

          {/* Gas费用和最大可用数量信息 */}
          {selectedToken && (
            <div className="rounded-lg border border-blue-300 bg-blue-50/5 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-400">当前余额</p>
                  <p className="text-sm font-semibold">{parseFloat(selectedToken.balance).toFixed(6)} {selectedToken.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">预估Gas费用</p>
                  <p className="text-sm font-semibold text-orange-500">{estimatedGasFee} {selectedToken.isNative ? selectedToken.symbol : 'ETH'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">最大可用数量</p>
                  <p className="text-sm font-semibold text-green-500">{maxAvailableAmount} {selectedToken.symbol}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {selectedToken.isNative
                  ? '原生代币需要预留gas费用进行转账'
                  : 'ERC20代币转账需要消耗原生代币作为gas费用'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">归并目标地址</label>
            <input
              type="text"
              placeholder="输入接收所有代币的地址"
              value={mergeDestination}
              onChange={(e) => setMergeDestination(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                选择要归并的钱包 ({hasWallets() ? importedWallets.length : 0} 个可用)
              </label>
              {hasWallets() && (
                <button
                  onClick={toggleSelectAll}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  {selectedWalletsForMerge.length === importedWallets.length ? '取消全选' : '全选'}
                </button>
              )}
            </div>

            {!hasWallets() ? (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50/10 p-4 text-center">
                <p className="text-sm text-yellow-600">
                  暂无已导入的钱包数据，请先在"批量钱包生成器"中导入Excel文件
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50/5">
                <div className="space-y-1 p-3">
                  {importedWallets.map((wallet, index) => (
                    <div
                      key={wallet.address}
                      className={`flex items-center space-x-3 rounded-md p-2 transition-colors ${selectedWalletsForMerge.includes(wallet.address)
                        ? 'bg-blue-100/20 border border-blue-300'
                        : 'hover:bg-gray-100/10'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWalletsForMerge.includes(wallet.address)}
                        onChange={() => toggleWalletSelection(wallet.address)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="min-w-[30px] text-xs text-gray-500">#{index + 1}</span>
                      <span className="flex-1 font-mono text-xs">
                        {wallet.address}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">
                将把选中钱包的{selectedToken?.symbol || '代币'}归并到目标地址
              </p>
              {/* {selectedToken && (
                <p className="text-xs text-green-600">
                  每个地址最多可归并: {maxAvailableAmount} {selectedToken.symbol}
                </p>
              )} */}
              <p className="text-xs text-blue-600">
                已选择 {selectedWalletsForMerge.length} 个钱包进行归并
              </p>
            </div>
            <button
              onClick={handleBatchMerge}
              disabled={!selectedToken || !mergeDestination || selectedWalletsForMerge.length === 0 || isMerging}
              className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {isMerging ? '归并中...' : '开始批量归并'}
            </button>
          </div>
        </div>
      </div>



      {/* 使用说明 */}
      <div className="rounded-lg bg-[#FFFFFF1A] p-6">
        <h2 className="text-lg font-semibold text-blue-700 mb-3">使用说明</h2>
        <div className="space-y-2 text-sm">
          <p><strong>1. 代币选择:</strong> 连接钱包后自动获取代币余额，点击选择要操作的代币</p>
          <p><strong>2. 批量分发:</strong> 使用共享钱包数据进行代币分发，支持统一或个性化数量设置</p>
          <p className="ml-4 text-xs text-gray-500">• 点击"加载钱包数据"从共享存储中加载钱包地址</p>
          <p className="ml-4 text-xs text-gray-500">• 设置"统一数量"后点击"应用到所有"批量填充数量</p>
          <p className="ml-4 text-xs text-gray-500">• 或为每个地址单独设置不同的分发数量</p>
          <p className="ml-4 text-xs text-gray-500">• 使用"清除全部"按钮清空所有分发地址</p>
          <p><strong>3. 批量归并:</strong> 使用共享钱包数据，自动计算扣除gas费后的最大可用数量</p>
          <p className="ml-4 text-xs text-gray-500">• 使用在"钱包生成器"中导入的钱包数据（包含私钥）</p>
          <p className="ml-4 text-xs text-gray-500">• 原生代币会自动预留gas费用</p>
          <p className="ml-4 text-xs text-gray-500">• ERC20代币需要确保有足够原生代币支付gas</p>
          <p><strong>4. 数据共享:</strong> 一次导入Excel钱包数据，多个模块复用</p>
          <p className="ml-4 text-xs text-gray-500">• 支持两种格式：钱包数据(地址+私钥) 或 分发地址列表</p>
          <p className="ml-4 text-xs text-gray-500">• 钱包数据会保存到本地存储，在所有模块间共享</p>
          <p><strong>5. Excel格式:</strong> 钱包数据为"地址,私钥"；分发列表为"地址,数量"</p>
          <p className="text-red-600"><strong>⚠️ 安全提醒:</strong> 大额操作前请先小额测试，确保地址正确！</p>
        </div>
      </div>

      {/* 调试状态组件 */}
      <WalletDataStatus />
    </div>
  );
};

export default Tool;
