'use client';
import React, { useState } from 'react';
import { isAddress } from 'viem';
import { toast } from 'sonner';
import { useTokenStorage, type StoredToken } from '@/hooks/useTokenStorage';
import { priceService, type TokenPrice } from '@/lib/priceService';
import { useWalletData } from '@/hooks/useWalletData';

interface TokenSelectorProps {
  address: `0x${string}` | undefined;

  tokenAddress: string;
  setTokenAddress: (address: string) => void;
  selectedToken: TokenPrice | null;
  onTokenSelect: (token: TokenPrice) => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  address,
  tokenAddress,
  setTokenAddress,
  selectedToken,
  onTokenSelect
}) => {
  const { storedTokens, addToken, removeToken, clearAllTokens, isTokenStored } = useTokenStorage();
  const [isLoading, setIsLoading] = useState(false);
  const { wallets: importedWallets, hasWallets } = useWalletData();

  // 获取代币信息
  const fetchTokenInfo = async () => {
    if (!tokenAddress || !isAddress(tokenAddress)) {
      toast.error('请输入有效的代币合约地址');
      return;
    }

    setIsLoading(true);
    toast.info('正在查询代币信息，请稍候...', { duration: 3000 });

    try {
      const tokenInfo = await priceService.getTokenInfo(tokenAddress);

      if (tokenInfo) {
        onTokenSelect(tokenInfo);

        // 自动保存到本地存储
        if (!isTokenStored(tokenAddress)) {
          const success = addToken(tokenAddress, tokenInfo.symbol, tokenInfo.name);
          if (success) {
            toast.success(`代币 ${tokenInfo.symbol} (${tokenInfo.name}) 已保存到本地`);
          }
        }

        toast.success(`成功获取代币信息: ${tokenInfo.symbol}`);
      } else {
        toast.error('未找到代币信息，请检查地址是否正确或稍后重试');
      }
    } catch (error) {
      console.error('获取代币信息失败:', error);
      toast.error('获取代币信息失败，可能是网络问题或API限制，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 选择已存储的代币
  const selectStoredToken = async (storedToken: StoredToken) => {
    setTokenAddress(storedToken.address);

    // 获取最新价格信息
    const tokenInfo = await priceService.getTokenInfo(storedToken.address);
    if (tokenInfo) {
      onTokenSelect(tokenInfo);
    }
  };

  // 删除存储的代币
  const handleRemoveToken = (address: string, symbol: string) => {
    if (confirm(`确定要删除 ${symbol} 吗？`)) {
      removeToken(address);
      toast.success(`已删除 ${symbol}`);
    }
  };

  // 清除所有代币
  const handleClearAll = () => {
    if (confirm('确定要清除所有存储的代币吗？此操作不可恢复。')) {
      clearAllTokens();
      toast.success('已清除所有存储的代币');
    }
  };

  return (
    <div className="rounded-lg grid grid-cols-4 gap-x-6 bg-[#FFFFFF1A] p-6 w-full ">
      {/* 钱包状态 */}
      <div className="col-span-1">
        <h2 className="text-lg font-semibold mb-4">钱包状态</h2>
        <div className="space-y-2">
          <div className="flex flex-col justify-between">
            <span className="text-sm text-gray-400">主钱包:</span>
            <span className="text-sm font-mono truncate">{address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">导入钱包:</span>
            <span className="text-sm font-semibold">{hasWallets() ? `${importedWallets.length}个` : '未导入'}</span>
          </div>
          {!hasWallets() && (
            <p className="text-xs text-yellow-500 mt-2">
              请先在"钱包工具"中导入钱包数据以使用多钱包功能
            </p>
          )}
        </div>
      </div>



      {/* 代币地址输入 */}
      <div className="col-span-1 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">代币选择</h2>
          {storedTokens.length > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded-md bg-red-600 px-3 py-1 text-xs text-white cursor-pointer hover:bg-red-700"
              title="清除所有存储的代币"
            >
              清除全部
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">代币合约地址</label>
          <input
            type="text"
            placeholder="输入代币合约地址 (0x...)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchTokenInfo}
          disabled={isLoading || !tokenAddress}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '获取中...' : '获取代币信息'}
        </button>
      </div>

      {/* 已存储的代币列表 */}
      {storedTokens.length > 0 && (
        <div className="">
          <h3 className="text-sm font-medium mb-3">已存储的代币 ({storedTokens.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {storedTokens.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between rounded-lg border border-gray-600 p-3 hover:bg-gray-50/5"
              >
                <div className="flex-1 cursor-pointer" onClick={() => selectStoredToken(token)}>
                  {/* <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{token.symbol}</span>
                    <span className="text-xs text-gray-400">{token.name}</span>
                  </div> */}
                  <div className="text-xs text-gray-500 font-mono">
                    {token.address.slice(0, 8)}...{token.address.slice(-6)}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveToken(token.address, token.symbol)}
                  className="ml-2 rounded-md bg-red-600 px-2 py-1 text-xs cursor-pointer text-white hover:bg-red-700"
                  title="删除此代币"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 当前选中的代币信息 */}
      {selectedToken && (
        <div className=" space-y-2 ">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-400">当前选中代币</span>
            {isTokenStored(selectedToken.address) && (
              <span className="text-xs text-blue-400">已保存</span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">名称:</span>
              <span className="font-semibold">{selectedToken.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">符号:</span>
              <span className="font-semibold">{selectedToken.symbol}</span>
            </div>
            <div className="flex flex-col ">
              <span className="text-gray-400">地址:</span>
              <span className="font-mono text-xs">{selectedToken.address}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenSelector; 