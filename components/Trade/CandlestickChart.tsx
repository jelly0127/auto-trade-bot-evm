'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useChainId } from 'wagmi';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  currentPrice: string;
  tokenInfo: {
    symbol: string;
    name: string;
    address: string;
  };
  onRefreshIntervalChange?: (interval: number) => void;
}

// 支持的网络类型
type NetworkType = 'mainnet' | 'testnet';

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  currentPrice,
  tokenInfo,
  onRefreshIntervalChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chainId = useChainId();
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [chartType, setChartType] = useState<'dexscreener' | 'custom'>('dexscreener');
  const [networkType, setNetworkType] = useState<NetworkType>('mainnet');
  const [isValidAddress, setIsValidAddress] = useState(false);

  const refreshOptions = [
    { value: 3, label: '3秒' },
    { value: 5, label: '5秒' },
    { value: 10, label: '10秒' },
    { value: 30, label: '30秒' },
    { value: 60, label: '60秒' }
  ];

  // 网络ID到DEX Screener路径的映射
  const getNetworkPath = (chainId: number) => {
    const networkMap: { [key: number]: string } = {
      1: 'ethereum',        // Ethereum Mainnet
      56: 'bsc',           // BSC Mainnet
      137: 'polygon',      // Polygon Mainnet
      42161: 'arbitrum',   // Arbitrum One
      10: 'optimism',      // Optimism Mainnet
      43114: 'avalanche',  // Avalanche C-Chain
      250: 'fantom',       // Fantom Opera
      25: 'cronos',        // Cronos Mainnet
      1666600000: 'harmony', // Harmony ONE
      // 测试网
      5: 'goerli',         // Goerli Testnet
      97: 'bsc-testnet',   // BSC Testnet
      80001: 'polygon-mumbai', // Polygon Mumbai
    };

    return networkMap[chainId] || null;
  };

  // 检测网络和代币地址有效性
  useEffect(() => {
    const checkTokenAddress = async () => {
      if (!tokenInfo.address) {
        setIsValidAddress(false);
        return;
      }

      // 检查是否为有效的以太坊地址格式
      const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(tokenInfo.address);
      if (!isValidFormat) {
        setIsValidAddress(false);
        setNetworkType('testnet');
        return;
      }

      // 根据chainId判断是否为测试网
      const isTestnet = [5, 97, 80001].includes(chainId); // Goerli, BSC Testnet, Polygon Mumbai
      setNetworkType(isTestnet ? 'testnet' : 'mainnet');
      setIsValidAddress(true);
    };

    checkTokenAddress();
  }, [tokenInfo.address, chainId]);

  // 根据网络类型自动选择图表类型
  // useEffect(() => {
  //   if (networkType === 'testnet' || !isValidAddress) {
  // setChartType('custom');
  //   }
  // }, [networkType, isValidAddress]);

  // 生成DEX Screener URL
  const getDexScreenerUrl = () => {
    if (!isValidAddress || networkType === 'testnet') {
      return null;
    }

    // 获取当前网络对应的路径
    const networkPath = getNetworkPath(chainId);
    if (!networkPath) {
      return null; // 不支持的网络
    }

    // 根据当前连接的网络生成DEX Screener URL
    const baseUrl = `https://dexscreener.com/${networkPath}`;
    return `${baseUrl}/${tokenInfo.address}`;
  };

  // 生成嵌入式iframe URL
  const getDexScreenerEmbedUrl = () => {
    const dexUrl = getDexScreenerUrl();
    if (!dexUrl) return null;

    // 获取当前网络对应的路径
    const networkPath = getNetworkPath(chainId);
    if (!networkPath) return null;

    // DEX Screener嵌入URL格式
    return `https://dexscreener.com/${networkPath}/${tokenInfo.address}?embed=1&theme=dark&trades=0&info=0`;
  };

  const handleRefreshIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    onRefreshIntervalChange?.(newInterval);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // 清空画布
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 绘制背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (data.length === 0) {
      // 绘制无数据提示
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('暂无价格数据', rect.width / 2, rect.height / 2);
      return;
    }

    // 计算数据范围
    const maxPrice = Math.max(...data.map(d => d.high));
    const minPrice = Math.min(...data.map(d => d.low));
    const priceRange = maxPrice - minPrice;
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // 绘制网格线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();

      // 价格标签
      const price = maxPrice - (priceRange * i) / 5;
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(6)}`, rect.width - padding + 5, y + 3);
    }

    // 垂直网格线
    const timeStep = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += timeStep) {
      const x = padding + (chartWidth * i) / (data.length - 1);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, rect.height - padding);
      ctx.stroke();

      // 时间标签
      const time = new Date(data[i].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(time, x, rect.height - padding + 15);
    }

    // 绘制K线
    const candleWidth = Math.max(2, chartWidth / data.length * 0.8);

    data.forEach((candle, index) => {
      const x = padding + (chartWidth * index) / (data.length - 1);
      const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight;

      const isGreen = candle.close > candle.open;
      ctx.strokeStyle = isGreen ? '#00ff88' : '#ff4444';
      ctx.fillStyle = isGreen ? '#00ff88' : '#ff4444';

      // 绘制影线
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // 绘制实体
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);

      if (bodyHeight > 0) {
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      } else {
        // 十字星
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x + candleWidth / 2, openY);
        ctx.stroke();
      }
    });

    // 绘制当前价格线
    if (currentPrice && parseFloat(currentPrice) > 0) {
      const currentPriceY = padding + ((maxPrice - parseFloat(currentPrice)) / priceRange) * chartHeight;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, currentPriceY);
      ctx.lineTo(rect.width - padding, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 当前价格标签
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`$${currentPrice}`, rect.width - padding - 5, currentPriceY - 5);
    }

    // 绘制标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${tokenInfo.symbol} Price Chart`, padding, 25);

  }, [data, currentPrice, tokenInfo]);

  // 生成模拟K线数据
  const generateMockData = (): CandleData[] => {
    const mockData: CandleData[] = [];
    let basePrice = parseFloat(currentPrice) || 0.0001;
    const now = Date.now();

    for (let i = 29; i >= 0; i--) {
      const time = now - i * 5 * 60 * 1000; // 5分钟间隔
      const volatility = 0.1; // 10%波动

      const open = basePrice;
      const change = (Math.random() - 0.5) * volatility;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.05);
      const low = Math.min(open, close) * (1 - Math.random() * 0.05);
      const volume = Math.random() * 10000;

      mockData.push({ time, open, high, low, close, volume });
      basePrice = close; // 下一根K线的起始价格
    }

    return mockData;
  };

  const mockData = data.length > 0 ? data : generateMockData();

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-6 h-full w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">价格走势图</h2>
          <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
            <span>{tokenInfo.name} ({tokenInfo.symbol})</span>
            <span className="font-mono">{tokenInfo.address.slice(0, 10)}...{tokenInfo.address.slice(-8)}</span>
            {/* <span className={`px-2 py-1 rounded text-xs ${networkType === 'mainnet' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
              }`}>
              {getNetworkDisplayName(chainId)}
            </span> */}
            {!getNetworkPath(chainId) && networkType === 'mainnet' && (
              <span className="px-2 py-1 rounded text-xs bg-orange-600 text-white">
                DEX不支持
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* 图表类型选择 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">图表类型:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'dexscreener' | 'custom')}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={networkType === 'testnet' || !isValidAddress}
            >
              <option value="dexscreener">DEX Screener</option>
              <option value="custom">自绘图表</option>
            </select>
          </div>

          {/* 刷新频率选择 - 仅在自绘图表时显示 */}
          {chartType === 'custom' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">刷新频率:</label>
              <select
                value={refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {refreshOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 外部链接 - 仅在DEX Screener可用时显示 */}
          {chartType === 'dexscreener' && getDexScreenerUrl() && (
            <a
              href={getDexScreenerUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              🔗 在DEX Screener中打开
            </a>
          )}

          {/* 图例 */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded"></div>
              <span>上涨</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded"></div>
              <span>下跌</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded"></div>
              <span>当前价格</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* DEX Screener 嵌入图表 */}
        {chartType === 'dexscreener' && getDexScreenerEmbedUrl() ? (
          <div className="w-full h-80 border border-gray-600 rounded-lg overflow-hidden">
            <iframe
              src={getDexScreenerEmbedUrl()!}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              title={`${tokenInfo.symbol} Chart on DEX Screener`}
            />
          </div>
        ) : (
          /* 自绘图表 */
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-80 border border-gray-600 rounded-lg"
              style={{ width: '100%', height: '320px' }}
            />

            {/* 价格信息面板 */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-black/70 p-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between space-x-4">
                  <span className="text-gray-400">当前价格:</span>
                  <span className="font-semibold text-yellow-400">${currentPrice}</span>
                </div>
                {mockData.length > 0 && (
                  <>
                    <div className="flex justify-between space-x-4">
                      <span className="text-gray-400">24h高:</span>
                      <span className="text-green-400">${Math.max(...mockData.map(d => d.high)).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between space-x-4">
                      <span className="text-gray-400">24h低:</span>
                      <span className="text-red-400">${Math.min(...mockData.map(d => d.low)).toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between space-x-4">
                      <span className="text-gray-400">交易量:</span>
                      <span>{mockData.reduce((sum, d) => sum + d.volume, 0).toFixed(0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* 网络类型提示 */}
        {networkType === 'testnet' && (
          <div className="absolute top-4 left-4 rounded-lg bg-yellow-600/80 p-2 text-xs text-white">
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span>测试网代币，使用自绘图表</span>
            </div>
          </div>
        )}

        {!isValidAddress && tokenInfo.address && (
          <div className="absolute top-4 left-4 rounded-lg bg-red-600/80 p-2 text-xs text-white">
            <div className="flex items-center space-x-2">
              <span>❌</span>
              <span>无效地址格式</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default CandlestickChart; 