/**
 * 真实的区块链交易执行器
 * 使用 ethers.js 集成多链DEX进行真实交易
 * 支持所有EVM兼容链
 */

import { ethers } from 'ethers';
import { getNetworkConfig, getRecommendedGasPrice } from '@/config/tradeConfig';

// ERC20 Token ABI (简化版)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

// Uniswap V2 Router ABI (通用，适用于大多数DEX)
const ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
  'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external'
];

/**
 * 真实的区块链交易执行函数
 */
export const executeRealBlockchainTrade = async (params: {
  tokenAddress: string;
  amount: string;
  tradeType: 'BUY' | 'SELL';
  walletPrivateKey: string;
  chainId: number;
  rpcUrl?: string;
  slippageTolerance?: number;
}): Promise<string> => {
  
  // 验证参数
  if (!params.walletPrivateKey || params.walletPrivateKey === 'YOUR_WALLET_PRIVATE_KEY') {
    throw new Error('请提供真实的钱包私钥');
  }

  console.log(`🚀 开始执行真实交易: ${params.tradeType} ${params.amount} on Chain ${params.chainId}`);
  
  try {
    // 获取网络配置
    const networkConfig = getNetworkConfig(params.chainId);
    const rpcUrl = params.rpcUrl || networkConfig.rpcUrl;
    
    console.log(`🌐 使用网络: ${networkConfig.name} (${networkConfig.shortName})`);
    console.log(`🏪 使用DEX: ${networkConfig.dex.name}`);
    
    // 创建provider和wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(params.walletPrivateKey, provider);
    
    console.log('💼 使用钱包地址:', wallet.address);
    
    // 检查网络连接
    const network = await provider.getNetwork();
    console.log('🌐 连接到网络:', network.name, 'ChainId:', network.chainId);
    
    // 验证链ID匹配
    if (Number(network.chainId) !== params.chainId) {
      throw new Error(`链ID不匹配: 期望 ${params.chainId}, 实际 ${network.chainId}`);
    }
    
    // 检查钱包余额
    const balance = await provider.getBalance(wallet.address);
    const nativeSymbol = networkConfig.nativeCurrency.symbol;
    console.log(`💰 钱包${nativeSymbol}余额:`, ethers.formatEther(balance));
    
    if (balance < ethers.parseEther('0.001')) {
      throw new Error(`钱包${nativeSymbol}余额不足，至少需要0.001 ${nativeSymbol}作为Gas费用`);
    }
    
    // 创建路由器合约实例
    const routerContract = new ethers.Contract(
      networkConfig.dex.routerAddress, 
      ROUTER_ABI, 
      wallet
    );
    
    // 设置交易截止时间（20分钟后）
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    
    // 设置滑点容忍度
    const slippage = params.slippageTolerance || 5; // 默认5%
    
    // 获取推荐的Gas价格
    const gasPrice = getRecommendedGasPrice(params.chainId);
    
    let tx;
    
    if (params.tradeType === 'BUY') {
      // 买入代币 (Native Token -> Token)
      console.log(`💸 买入 ${params.amount} ${nativeSymbol} 的 ${params.tokenAddress} 代币`);
      
      const amountIn = ethers.parseEther(params.amount);
      
      // 检查是否有足够的原生代币
      if (balance < amountIn) {
        throw new Error(`${nativeSymbol}余额不足。余额: ${ethers.formatEther(balance)}, 需要: ${params.amount}`);
      }
      
      // 获取预期输出数量
      const path = [networkConfig.dex.wethAddress, params.tokenAddress];
      let amountsOut;
      
      try {
        amountsOut = await routerContract.getAmountsOut(amountIn, path);
      } catch (error) {
        throw new Error('无法获取代币价格，请检查代币地址是否正确或是否有足够流动性');
      }
      
      // 计算最小输出数量（考虑滑点）
      const amountOutMin = amountsOut[1] * BigInt(100 - slippage) / BigInt(100);
      
      console.log('📊 预期输出:', ethers.formatUnits(amountsOut[1], 18));
      console.log('📊 最小输出:', ethers.formatUnits(amountOutMin, 18));
      console.log('📊 滑点设置:', slippage + '%');
      
      // 估算Gas费用
      let gasEstimate;
      try {
        gasEstimate = await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens.estimateGas(
          amountOutMin,
          path,
          wallet.address,
          deadline,
          { value: amountIn }
        );
        console.log('⛽ Gas估算:', gasEstimate.toString());
      } catch (error) {
        console.warn('⚠️ Gas估算失败，使用默认值');
        gasEstimate = BigInt(500000);
      }
      
      // 执行买入交易 (使用支持手续费代币的函数)
      tx = await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        path,
        wallet.address,
        deadline,
        { 
          value: amountIn,
          gasLimit: gasEstimate * BigInt(120) / BigInt(100), // 增加20%缓冲
          gasPrice: gasPrice
        }
      );
      
    } else {
      // 卖出代币 (Token -> Native Token)
      console.log(`💸 卖出 ${params.amount} 个 ${params.tokenAddress} 代币`);
      
      // 创建代币合约实例
      const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI, wallet);
      
      // 获取代币信息
      let decimals, symbol;
      try {
        decimals = await tokenContract.decimals();
        symbol = await tokenContract.symbol();
        console.log('🪙 代币信息:', symbol, 'Decimals:', decimals);
      } catch (error) {
        throw new Error('无法获取代币信息，请检查代币地址是否正确');
      }
      
      const amountIn = ethers.parseUnits(params.amount, decimals);
      
      // 检查代币余额
      const tokenBalance = await tokenContract.balanceOf(wallet.address);
      console.log('💰 代币余额:', ethers.formatUnits(tokenBalance, decimals), symbol);
      
      if (tokenBalance < amountIn) {
        throw new Error(`代币余额不足。余额: ${ethers.formatUnits(tokenBalance, decimals)}, 需要: ${params.amount}`);
      }
      
      // 检查授权额度
      const allowance = await tokenContract.allowance(wallet.address, networkConfig.dex.routerAddress);
      if (allowance < amountIn) {
        console.log('🔐 授权代币...');
        const approveTx = await tokenContract.approve(
          networkConfig.dex.routerAddress, 
          amountIn,
          { gasPrice: gasPrice }
        );
        console.log('⏳ 等待授权确认...');
        await approveTx.wait();
        console.log('✅ 授权完成');
      }
      
      // 获取预期输出数量
      const path = [params.tokenAddress, networkConfig.dex.wethAddress];
      let amountsOut;
      
      try {
        amountsOut = await routerContract.getAmountsOut(amountIn, path);
      } catch (error) {
        throw new Error('无法获取代币价格，请检查代币是否有足够流动性');
      }
      
      // 计算最小输出数量（考虑滑点）
      const amountOutMin = amountsOut[1] * BigInt(100 - slippage) / BigInt(100);
      
      console.log('📊 预期输出:', ethers.formatEther(amountsOut[1]), nativeSymbol);
      console.log('📊 最小输出:', ethers.formatEther(amountOutMin), nativeSymbol);
      console.log('📊 滑点设置:', slippage + '%');
      
      // 估算Gas费用
      let gasEstimate;
      try {
        gasEstimate = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens.estimateGas(
          amountIn,
          amountOutMin,
          path,
          wallet.address,
          deadline
        );
        console.log('⛽ Gas估算:', gasEstimate.toString());
      } catch (error) {
        console.warn('⚠️ Gas估算失败，使用默认值');
        gasEstimate = BigInt(500000);
      }
      
      // 执行卖出交易
      tx = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(
        amountIn,
        amountOutMin,
        path,
        wallet.address,
        deadline,
        { 
          gasLimit: gasEstimate * BigInt(120) / BigInt(100), // 增加20%缓冲
          gasPrice: gasPrice
        }
      );
    }
    
    console.log('📝 交易已提交，哈希:', tx.hash);
    console.log('⏳ 等待交易确认...');
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ 交易成功确认!');
      console.log('📊 Gas使用量:', receipt.gasUsed.toString());
      console.log('💰 Gas费用:', ethers.formatEther(receipt.gasUsed * receipt.gasPrice || BigInt(0)), nativeSymbol);
      return tx.hash;
    } else {
      throw new Error('交易失败');
    }
    
  } catch (error: any) {
    console.error('❌ 交易执行失败:', error);
    
    // 提供更详细的错误信息
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('余额不足，请检查钱包余额');
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      throw new Error('Gas估算失败，可能是交易会失败');
    } else if (error.message.includes('slippage')) {
      throw new Error('滑点过高，请增加滑点容忍度或减少交易金额');
    } else if (error.message.includes('liquidity')) {
      throw new Error('流动性不足，请选择其他代币或减少交易金额');
    }
    
    throw error;
  }
};

