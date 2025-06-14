// 价格服务 - 获取实时代币价格数据

export interface TokenPrice {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 模拟价格数据生成器
class MockPriceGenerator {
  private basePrice: number;
  private lastPrice: number;
  private priceHistory: CandleData[] = [];
  
  constructor(initialPrice: number = 0.0001) {
    this.basePrice = initialPrice;
    this.lastPrice = initialPrice;
    this.generateInitialHistory();
  }

  private generateInitialHistory() {
    const now = Date.now();
    let currentPrice = this.basePrice;
    
    // 生成过去30个5分钟K线数据
    for (let i = 29; i >= 0; i--) {
      const time = now - i * 5 * 60 * 1000;
      const volatility = 0.05; // 5%波动
      
      const open = currentPrice;
      const change = (Math.random() - 0.5) * volatility;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.03);
      const low = Math.min(open, close) * (1 - Math.random() * 0.03);
      const volume = Math.random() * 50000 + 10000;
      
      this.priceHistory.push({
        time,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    this.lastPrice = currentPrice;
  }

  public getCurrentPrice(): number {
    // 模拟价格波动
    const volatility = 0.02; // 2%波动
    const change = (Math.random() - 0.5) * volatility;
    this.lastPrice = this.lastPrice * (1 + change);
    
    // 防止价格过低或过高
    if (this.lastPrice < this.basePrice * 0.1) {
      this.lastPrice = this.basePrice * 0.1;
    }
    if (this.lastPrice > this.basePrice * 10) {
      this.lastPrice = this.basePrice * 10;
    }
    
    return this.lastPrice;
  }

  public getTokenInfo(address: string): TokenPrice {
    const currentPrice = this.getCurrentPrice();
    const oldPrice = this.priceHistory[this.priceHistory.length - 2]?.close || currentPrice;
    const priceChange24h = ((currentPrice - oldPrice) / oldPrice) * 100;
    
    return {
      address,
      symbol: 'TOKEN',
      name: 'Test Token',
      price: currentPrice,
      priceChange24h,
      volume24h: Math.random() * 1000000 + 100000,
      marketCap: currentPrice * 1000000000, // 假设10亿供应量
      liquidity: Math.random() * 500000 + 50000,
      holders: Math.floor(Math.random() * 10000) + 1000
    };
  }

  public getCandleData(): CandleData[] {
    // 更新最新的K线数据
    const now = Date.now();
    const latestCandle = this.priceHistory[this.priceHistory.length - 1];
    
    // 如果距离最后一根K线超过5分钟，生成新的K线
    if (now - latestCandle.time > 5 * 60 * 1000) {
      const newCandle: CandleData = {
        time: now,
        open: latestCandle.close,
        high: Math.max(latestCandle.close, this.getCurrentPrice()),
        low: Math.min(latestCandle.close, this.getCurrentPrice()),
        close: this.getCurrentPrice(),
        volume: Math.random() * 50000 + 10000
      };
      
      this.priceHistory.push(newCandle);
      
      // 保持最近30根K线
      if (this.priceHistory.length > 30) {
        this.priceHistory.shift();
      }
    }
    
    return [...this.priceHistory];
  }
}

// 价格服务类
class PriceService {
  private priceGenerators: Map<string, MockPriceGenerator> = new Map();
  private subscribers: Map<string, ((price: number) => void)[]> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  // 获取代币信息
  async getTokenInfo(address: string, chainId?: number): Promise<TokenPrice | null> {
    try {
      // 首先尝试从真实API获取数据
      const realTokenInfo = await this.fetchRealTokenInfo(address, chainId);
      if (realTokenInfo) {
        return realTokenInfo;
      }
      
      // 如果API失败，使用模拟数据
      if (!this.priceGenerators.has(address)) {
        this.priceGenerators.set(address, new MockPriceGenerator());
      }
      
      const generator = this.priceGenerators.get(address)!;
      return generator.getTokenInfo(address);
      
    } catch (error) {
      console.error('获取代币信息失败:', error);
      return null;
    }
  }

  // 获取真实代币信息
  private async fetchRealTokenInfo(address: string, chainId?: number): Promise<TokenPrice | null> {
    const apiSources = [
      { name: 'DexScreener', fn: () => this.fetchFromDexScreener(address) },
      { name: 'CoinGecko', fn: () => this.fetchFromCoinGecko(address, chainId) },
      { name: 'Moralis', fn: () => this.fetchFromMoralis(address) }
    ];

    let lastError: Error | null = null;

    for (const source of apiSources) {
      try {
        console.log(`尝试从 ${source.name} 获取代币信息...`);
        const result = await source.fn();
        if (result) {
          console.log(`✅ 成功从 ${source.name} 获取代币信息`);
          return result;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${source.name} API 失败:`, error instanceof Error ? error.message : error);
        continue;
      }
    }
    
    console.warn('⚠️ 所有API源都失败，将使用模拟数据');
    if (lastError) {
      console.error('最后一个错误:', lastError.message);
    }
    
    return null;
  }

  // DexScreener API (通过代理)
  private async fetchFromDexScreener(address: string): Promise<TokenPrice | null> {
    try {
      const response = await fetch(`/api/dexscreener?address=${address}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DexScreener API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // 检查是否有错误信息
      if (data.error) {
        throw new Error(`DexScreener API error: ${data.error}`);
      }
      
      const pairs = data.pairs;
      
      if (!pairs || pairs.length === 0) {
        console.warn('DexScreener: 未找到交易对数据');
        return null;
      }
      
      // 取流动性最高的交易对
      const bestPair = pairs.reduce((best: any, current: any) => 
        (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
      );
      
      if (!bestPair.baseToken) {
        console.warn('DexScreener: 交易对数据不完整');
        return null;
      }
      
      return {
        address: address.toLowerCase(),
        symbol: bestPair.baseToken.symbol || 'UNKNOWN',
        name: bestPair.baseToken.name || 'Unknown Token',
        price: parseFloat(bestPair.priceUsd || '0'),
        priceChange24h: parseFloat(bestPair.priceChange?.h24 || '0'),
        volume24h: parseFloat(bestPair.volume?.h24 || '0'),
        marketCap: parseFloat(bestPair.marketCap || '0'),
        liquidity: parseFloat(bestPair.liquidity?.usd || '0'),
        holders: 0 // DexScreener doesn't provide holder count
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('DexScreener fetch failed:', errorMessage);
      throw error; // 重新抛出错误，让上层处理
    }
  }

  // CoinGecko API (备用，通过代理)
  private async fetchFromCoinGecko(address: string, chainId?: number): Promise<TokenPrice | null> {
    try {
      // 检测链类型
      const platform = this.detectPlatform(address, chainId);
      const response = await fetch(
        `/api/coingecko?address=${address}&platform=${platform}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          console.warn('CoinGecko: 代币未找到');
          return null;
        }
        throw new Error(`CoinGecko API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // 检查是否有错误信息
      if (data.error) {
        throw new Error(`CoinGecko API error: ${data.error}`);
      }
      
      // 验证必要的数据字段
      if (!data.market_data) {
        console.warn('CoinGecko: 缺少市场数据');
        return null;
      }
      
      return {
        address: address.toLowerCase(),
        symbol: data.symbol?.toUpperCase() || 'UNKNOWN',
        name: data.name || 'Unknown Token',
        price: data.market_data?.current_price?.usd || 0,
        priceChange24h: data.market_data?.price_change_percentage_24h || 0,
        volume24h: data.market_data?.total_volume?.usd || 0,
        marketCap: data.market_data?.market_cap?.usd || 0,
        liquidity: 0,
        holders: 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('CoinGecko fetch failed:', errorMessage);
      throw error; // 重新抛出错误，让上层处理
    }
  }

  // Moralis API (备用)
  private async fetchFromMoralis(address: string): Promise<TokenPrice | null> {
    try {
      // 这里需要Moralis API key，暂时返回null
      console.log('Moralis API not configured');
      return null;
    } catch (error) {
      console.error('Moralis fetch failed:', error);
      return null;
    }
  }

  // 检测区块链平台
  private detectPlatform(address: string, chainId?: number): string {
    // 根据chainId判断链类型
    if (chainId) {
      const platformMap: { [key: number]: string } = {
        1: 'ethereum',
        56: 'binance-smart-chain',
        137: 'polygon-pos',
        42161: 'arbitrum-one',
        10: 'optimistic-ethereum',
        43114: 'avalanche',
        250: 'fantom',
        25: 'cronos',
      };
      
      return platformMap[chainId] || 'binance-smart-chain';
    }
    
    // 如果没有chainId，根据地址特征判断（默认BSC）
    if (address.startsWith('0x')) {
      return 'binance-smart-chain';
    }
    return 'ethereum';
  }

  // 获取K线数据
  async getCandleData(address: string, interval: string = '5m', limit: number = 30): Promise<CandleData[]> {
    try {
      if (!this.priceGenerators.has(address)) {
        this.priceGenerators.set(address, new MockPriceGenerator());
      }
      
      const generator = this.priceGenerators.get(address)!;
      return generator.getCandleData();
      
    } catch (error) {
      console.error('获取K线数据失败:', error);
      return [];
    }
  }

  // 订阅价格更新
  subscribeToPrice(address: string, callback: (price: number) => void, intervalMs: number = 5000, chainId?: number) {
    if (!this.subscribers.has(address)) {
      this.subscribers.set(address, []);
    }
    
    this.subscribers.get(address)!.push(callback);
    
    // 如果这是第一个订阅者，启动价格更新
    if (!this.intervals.has(address)) {
      const interval = setInterval(async () => {
        const tokenInfo = await this.getTokenInfo(address, chainId);
        if (tokenInfo && this.subscribers.has(address)) {
          this.subscribers.get(address)!.forEach(cb => cb(tokenInfo.price));
        }
      }, intervalMs);
      
      this.intervals.set(address, interval);
    }
  }

  // 取消订阅
  unsubscribeFromPrice(address: string, callback: (price: number) => void) {
    if (!this.subscribers.has(address)) return;
    
    const callbacks = this.subscribers.get(address)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    
    // 如果没有订阅者了，清除定时器
    if (callbacks.length === 0) {
      const interval = this.intervals.get(address);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(address);
      }
      this.subscribers.delete(address);
    }
  }

  // 清理所有订阅
  cleanup() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.subscribers.clear();
  }
}

// 导出单例实例
export const priceService = new PriceService();

// 实用函数
export const formatPrice = (price: number): string => {
  if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.001) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  } else {
    return volume.toFixed(2);
  }
};

export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000000) {
    return `${(marketCap / 1000000000).toFixed(2)}B`;
  } else if (marketCap >= 1000000) {
    return `${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    return `${(marketCap / 1000).toFixed(2)}K`;
  } else {
    return marketCap.toFixed(2);
  }
}; 