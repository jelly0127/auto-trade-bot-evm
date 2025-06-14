import { NextRequest, NextResponse } from 'next/server';

// 重试函数
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10秒超时
      });
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`DexScreener API attempt ${i + 1} failed:`, error);
      
      // 如果不是最后一次重试，等待一段时间再重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
      }
    }
  }
  
  throw lastError!;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    // 调用DexScreener API，带重试机制
    const response = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradeBotApp/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`DexScreener API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // 验证返回的数据
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response data from DexScreener');
    }
    
    // 返回数据，添加CORS头
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=30', // 缓存30秒
      },
    });
    
  } catch (error) {
    console.error('DexScreener proxy error:', error);
    
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('AbortError');
    const isNetworkError = errorMessage.includes('fetch failed') || errorMessage.includes('SocketError');
    
    let userMessage = 'Failed to fetch data from DexScreener';
    if (isTimeout) {
      userMessage = 'Request timeout - DexScreener API is slow to respond';
    } else if (isNetworkError) {
      userMessage = 'Network connection error - please try again';
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 