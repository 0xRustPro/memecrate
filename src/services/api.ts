// Get API URL from environment or use default
// In development, try to detect if backend is running on a different port
const getApiUrl = (): string => {
  // First check environment variable (highest priority)
  if ((import.meta as any).env?.VITE_API_URL) {
    const apiUrl = (import.meta as any).env.VITE_API_URL as string;
    console.log('Using VITE_API_URL from environment:', apiUrl);
    return apiUrl;
  }
  
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    // Server-side rendering or build time - use default
    return 'http://localhost:3001';
  }
  
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol; // 'http:' or 'https:'
  const isProduction = currentHost !== 'localhost' && currentHost !== '127.0.0.1';
  
  // If running on localhost (development), backend should be on localhost:3001
  if (!isProduction) {
    return 'http://localhost:3001';
  }
  
  // For production (Vercel, etc.), use same protocol as frontend
  // If frontend is HTTPS, backend should also be HTTPS
  const protocol = currentProtocol === 'https:' ? 'https:' : 'http:';
  
  // Option 1: Use relative URL (recommended if backend is on same domain)
  if ((import.meta as any).env?.VITE_USE_RELATIVE_API === 'true') {
    return ''; // Empty string means relative URLs (uses same protocol as frontend)
  }
  
  // Option 2: Use custom backend host from environment
  const backendHost = (import.meta as any).env?.VITE_BACKEND_HOST;
  if (backendHost) {
    const backendPort = (import.meta as any).env?.VITE_BACKEND_PORT || '';
    return `${protocol}//${backendHost}${backendPort ? `:${backendPort}` : ''}`;
  }
  
  // Option 3: Default - use same host as frontend (not recommended for production)
  // This assumes backend is on the same domain, which is usually not the case
  // Better to set VITE_API_URL or VITE_BACKEND_HOST
  console.warn('⚠️ No backend URL configured. Using same host as frontend. Set VITE_API_URL or VITE_BACKEND_HOST in production.');
  return `${protocol}//${currentHost}:3001`;
};

const API_URL = getApiUrl();
console.log('API URL configured as:', API_URL);

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: any;
}

export interface CreateCrateRequest {
  investmentAmount: number;
  theme: string;
  numCoins: 2 | 4 | 6 | 8;
  splitType: 'equal' | 'random';
  userPublicKey: string;
  tokens: Array<{
    mintAddress: string;
    tokenName: string;
    tokenImage?: string;
    buyAmountSol: number;
  }>;
}

export interface CreateCrateResponse {
  success: boolean;
  generatedWalletPublicKey: string;
  tokens: Array<{
    mintAddress: string;
    tokenName: string;
    tokenImage?: string;
    buyAmountSol: number;
  }>;
  totalInvestmentSol: number;
  purchaseId: string;
}

export interface RerollCoinsRequest {
  crateId: number;
  slotIndices: number[];
  userPublicKey: string;
}

export interface RerollCoinsResponse {
  success: boolean;
  transactionInstruction: {
    programId: string;
    keys: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: number[];
  };
  accounts: any;
  feePaid: number;
}

export interface SellCrateRequest {
  crateId: number;
  expectedReturn: number;
  userPublicKey: string;
}

export interface SellCrateResponse {
  success: boolean;
  transactionInstruction: {
    programId: string;
    keys: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: number[];
  };
  accounts: any;
  userReturn: number;
  exitFee: number;
  roi: number;
}

export interface PortfolioResponse {
  success: boolean;
  crates: any[];
  totalInvestment: number;
  totalValue: number;
  totalROI: number;
}

export interface PortfolioToken {
  category: string;
  name: string;
  address: string;
  image: string;
  purchaseId?: string;
  purchasedAt?: number;
  buyAmountSol?: number;
}

export interface GameStatsResponse {
  success: boolean;
  totalCratesCreated: number;
  totalVolume: number;
  activeCrates: number;
}

export interface Category {
  id: string;
  name: string;
  displayName: string;
  description: string;
  image: string;
  icon: string;
  color: string;
  poolSize: number;
  contractTheme: string;
}

