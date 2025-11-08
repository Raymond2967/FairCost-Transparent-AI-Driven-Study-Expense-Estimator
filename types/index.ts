// 用户输入数据接口
export interface UserInput {
  // 必填字段
  country: 'US' | 'AU';
  university: string;
  program: string;
  city: string;
  level: 'undergraduate' | 'graduate';
  lifestyle: 'economy' | 'standard' | 'comfortable';
  accommodation: 'dormitory' | 'shared' | 'studio' | 'apartment';

  // 选填字段
  diet?: 'normal' | 'vegetarian' | 'halal' | 'kosher' | 'custom';
  transportation?: 'walking' | 'public' | 'bike' | 'car';
}

// 学费数据接口
export interface TuitionData {
  amount: number;
  currency: 'USD' | 'AUD';
  period: 'annual' | 'semester';
  source: string;
  isEstimate: boolean;
  lastUpdated: string;
  confidence?: number; // 置信度 (0-1)
}

// 生活费用数据接口
export interface LivingCosts {
  accommodation: {
    amount: number;
    type: string;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  food: {
    amount: number;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  transportation: {
    amount: number;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  utilities: {
    amount: number;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  entertainment: {
    amount: number;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  miscellaneous: {
    amount: number;
    range: { min: number; max: number };
    source?: string; // 单项来源
  };
  total: {
    amount: number;
    range: { min: number; max: number };
  };
  currency: 'USD' | 'AUD';
  period: 'monthly';
  sources: string[];
  confidence?: number; // 总体置信度 (0-1)
}

// 其他费用接口
export interface OtherCosts {
  applicationFee: {
    amount: number;
    source: string;
    confidence?: number; // 置信度 (0-1)
  };
  visaFee: {
    amount: number;
    source: string;
    confidence?: number; // 置信度 (0-1)
  };
  healthInsurance?: {
    amount: number;
    source: string;
    confidence?: number; // 置信度 (0-1)
  };
  currency: 'USD' | 'AUD';
}

// 完整估算报告接口
export interface CostEstimateReport {
  userInput: UserInput;
  tuition: TuitionData;
  livingCosts: LivingCosts;
  otherCosts: OtherCosts;
  summary: {
    totalAnnualCost: {
      amount: number;
      range: { min: number; max: number };
    };
    totalMonthlyCost: {
      amount: number;
      range: { min: number; max: number };
    };
    currency: 'USD' | 'AUD';
    breakdown: {
      tuition: number;
      living: number;
      other: number;
    };
  };
  recommendations: string[];
  generatedAt: string;
  sources: string[];
}

// API响应接口
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// LLM请求接口
export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

// 估算进度接口
export interface EstimationProgress {
  step: 'tuition' | 'living' | 'other' | 'report' | 'complete';
  progress: number; // 0-100
  message: string;
}

// 大学和城市数据接口
export interface UniversityData {
  name: string;
  country: 'US' | 'AU';
  city: string;
  programs: string[];
  website: string;
}

export interface CityData {
  name: string;
  country: 'US' | 'AU';
  state?: string;
  avgCostOfLiving: number;
  currency: 'USD' | 'AUD';
}

export interface CostSummary {
  totalAnnualCost: {
    amount: number;
    range: {
      min: number;
      max: number;
    };
  };
  totalMonthlyCost: {
    amount: number;
    range: {
      min: number;
      max: number;
    };
  };
  totalCost: {
    amount: number;
    range: {
      min: number;
      max: number;
    };
    duration: number;
  };
  currency: string;
  breakdown: {
    tuition: number;
    living: number;
    other: number;
  };
}
