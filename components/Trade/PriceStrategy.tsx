'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useWalletData } from '@/hooks/useWalletData';
import { priceService, type TokenPrice } from '@/lib/priceService';
import { getNetworkConfig } from '@/config/tradeConfig';
import { executeRealBlockchainTrade, checkWalletBalance } from '@/utils/realTradeExecutor';

// 钱包余额状态
interface WalletBalanceStatus {
  address: string;
  hasInsufficientBalance: boolean;
  lastCheckedAt: string;
  nativeBalance: string;
  tokenBalance: string;
}

// 挂单类型
interface PendingOrder {
  id: string;              // 挂单ID
  type: 'BUY' | 'SELL';    // 买入/卖出
  triggerPrice: string;    // 触发价格
  amount: string;          // 数量 (买入=支付代币数量, 卖出=持仓百分比)
  executionType: 'ONCE' | 'FIXED' | 'UNLIMITED'; // 执行类型
  maxExecutions: number;   // 最大执行次数 (FIXED时使用)
  executedCount: number;   // 已执行次数
  selectedWallets: string[]; // 选中的钱包
  isActive: boolean;       // 是否激活
  createdAt: string;       // 创建时间
  lastExecutedAt?: string; // 最后执行时间
  tokenAddress: string;    // 代币地址
  tokenSymbol: string;     // 代币符号
  chainId: number;         // 链ID
  disabledWallets: string[]; // 余额不足被禁用的钱包
}

// 新挂单表单
interface NewOrderForm {
  type: 'BUY' | 'SELL';
  triggerPrice: string;
  amount: string;
  executionType: 'ONCE' | 'FIXED' | 'UNLIMITED';
  maxExecutions: number;
  selectedWallets: string[];
}

interface PriceStrategyProps {
  selectedToken: TokenPrice | null;
  currentPrice: string;
  onTradeExecuted: (trade: any) => void;
  chainId: number;
}

