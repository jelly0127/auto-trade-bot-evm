import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as XLSX from 'xlsx';

export interface WalletData {
  address: string;
  privateKey: string;
}

/**
 * 生成单个以太坊钱包
 */
export const generateSingleWallet = (): WalletData => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  return {
    address: account.address,
    privateKey: privateKey,
  };
};

/**
 * 批量生成以太坊钱包
 * @param count 生成数量
 */
export const generateBatchWallets = (count: number): WalletData[] => {
  const wallets: WalletData[] = [];

  for (let i = 0; i < count; i++) {
    wallets.push(generateSingleWallet());
  }

  return wallets;
};

/**
 * 将钱包数据导出为Excel
 * @param wallets 钱包数据数组
 * @param filename 文件名
 */
export const exportWalletsToExcel = (wallets: WalletData[], filename: string = 'wallets.xlsx') => {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  // 准备数据，添加表头
  const data = [
    ['Address', 'Private Key'], // 表头
    ...wallets.map((wallet) => [wallet.address, wallet.privateKey]),
  ];

  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 设置列宽
  worksheet['!cols'] = [
    { width: 50 }, // Address列宽度
    { width: 70 }, // Private Key列宽度
  ];

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Wallets');

  // 下载文件
  XLSX.writeFile(workbook, filename);
};

/**
 * 从Excel文件读取钱包数据
 * @param file Excel文件
 * @returns Promise<WalletData[]>
 */
export const importWalletsFromExcel = (file: File): Promise<WalletData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 读取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        // 跳过表头，解析数据
        const wallets: WalletData[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.length >= 2 && row[0] && row[1]) {
            wallets.push({
              address: row[0].toString(),
              privateKey: row[1].toString(),
            });
          }
        }

        resolve(wallets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * 验证钱包数据格式
 * @param wallets 钱包数据数组
 */
export const validateWallets = (wallets: WalletData[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];

    // 验证地址格式
    if (!wallet.address || !wallet.address.startsWith('0x') || wallet.address.length !== 42) {
      errors.push(`第${i + 1}行: 地址格式无效 - ${wallet.address}`);
    }

    // 验证私钥格式
    if (!wallet.privateKey || !wallet.privateKey.startsWith('0x') || wallet.privateKey.length !== 66) {
      errors.push(`第${i + 1}行: 私钥格式无效 - ${wallet.privateKey}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