/**
 * 获取代币价格（通过DEX）
 */
export const getTokenPrice = async (tokenAddress: string, chainId: number, rpcUrl?: string): Promise<number> => {
  try {
    const networkConfig = getNetworkConfig(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl || networkConfig.rpcUrl);
    const routerContract = new ethers.Contract(networkConfig.dex.routerAddress, ROUTER_ABI, provider);
    
    const amountIn = ethers.parseEther('1'); // 1 native token
    const path = [networkConfig.dex.wethAddress, tokenAddress];
    
    const amountsOut = await routerContract.getAmountsOut(amountIn, path);
    const tokenAmount = ethers.formatUnits(amountsOut[1], 18);
    
    return parseFloat(tokenAmount);
  } catch (error) {
    console.error('获取代币价格失败:', error);
    return 0;
  }
};

/**
 * 检查钱包余额
 */
export const checkWalletBalance = async (
  walletAddress: string, 
  tokenAddress: string, 
  chainId: number,
  rpcUrl?: string
): Promise<{ nativeBalance: string; tokenBalance: string }> => {
  try {
    const networkConfig = getNetworkConfig(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl || networkConfig.rpcUrl);
    
    // 获取原生代币余额
    const nativeBalance = await provider.getBalance(walletAddress);
    
    // 获取代币余额
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const tokenBalance = await tokenContract.balanceOf(walletAddress);
    const decimals = await tokenContract.decimals();
    
    return {
      nativeBalance: ethers.formatEther(nativeBalance),
      tokenBalance: ethers.formatUnits(tokenBalance, decimals)
    };
  } catch (error) {
    console.error('检查钱包余额失败:', error);
    return {
      nativeBalance: '0',
      tokenBalance: '0'
    };
  }
}; 