const PriceStrategy: React.FC<PriceStrategyProps> = ({
  selectedToken,
  currentPrice,
  onTradeExecuted,
  chainId
}) => {
  const { wallets: importedWallets, hasWallets } = useWalletData();
  const networkConfig = getNetworkConfig(chainId);

  // 挂单列表
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

  // 新挂单表单
  const [newOrderForm, setNewOrderForm] = useState<NewOrderForm>({
    type: 'BUY',
    triggerPrice: '',
    amount: '',
    executionType: 'ONCE',
    maxExecutions: 1,
    selectedWallets: []
  });

  // 监控状态
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringCleanup, setMonitoringCleanup] = useState<(() => void) | null>(null);

  // 钱包余额状态管理
  const [walletBalanceStatus, setWalletBalanceStatus] = useState<Map<string, WalletBalanceStatus>>(new Map());

  // 本地存储键
  const STORAGE_KEY = `pending_orders_${chainId}_${selectedToken?.address || 'none'}`;

  // 加载本地存储的挂单
  useEffect(() => {
    if (selectedToken) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const orders = JSON.parse(stored) as PendingOrder[];
          // 确保旧数据兼容性，添加缺失的字段
          const compatibleOrders = orders.map(order => ({
            ...order,
            disabledWallets: order.disabledWallets || [] // 如果没有该字段，初始化为空数组
          }));
          setPendingOrders(compatibleOrders);
          console.log(`📋 加载了 ${compatibleOrders.length} 个挂单`);
        }
      } catch (error) {
        console.error('加载挂单失败:', error);
      }
    }
  }, [selectedToken, STORAGE_KEY]);

  // 保存挂单到本地存储
  const saveOrdersToStorage = useCallback((orders: PendingOrder[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('保存挂单失败:', error);
    }
  }, [STORAGE_KEY]);

  // 生成挂单ID
  const generateOrderId = () => {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 检查钱包余额
  const checkWalletBalanceStatus = useCallback(async (walletAddress: string, order: PendingOrder): Promise<boolean> => {
    try {
      const balanceInfo = await checkWalletBalance(
        walletAddress,
        order.tokenAddress,
        order.chainId
      );

      const requiredAmount = parseFloat(order.amount);
      let hasInsufficientBalance = false;

      if (order.type === 'BUY') {
        // 买入需要检查原生代币余额
        const nativeBalance = parseFloat(balanceInfo.nativeBalance);
        hasInsufficientBalance = nativeBalance < requiredAmount;
      } else {
        // 卖出需要检查代币余额
        const tokenBalance = parseFloat(balanceInfo.tokenBalance);
        const requiredTokenAmount = (tokenBalance * requiredAmount) / 100; // 百分比转换
        hasInsufficientBalance = tokenBalance < requiredTokenAmount;
      }

      // 更新钱包余额状态
      setWalletBalanceStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(walletAddress, {
          address: walletAddress,
          hasInsufficientBalance,
          lastCheckedAt: new Date().toLocaleString(),
          nativeBalance: balanceInfo.nativeBalance,
          tokenBalance: balanceInfo.tokenBalance
        });
        return newMap;
      });

      return !hasInsufficientBalance;
    } catch (error) {
      console.error('检查钱包余额失败:', error);
      return false;
    }
  }, []);

  // 获取可用钱包（排除余额不足的钱包）
  const getAvailableWallets = useCallback((order: PendingOrder): string[] => {
    const disabledWallets = order.disabledWallets || [];
    return order.selectedWallets.filter(address => !disabledWallets.includes(address));
  }, []);

  // 禁用余额不足的钱包
  const disableWalletForOrder = useCallback((orderId: string, walletAddress: string) => {
    // 重新获取最新的挂单状态
    const currentOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];

    const updatedOrders = currentOrders.map(order => {
      if (order.id === orderId) {
        const disabledWallets = order.disabledWallets || [];
        if (!disabledWallets.includes(walletAddress)) {
          console.log(`🚫 禁用钱包 ${walletAddress.slice(0, 8)}... 对挂单 ${orderId.slice(-8)}`);
          return {
            ...order,
            disabledWallets: [...disabledWallets, walletAddress]
          };
        }
      }
      return order;
    });

    setPendingOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

    toast.warning(`钱包 ${walletAddress.slice(0, 8)}... 余额不足，已暂时禁用`);
  }, [STORAGE_KEY]);

  // 定期检查并恢复钱包状态
  const recheckDisabledWallets = useCallback(async () => {
    for (const order of pendingOrders) {
      const disabledWallets = order.disabledWallets || [];
      if (disabledWallets.length > 0) {
        const walletsToRecheck = [...disabledWallets];

        for (const walletAddress of walletsToRecheck) {
          const hasBalance = await checkWalletBalanceStatus(walletAddress, order);

          if (hasBalance) {
            // 余额恢复，重新启用钱包
            const updatedOrders = pendingOrders.map(o => {
              if (o.id === order.id) {
                const currentDisabledWallets = o.disabledWallets || [];
                return {
                  ...o,
                  disabledWallets: currentDisabledWallets.filter(addr => addr !== walletAddress)
                };
              }
              return o;
            });

            setPendingOrders(updatedOrders);
            saveOrdersToStorage(updatedOrders);

            console.log(`💰 钱包 ${walletAddress.slice(0, 8)}... 余额已恢复，重新启用`);
            toast.success(`钱包 ${walletAddress.slice(0, 8)}... 余额已恢复，重新启用`);
          }
        }
      }
    }
  }, [pendingOrders, saveOrdersToStorage, checkWalletBalanceStatus]);

  // 创建新挂单
  const createOrder = useCallback(() => {
    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    if (!newOrderForm.triggerPrice || !newOrderForm.amount) {
      toast.error('请填写完整的挂单信息');
      return;
    }

    if (newOrderForm.selectedWallets.length === 0) {
      toast.error('请选择至少一个钱包');
      return;
    }

    // 验证数量格式
    if (newOrderForm.type === 'SELL') {
      const percentage = parseFloat(newOrderForm.amount);
      if (percentage <= 0 || percentage > 100) {
        toast.error('卖出百分比必须在1-100之间');
        return;
      }
    } else {
      const amount = parseFloat(newOrderForm.amount);
      if (amount <= 0) {
        toast.error('买入数量必须大于0');
        return;
      }
    }

    const newOrder: PendingOrder = {
      id: generateOrderId(),
      type: newOrderForm.type,
      triggerPrice: newOrderForm.triggerPrice,
      amount: newOrderForm.amount,
      executionType: newOrderForm.executionType,
      maxExecutions: newOrderForm.maxExecutions,
      executedCount: 0,
      selectedWallets: [...newOrderForm.selectedWallets],
      isActive: true,
      createdAt: new Date().toLocaleString(),
      tokenAddress: selectedToken.address,
      tokenSymbol: selectedToken.symbol,
      chainId: chainId,
      disabledWallets: [] // 初始化为空数组
    };

    const updatedOrders = [...pendingOrders, newOrder];
    setPendingOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // 重置表单
    setNewOrderForm({
      type: 'BUY',
      triggerPrice: '',
      amount: '',
      executionType: 'ONCE',
      maxExecutions: 1,
      selectedWallets: []
    });

    toast.success('挂单创建成功!');
  }, [selectedToken, newOrderForm, pendingOrders, saveOrdersToStorage, chainId]);

  // 删除挂单
  const deleteOrder = useCallback((orderId: string) => {
    const updatedOrders = pendingOrders.filter(order => order.id !== orderId);
    setPendingOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);
    toast.success('挂单已删除');
  }, [pendingOrders, saveOrdersToStorage]);

  // 切换挂单激活状态
  const toggleOrderActive = useCallback((orderId: string) => {
    const updatedOrders = pendingOrders.map(order =>
      order.id === orderId ? { ...order, isActive: !order.isActive } : order
    );
    setPendingOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);
  }, [pendingOrders, saveOrdersToStorage]);

  // 清除所有挂单
  const clearAllOrders = useCallback(() => {
    if (confirm('确定要清除所有挂单吗？此操作不可撤销。')) {
      setPendingOrders([]);
      localStorage.removeItem(STORAGE_KEY);
      toast.success('所有挂单已清除');
    }
  }, [STORAGE_KEY]);

  // 执行挂单交易
  const executeOrder = useCallback(async (order: PendingOrder) => {
    if (!selectedToken) return;

    console.log(`🚀 开始执行挂单 ${order.id.slice(-8)}`);

    // 重新获取最新的挂单状态，确保使用最新的禁用钱包列表
    const currentOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];
    const currentOrder = currentOrders.find(o => o.id === order.id);

    if (!currentOrder || !currentOrder.isActive) {
      console.warn(`⚠️ 挂单 ${order.id.slice(-8)} 已被禁用或不存在，跳过执行`);
      return;
    }

    // 获取可用钱包（排除余额不足的钱包）
    const disabledWallets = currentOrder.disabledWallets || [];
    const availableWallets = currentOrder.selectedWallets.filter(addr => !disabledWallets.includes(addr));

    console.log(`📊 挂单 ${order.id.slice(-8)} 状态: 总钱包 ${currentOrder.selectedWallets.length}个, 禁用 ${disabledWallets.length}个, 可用 ${availableWallets.length}个`);

    if (availableWallets.length === 0) {
      console.warn(`⚠️ 挂单 ${currentOrder.id.slice(-8)} 所有钱包余额不足，自动暂停执行`);
      toast.warning(`挂单 ${currentOrder.id.slice(-8)} 所有钱包余额不足，已暂停执行`);

      // 暂停挂单，避免继续轮询
      const updatedOrders = currentOrders.map(o =>
        o.id === currentOrder.id ? { ...o, isActive: false } : o
      );
      setPendingOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      return;
    }

    // 预先检查所有可用钱包的余额状态
    const walletsWithBalance: string[] = [];

    for (const walletAddress of availableWallets) {
      const hasBalance = await checkWalletBalanceStatus(walletAddress, currentOrder);
      if (hasBalance) {
        walletsWithBalance.push(walletAddress);
      } else {
        // 余额不足，立即禁用该钱包，避免后续尝试
        console.warn(`💰 钱包 ${walletAddress.slice(0, 8)}... 余额不足，已禁用`);
        disableWalletForOrder(currentOrder.id, walletAddress);
      }
    }

    // 如果预检查后没有可用钱包，直接返回
    if (walletsWithBalance.length === 0) {
      console.warn(`⚠️ 挂单 ${currentOrder.id.slice(-8)} 预检查后无可用钱包，暂停执行`);
      toast.warning(`挂单 ${currentOrder.id.slice(-8)} 预检查后无可用钱包，已暂停执行`);

      // 暂停挂单
      const updatedOrders = currentOrders.map(o =>
        o.id === currentOrder.id ? { ...o, isActive: false } : o
      );
      setPendingOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      return;
    }

    // 从有余额的钱包中随机选择
    const randomIndex = Math.floor(Math.random() * walletsWithBalance.length);
    const selectedAddress = walletsWithBalance[randomIndex];
    const selectedWalletData = importedWallets.find(w => w.address === selectedAddress);

    if (!selectedWalletData) {
      console.error('❌ 未找到可用钱包数据');
      toast.error('未找到可用钱包');
      return;
    }

    try {
      console.log(`🚀 开始执行挂单 ${currentOrder.id.slice(-8)} (钱包: ${selectedAddress.slice(0, 8)}...)`);
      toast.info(`正在执行${currentOrder.type === 'BUY' ? '买入' : '卖出'}挂单... (钱包: ${selectedWalletData.address.slice(0, 8)}...)`);

      let actualAmount = currentOrder.amount;

      // 如果是卖出，需要计算实际代币数量
      if (currentOrder.type === 'SELL') {
        const percentage = parseFloat(currentOrder.amount);
        console.log(`📊 准备卖出 ${percentage}% 的 ${selectedToken.symbol} 持仓`);
        // TODO: 这里需要获取钱包中的代币余额，然后计算百分比
        // actualAmount = 计算出的实际代币数量
      }

      // 执行真实的区块链交易
      const txHash = await executeRealBlockchainTrade({
        tokenAddress: selectedToken.address,
        amount: actualAmount,
        tradeType: currentOrder.type,
        walletPrivateKey: selectedWalletData.privateKey,
        chainId: chainId,
        slippageTolerance: 5
      });

      console.log(`✅ 挂单执行成功: ${txHash}`);

      // 重新获取最新的挂单状态并更新执行次数
      const latestOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];
      const updatedOrders = latestOrders.map(o => {
        if (o.id === currentOrder.id) {
          const newExecutedCount = o.executedCount + 1;
          const shouldDeactivate =
            o.executionType === 'ONCE' ||
            (o.executionType === 'FIXED' && newExecutedCount >= o.maxExecutions);

          return {
            ...o,
            executedCount: newExecutedCount,
            isActive: !shouldDeactivate,
            lastExecutedAt: new Date().toLocaleString()
          };
        }
        return o;
      });

      setPendingOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

      // 记录成功的交易历史
      const trade = {
        type: currentOrder.type,
        amount: actualAmount,
        price: currentPrice,
        timestamp: new Date().toLocaleString(),
        wallet: selectedWalletData.address,
        txHash: txHash,
        token: selectedToken.symbol,
        status: 'success',
        orderId: currentOrder.id
      };

      onTradeExecuted(trade);
      toast.success(`✅ ${currentOrder.type === 'BUY' ? '买入' : '卖出'}成功! 交易哈希: ${txHash.slice(0, 10)}...`);

    } catch (error: any) {
      console.error(`❌ 挂单 ${currentOrder.id.slice(-8)} 执行失败:`, error);

      // 检查是否是余额不足错误
      const isInsufficientBalance =
        error.message.includes('余额不足') ||
        error.message.includes('insufficient') ||
        error.message.includes('INSUFFICIENT_FUNDS') ||
        error.message.includes('INSUFFICIENT_BALANCE');

      if (isInsufficientBalance) {
        // 余额不足错误，禁用当前钱包但不记录交易历史
        console.warn(`💰 钱包 ${selectedAddress.slice(0, 8)}... 余额不足，已禁用`);
        disableWalletForOrder(currentOrder.id, selectedAddress);
        toast.warning(`钱包 ${selectedAddress.slice(0, 8)}... 余额不足，已禁用`);

        // 不记录余额不足的交易历史，避免垃圾记录
        return;
      }

      // 其他类型的错误才记录交易历史
      const trade = {
        type: currentOrder.type,
        amount: currentOrder.amount,
        price: currentPrice,
        timestamp: new Date().toLocaleString(),
        wallet: selectedWalletData.address,
        txHash: '',
        token: selectedToken?.symbol || '',
        status: 'failed',
        error: error.message,
        orderId: currentOrder.id
      };

      onTradeExecuted(trade);
      toast.error(`❌ ${currentOrder.type === 'BUY' ? '买入' : '卖出'}失败: ${error.message}`);
    }
  }, [selectedToken, importedWallets, chainId, pendingOrders, saveOrdersToStorage, currentPrice, onTradeExecuted]);

  // 开始监控挂单
  const startOrderMonitoring = useCallback(() => {
    if (!selectedToken) {
      toast.error('请先选择代币');
      return;
    }

    if (pendingOrders.filter(o => o.isActive).length === 0) {
      toast.error('没有激活的挂单');
      return;
    }

    // 主网交易确认
    const isMainnet = !networkConfig.isTestnet;
    if (isMainnet) {
      const activeOrders = pendingOrders.filter(o => o.isActive);
      const confirmMessage = `⚠️ 警告: 您即将在${networkConfig.name}主网上启动挂单监控!\n\n这将使用真实资金进行交易，当前有 ${activeOrders.length} 个激活的挂单:\n\n${activeOrders.map(o =>
        `• ${o.type} ${o.amount}${o.type === 'SELL' ? '%' : ' ' + networkConfig.nativeCurrency.symbol} @ $${o.triggerPrice}`
      ).join('\n')}\n\n确定要继续吗?`;

      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsMonitoring(true);
    toast.success(`🚀 挂单监控已启动 (${networkConfig.name})`);

    // 订阅价格更新 - 使用ref来获取最新的挂单状态
    const priceCallback = (price: number) => {
      // 重新获取最新的挂单状态，避免闭包问题
      const currentOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];
      const activeOrders = currentOrders.filter(o => o.isActive);

      console.log(`📊 价格监控检查: $${price}, 激活挂单: ${activeOrders.length}个`);

      for (const order of activeOrders) {
        // 检查是否有可用钱包，避免对无可用钱包的挂单进行监控
        const disabledWallets = order.disabledWallets || [];
        const availableWallets = order.selectedWallets.filter(addr => !disabledWallets.includes(addr));

        if (availableWallets.length === 0) {
          console.warn(`⚠️ 挂单 ${order.id.slice(-8)} 无可用钱包，跳过价格监控`);
          continue;
        }

        const triggerPrice = parseFloat(order.triggerPrice);

        if (
          (order.type === 'BUY' && price <= triggerPrice) ||
          (order.type === 'SELL' && price >= triggerPrice)
        ) {
          console.log(`🎯 价格触发挂单 ${order.id.slice(-8)}: 当前价格 $${price}, 触发价格 $${triggerPrice}, 可用钱包: ${availableWallets.length}个`);
          executeOrder(order);
        }
      }
    };

    priceService.subscribeToPrice(selectedToken.address, priceCallback, 3000, chainId);

    // 定期检查禁用钱包的余额恢复（每30秒检查一次）
    const balanceCheckInterval = setInterval(async () => {
      console.log(`💰 定期检查禁用钱包余额恢复...`);

      // 重新获取最新的挂单状态
      const currentOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];
      let hasUpdates = false;

      for (const order of currentOrders) {
        const disabledWallets = order.disabledWallets || [];
        if (disabledWallets.length > 0) {
          const walletsToRecheck = [...disabledWallets];

          for (const walletAddress of walletsToRecheck) {
            try {
              const hasBalance = await checkWalletBalanceStatus(walletAddress, order);

              if (hasBalance) {
                // 余额恢复，重新启用钱包
                const updatedOrders = currentOrders.map(o => {
                  if (o.id === order.id) {
                    const currentDisabledWallets = o.disabledWallets || [];
                    return {
                      ...o,
                      disabledWallets: currentDisabledWallets.filter(addr => addr !== walletAddress)
                    };
                  }
                  return o;
                });

                // 更新本地存储
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
                setPendingOrders(updatedOrders);
                hasUpdates = true;

                console.log(`💰 钱包 ${walletAddress.slice(0, 8)}... 余额已恢复，重新启用`);
                toast.success(`钱包 ${walletAddress.slice(0, 8)}... 余额已恢复，重新启用`);
              }
            } catch (error) {
              console.error(`检查钱包 ${walletAddress.slice(0, 8)}... 余额失败:`, error);
            }
          }
        }
      }
    }, 30000);

    // 定期检查挂单状态，自动暂停无可用钱包的挂单（每10秒检查一次）
    const orderStatusCheckInterval = setInterval(() => {
      // 重新获取最新的挂单状态
      const currentOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as PendingOrder[];
      const activeOrders = currentOrders.filter(o => o.isActive);
      let hasUpdates = false;

      console.log(`🔍 定期检查挂单状态: ${activeOrders.length}个激活挂单`);

      const updatedOrders = currentOrders.map(order => {
        if (order.isActive) {
          const disabledWallets = order.disabledWallets || [];
          const availableWallets = order.selectedWallets.filter(addr => !disabledWallets.includes(addr));

          if (availableWallets.length === 0) {
            console.warn(`🛑 自动暂停挂单 ${order.id.slice(-8)} - 无可用钱包 (禁用: ${disabledWallets.length}个)`);
            hasUpdates = true;
            return { ...order, isActive: false };
          }
        }
        return order;
      });

      if (hasUpdates) {
        // 更新状态和本地存储
        setPendingOrders(updatedOrders);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
        toast.info('已自动暂停无可用钱包的挂单');
      }
    }, 10000);

    // 清理函数
    const cleanup = () => {
      if (selectedToken) {
        priceService.unsubscribeFromPrice(selectedToken.address, priceCallback);
      }
      clearInterval(balanceCheckInterval);
      clearInterval(orderStatusCheckInterval);
      setIsMonitoring(false);
      setMonitoringCleanup(null);
    };

    setMonitoringCleanup(() => cleanup);
  }, [selectedToken, pendingOrders, networkConfig, chainId, executeOrder]);

  // 停止监控
  const stopOrderMonitoring = useCallback(() => {
    if (monitoringCleanup) {
      monitoringCleanup();
      toast.info('挂单监控已停止');
    }
  }, [monitoringCleanup]);

  // 钱包选择切换
  const toggleWalletForOrder = useCallback((address: string) => {
    setNewOrderForm(prev => ({
      ...prev,
      selectedWallets: prev.selectedWallets.includes(address)
        ? prev.selectedWallets.filter(addr => addr !== address)
        : [...prev.selectedWallets, address]
    }));
  }, []);

  // 全选钱包
  const selectAllWallets = useCallback(() => {
    setNewOrderForm(prev => ({
      ...prev,
      selectedWallets: importedWallets.map(wallet => wallet.address)
    }));
    toast.success(`已选择所有 ${importedWallets.length} 个钱包`);
  }, [importedWallets]);

  // 取消全选钱包
  const deselectAllWallets = useCallback(() => {
    setNewOrderForm(prev => ({
      ...prev,
      selectedWallets: []
    }));
    toast.info('已取消选择所有钱包');
  }, []);

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-6 space-y-6 w-full h-full">
      {/* 标题和网络状态 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">智能挂单系统</h2>
          {/* <div className={`px-2 py-1 rounded-full text-xs font-medium ${networkConfig.isTestnet
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
            {networkConfig.isTestnet ? '🧪 测试网' : '🔴 主网'}
          </div> */}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            激活挂单: {pendingOrders.filter(o => o.isActive).length}
          </span>
        </div>
      </div>

      {/* 创建新挂单 */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-50/5 p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-3">创建新挂单</h3>

        {/* 挂单类型选择 */}
        <div className="flex space-x-4 mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="orderType"
              checked={newOrderForm.type === 'BUY'}
              onChange={() => setNewOrderForm(prev => ({ ...prev, type: 'BUY' }))}
              className="h-4 w-4 text-green-600"
            />
            <span className="text-green-400">买入挂单</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="orderType"
              checked={newOrderForm.type === 'SELL'}
              onChange={() => setNewOrderForm(prev => ({ ...prev, type: 'SELL' }))}
              className="h-4 w-4 text-red-600"
            />
            <span className="text-red-400">卖出挂单</span>
          </label>
        </div>

        {/* 挂单参数 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">触发价格 ($)</label>
            <input
              type="number"
              step="0.000001"
              placeholder={newOrderForm.type === 'BUY' ? '价格低于此值时买入' : '价格高于此值时卖出'}
              value={newOrderForm.triggerPrice}
              onChange={(e) => setNewOrderForm(prev => ({ ...prev, triggerPrice: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {newOrderForm.type === 'BUY'
                ? `买入数量 (${networkConfig.nativeCurrency.symbol})`
                : '卖出比例 (%)'}
            </label>
            <input
              type="number"
              step={newOrderForm.type === 'BUY' ? '0.001' : '1'}
              min={newOrderForm.type === 'BUY' ? '0' : '1'}
              max={newOrderForm.type === 'SELL' ? '100' : undefined}
              placeholder={newOrderForm.type === 'BUY'
                ? `支付的${networkConfig.nativeCurrency.symbol}数量`
                : '持仓百分比 (1-100)'}
              value={newOrderForm.amount}
              onChange={(e) => setNewOrderForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 执行类型 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">执行类型</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="executionType"
                checked={newOrderForm.executionType === 'ONCE'}
                onChange={() => setNewOrderForm(prev => ({ ...prev, executionType: 'ONCE' }))}
                className="h-4 w-4"
              />
              <span className="text-sm">执行一次</span>
            </label>
            <div className='flex items-center space-x-2'>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="executionType"
                  checked={newOrderForm.executionType === 'FIXED'}
                  onChange={() => setNewOrderForm(prev => ({ ...prev, executionType: 'FIXED' }))}
                  className="h-4 w-4"
                />
                <span className="text-sm">固定次数</span>
              </label>
              {newOrderForm.executionType === 'FIXED' && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="最大执行次数"
                    value={newOrderForm.maxExecutions}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, maxExecutions: parseInt(e.target.value) || 1 }))}
                    className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="executionType"
                checked={newOrderForm.executionType === 'UNLIMITED'}
                onChange={() => setNewOrderForm(prev => ({ ...prev, executionType: 'UNLIMITED' }))}
                className="h-4 w-4"
              />
              <span className="text-sm">无限执行</span>
            </label>
          </div>


        </div>

        {/* 钱包选择 */}
        {hasWallets() && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">选择交易钱包</label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllWallets}
                  disabled={newOrderForm.selectedWallets.length === importedWallets.length}
                  className="rounded-md bg-blue-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  全选
                </button>
                <button
                  onClick={deselectAllWallets}
                  disabled={newOrderForm.selectedWallets.length === 0}
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
                      checked={newOrderForm.selectedWallets.includes(wallet.address)}
                      onChange={() => toggleWalletForOrder(wallet.address)}
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
          </div>
        )}

        {/* 创建挂单按钮 */}
        <button
          onClick={createOrder}
          disabled={!selectedToken || !newOrderForm.triggerPrice || !newOrderForm.amount || newOrderForm.selectedWallets.length === 0}
          className="w-full rounded-md bg-blue-600 cursor-pointer px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          创建挂单
        </button>
      </div>

      {/* 挂单列表 */}
      <div className="rounded-lg border border-gray-500/30 bg-gray-50/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">挂单列表</h3>
          <div className="flex space-x-2">
            <button
              onClick={recheckDisabledWallets}
              disabled={pendingOrders.every(o => (o.disabledWallets || []).length === 0)}
              className="rounded-md bg-blue-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              检查余额
            </button>
            <button
              onClick={clearAllOrders}
              disabled={pendingOrders.length === 0}
              className="rounded-md bg-red-600 cursor-pointer px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            >
              清除全部
            </button>
          </div>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            暂无挂单，请创建新的挂单
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingOrders.map((order) => (
              <div key={order.id} className={`rounded-lg border p-3 ${order.isActive
                ? order.type === 'BUY'
                  ? 'border-green-500/30 bg-green-50/5'
                  : 'border-red-500/30 bg-red-50/5'
                : 'border-gray-500/30 bg-gray-50/5 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${order.type === 'BUY'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                      }`}>
                      {order.type}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">${order.triggerPrice}</span>
                      <span className="text-gray-400 ml-2">
                        {order.amount}{order.type === 'SELL' ? '%' : ` ${networkConfig.nativeCurrency.symbol}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-400">
                      {order.executedCount}/{order.executionType === 'UNLIMITED' ? '∞' : order.maxExecutions}
                    </div>
                    <button
                      onClick={() => toggleOrderActive(order.id)}
                      className={`px-2 py-1 rounded text-xs ${order.isActive
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                        }`}
                    >
                      {order.isActive ? '暂停' : '激活'}
                    </button>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  创建: {order.createdAt} | 钱包: {order.selectedWallets.length}个
                  {(order.disabledWallets || []).length > 0 && (
                    <span className="text-yellow-400">
                      {` | 禁用: ${(order.disabledWallets || []).length}个`}
                    </span>
                  )}
                  {order.lastExecutedAt && ` | 最后执行: ${order.lastExecutedAt}`}
                </div>

                {/* 显示钱包状态详情 */}
                {(order.disabledWallets || []).length > 0 && (
                  <div className="text-xs text-yellow-400 mt-1 p-2 bg-yellow-500/10 rounded">
                    ⚠️ 余额不足钱包: {(order.disabledWallets || []).map(addr =>
                      `${addr.slice(0, 6)}...${addr.slice(-4)}`
                    ).join(', ')}
                    <br />
                    可用钱包: {getAvailableWallets(order).length}个
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 监控控制 */}
      <div>
        <div className="flex space-x-2">
          <button
            onClick={startOrderMonitoring}
            disabled={!selectedToken || isMonitoring || pendingOrders.filter(o => o.isActive).length === 0}
            className="flex-1 rounded-md bg-green-600 cursor-pointer px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isMonitoring ? '监控中...' : '开始挂单监控'}
          </button>
          {isMonitoring && (
            <button
              onClick={stopOrderMonitoring}
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
              <span className="text-green-400 font-semibold">📊 挂单监控已启动</span>
              <span className="text-green-300">实时监控中...</span>
            </div>
            <div className="text-xs text-green-300 mt-1">
              🤖 监控 {pendingOrders.filter(o => o.isActive).length} 个激活挂单 |
              当前价格: ${currentPrice} |
              网络: {networkConfig.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceStrategy;
