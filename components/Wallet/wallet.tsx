'use client';
import React, { useState, useRef } from 'react';
import {
  generateBatchWallets,
  exportWalletsToExcel,
  importWalletsFromExcel,
  validateWallets,
  type WalletData,
} from '@/lib/wallet';
import { toast } from "sonner"
import { useWalletData } from '@/hooks/useWalletData';

import Tool from './tool';

const Wallet = () => {
  const { wallets, saveWallets, addWallets, clearWallets } = useWalletData(); // 使用共享钱包数据
  const [walletCount, setWalletCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成批量钱包
  const handleGenerateWallets = async () => {
    if (walletCount <= 0 || walletCount > 1000) {
      toast.error('钱包数量必须在1-1000之间');
      return;
    }

    setIsGenerating(true);
    try {
      const newWallets = generateBatchWallets(walletCount);
      saveWallets(newWallets);
      toast.success(`成功生成${walletCount}个钱包`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (wallets.length === 0) {
      toast.warning('没有钱包数据可导出');
      return;
    }

    try {
      const filename = `wallets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      exportWalletsToExcel(wallets, filename);
      toast.success(`已导出${wallets.length}个钱包到${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '未知错误');
    }
  };

  // 选择文件
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 导入Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedWallets = await importWalletsFromExcel(file);

      // 验证导入的数据
      const validation = validateWallets(importedWallets);
      if (!validation.valid) {
        toast.error(validation.errors.slice(0, 3).join('\n'));
        return;
      }

      saveWallets(importedWallets);
      toast.success(`成功导入${importedWallets.length}个钱包`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 清空钱包列表
  const handleClearWallets = () => {
    clearWallets();
    toast.info('钱包列表已清空');
  };

  return (
    <div className="mx-auto h-full w-full max-w-6xl p-6">
      <Tool />
      <div className="space-y-6">
        {/* 标题 */}
        <h1 className="text-center text-3xl font-bold">批量钱包生成器</h1>

        {/* 生成钱包区域 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">生成新钱包</h2>
            <div className="flex items-center space-x-4">
              <span className="min-w-[100px]">生成数量:</span>
              <input
                type="number"
                value={walletCount}
                onChange={(e) => setWalletCount(parseInt(e.target.value) || 0)}
                placeholder="输入要生成的钱包数量"
                min={1}
                max={1000}
                className="w-48 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGenerateWallets}
                disabled={isGenerating}
                className="flex items-center space-x-2 rounded-md bg-blue-400 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                <span>{isGenerating ? '生成中...' : '生成钱包'}</span>
              </button>
            </div>
            <p className="text-sm text-red-500">注：建议一次生成不超过1000个钱包</p>
          </div>
        </div>

        {/* 导入导出区域 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">导入/导出功能</h2>
            <div className="flex space-x-4">
              <button
                onClick={handleExportExcel}
                disabled={wallets.length === 0}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                导出Excel
              </button>
              <button
                onClick={handleFileSelect}
                disabled={isImporting}
                className="flex items-center space-x-2 rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                <span>{isImporting ? '导入中...' : '导入Excel'}</span>
              </button>
              <button
                onClick={handleClearWallets}
                disabled={wallets.length === 0}
                className="rounded-md border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                清空列表
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
            <p className="text-sm">Excel格式要求：第一列为Address，第二列为Private Key，第一行为表头</p>
          </div>
        </div>

        {/* 钱包列表显示 */}
        {wallets.length > 0 && (
          <div className="rounded-lg bg-[#FFFFFF1A] p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">钱包列表 ({wallets.length}个)</h2>
                <p className="text-sm">点击地址或私钥可复制</p>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-md">
                <div className="space-y-2 p-4">
                  {wallets.slice(0, 50).map((wallet, index) => (
                    <div key={index} className="rounded-md bg-[#FFFFFF1A] p-3">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <span className="min-w-[80px] text-sm font-semibold">#{index + 1}</span>
                          <span className="text-sm">地址:</span>
                          <span
                            className="cursor-pointer break-all font-mono text-sm hover:text-blue-200 hover:underline"
                            onClick={() => {
                              navigator.clipboard.writeText(wallet.address);
                              toast.success('地址已复制到剪贴板');
                            }}
                          >
                            {wallet.address}
                          </span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="min-w-[80px]"></span>
                          <span className="text-sm">私钥:</span>
                          <span
                            className="cursor-pointer break-all font-mono text-sm hover:text-blue-300 hover:underline"
                            onClick={() => {
                              navigator.clipboard.writeText(wallet.privateKey);
                              toast.success('私钥已复制到剪贴板');
                            }}
                          >
                            {wallet.privateKey}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {wallets.length > 50 && (
                    <div className="flex items-center space-x-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                      <span className="text-blue-600">ℹ</span>
                      <span className="text-sm text-blue-700">只显示前50个钱包，完整列表请导出Excel查看</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="rounded-lg bg-[#FFFFFF1A] p-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-blue-700">使用说明</h2>
            <p className="text-sm">
              1. <strong>生成钱包:</strong> 输入数量后点击 生成钱包 按钮，系统会自动生成指定数量的以太坊钱包
            </p>
            <p className="text-sm">
              2. <strong>导出Excel:</strong> 点击 导出Excel 按钮将钱包数据保存为Excel文件
            </p>
            <p className="text-sm">
              3. <strong>导入Excel:</strong> 点击 导入Excel 按钮选择包含钱包数据的Excel文件进行导入
            </p>
            <p className="text-sm">
              4. <strong>复制数据:</strong> 点击任意地址或私钥可快速复制到剪贴板
            </p>
            <p className="text-sm text-red-600">
              ⚠️ <strong>安全提醒:</strong> 请妥善保管私钥，不要泄露给他人！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