export interface CategoriesResponse {
  success: boolean;
  categories: Category[];
}

export interface Token {
  category: string;
  name: string;
  address: string;
  image: string;
}

export interface TokensResponse {
  success: boolean;
  tokens: Token[];
  numCoins: number;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Handle relative URLs (when API_URL is empty string)
    const url = API_URL ? `${API_URL}${endpoint}` : endpoint;
    
    console.log('API Request:', url); // Debug log
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async getGameStats(): Promise<GameStatsResponse> {
    return this.request<GameStatsResponse>('/api/game/stats');
  }

  async getCategories(): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>('/api/game/categories');
  }

  async getRandomTokens(numCoins: number, category?: string): Promise<TokensResponse> {
    return this.request<TokensResponse>('/api/game/tokens', {
      method: 'POST',
      body: JSON.stringify({
        numCoins,
        category: category || 'celebrities'
      }),
    });
  }

  async getFirstTokens(numCoins: number, category?: string): Promise<TokensResponse> {
    const query = `?category=${encodeURIComponent(category || 'celebrities')}&numCoins=${numCoins}`;
    return this.request<TokensResponse>(`/api/game/tokens/first${query}`);
  }

  async cacheTokens(userPublicKey: string, category: string, numCoins: number): Promise<TokensResponse> {
    return this.request<TokensResponse>('/api/game/tokens/cache', {
      method: 'POST',
      body: JSON.stringify({
        userPublicKey,
        category,
        numCoins
      }),
    });
  }

  async getCachedTokens(userPublicKey: string, category: string, numCoins: number): Promise<TokensResponse & { fromCache: boolean }> {
    const query = `?userPublicKey=${encodeURIComponent(userPublicKey)}&category=${encodeURIComponent(category)}&numCoins=${numCoins}`;
    return this.request<TokensResponse & { fromCache: boolean }>(`/api/game/tokens/cached${query}`);
  }

  async rerollSingleToken(userPublicKey: string, category: string, tokenIndex: number, currentTokens: any[]): Promise<{
    success: boolean;
    token: {
      category: string;
      name: string;
      address: string;
      image: string;
    };
    tokenIndex: number;
  }> {
    return this.request('/api/game/tokens/reroll-single', {
      method: 'POST',
      body: JSON.stringify({
        userPublicKey,
        category,
        tokenIndex,
        currentTokens
      }),
    });
  }

  async executePurchase(generatedWalletPublicKey: string, userPublicKey?: string): Promise<{
    success: boolean;
    status: string;
    purchaseResults: Array<{
      mintAddress: string;
      tokenName: string;
      status: string;
      signature?: string;
      transactionUrl?: string;
      error?: string;
      buyAmountSol?: number;
    }>;
    totalTokens: number;
    successfulPurchases: number;
    failedPurchases: number;
  }> {
    return this.request('/api/game/execute-purchase', {
      method: 'POST',
      body: JSON.stringify({
        generatedWalletPublicKey,
        userPublicKey,
      }),
    });
  }

  async createCrate(request: CreateCrateRequest): Promise<CreateCrateResponse> {
    return this.request<CreateCrateResponse>('/api/game/create-crate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async notifySolSent(generatedWalletPublicKey: string, userPublicKey?: string, transactionSignature?: string): Promise<{
    success: boolean;
    message: string;
    walletAddress: string;
    status: string;
  }> {
    return this.request('/api/game/notify-sol-sent', {
      method: 'POST',
      body: JSON.stringify({
        generatedWalletPublicKey,
        userPublicKey,
        transactionSignature,
      }),
    });
  }

  async submitSignedTransaction(
    signedTransaction: string,
    blockhash: string,
    lastValidBlockHeight: number,
    purchaseId?: string,
    rerollCount?: number
  ): Promise<{
    success: boolean;
    signature: string;
    message: string;
    tokenPurchases?: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    return this.request('/api/game/submit-signed-transaction', {
      method: 'POST',
      body: JSON.stringify({
        signedTransaction,
        blockhash,
        lastValidBlockHeight,
        purchaseId,
        rerollCount,
      }),
    });
  }

  async rerollCoins(request: RerollCoinsRequest): Promise<RerollCoinsResponse> {
    return this.request<RerollCoinsResponse>('/api/game/reroll-coins', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async confirmCrate(
    crateId: number,
    userPublicKey: string
  ): Promise<{ success: boolean; transactionInstruction: any; accounts: any }> {
    return this.request(
      `/api/game/confirm-crate/${crateId}`,
      {
        method: 'POST',
        body: JSON.stringify({ userPublicKey }),
      }
    );
  }

  async sellCrate(request: SellCrateRequest): Promise<SellCrateResponse> {
    return this.request<SellCrateResponse>('/api/game/sell-crate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPortfolio(userPublicKey: string): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(
      `/api/game/portfolio/${userPublicKey}`
    );
  }

  async getPortfolioTokens(userPublicKey: string, category?: string): Promise<{
    success: boolean;
    tokens: PortfolioToken[];
  }> {
    const query = category ? `?userPublicKey=${encodeURIComponent(userPublicKey)}&category=${encodeURIComponent(category)}` : `?userPublicKey=${encodeURIComponent(userPublicKey)}`;
    return this.request(`/api/game/portfolio-tokens${query}`);
  }

  async getUserWallet(userPublicKey: string): Promise<{
    success: boolean;
    wallet: {
      userPublicKey: string;
      generatedWalletPublicKey: string;
      createdAt: number;
      tokenPurchases: Array<{
        purchaseId: string;
        category?: string;
        initialInvestment?: number;
        tokens: Array<{
          mintAddress: string;
          tokenName: string;
          tokenImage?: string;
          buyAmountSol: number;
          tokenAmount?: string;
        }>;
        totalInvested?: string;
        totalCurrentValue?: string;
        totalPnlValue?: string;
        totalPnlPercent?: string;
        isPositive?: boolean;
        hasCompleteTokens?: boolean;
        error?: string;
      }>;
    } | null;
  }> {
    return this.request(`/api/game/wallet/${userPublicKey}`);
  }

  async getUserBalance(userPublicKey: string): Promise<{
    success: boolean;
    balance: number;
  }> {
    return this.request(`/api/game/balance/${userPublicKey}`);
  }

  async getCrateDetails(cratePDA: string): Promise<{
    success: boolean;
    crate: any;
  }> {
    return this.request(`/api/game/crate/${cratePDA}`);
  }

  async saveCrateData(data: {
    crateId: number;
    cratePDA: string;
    userPublicKey: string;
    investmentAmount: number;
    theme: string;
    numCoins: number;
    splitType: string;
    coins: Array<{ coinId: number; allocation: number }>;
    tokens: Array<{ name: string; address: string; image: string; category: string }>;
    transactionSignature: string;
  }): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/game/save-crate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSolPrice(): Promise<{
    success: boolean;
    price: number;
    currency: string;
  }> {
    return this.request('/api/game/sol-price');
  }

  async convertSolToUsd(solAmount: number): Promise<{
    success: boolean;
    solAmount: number;
    usdAmount: number;
    price: number;
  }> {
    return this.request('/api/game/sol-to-usd', {
      method: 'POST',
      body: JSON.stringify({ solAmount }),
    });
  }

  async cashout(userPublicKey: string, purchaseId: string): Promise<{
    success: boolean;
    signature?: string;
    totalSolReceived?: number;
    feeAmount?: number;
    userAmount?: number;
    message?: string;
  }> {
    return this.request('/api/game/cashout', {
      method: 'POST',
      body: JSON.stringify({ userPublicKey, purchaseId }),
    });
  }

  async getTokensPnl(purchaseId: string): Promise<{
    success: boolean;
    purchaseId: string;
    tokens: Array<{
      tokenName: string;
      mintAddress: string;
      tokenImage?: string;
      invested: string;
      currentValue: string;
      pnl: string;
      pnlValue: string;
      isPositive: boolean;
      isComplete?: boolean;
      error?: string;
    }>;
  }> {
    return this.request(`/api/game/tokens-pnl/${purchaseId}`);
  }
}

export const apiService = new ApiService();

