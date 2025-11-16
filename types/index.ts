// 用户输入数据接口
export interface UserInput {
  // 必填字段
  country: 'US' | 'AU' | 'UK' | 'CA' | 'DE' | 'HK' | 'MO' | 'SG';
  university: string;
  program: string;
  level: 'undergraduate' | 'graduate';
  lifestyle: 'economy' | 'standard' | 'comfortable';
  accommodation: 'dormitory' | 'shared' | 'studio' | 'apartment';
  locationPreference: 'cityCentre' | 'outsideCityCentre'; // 市中心或郊区偏好

  // 选填字段
  diet?: 'normal' | 'vegetarian' | 'halal' | 'kosher' | 'custom';
  transportation?: 'walking' | 'public' | 'bike' | 'car';
  programDuration?: number; // 学制（年）
  city?: string; // 城市信息
}

// 大学数据接口
export interface UniversityData {
  name: string;
  country: 'US' | 'AU' | 'UK' | 'CA' | 'DE' | 'HK' | 'MO' | 'SG';
  city: string;
  programs: string[];
  website: string;
}

// 城市数据接口
export interface CityData {
  name: string;
  country: 'US' | 'AU' | 'UK' | 'CA' | 'DE' | 'HK' | 'MO' | 'SG';
  state: string;
  avgCostOfLiving: number;
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
}

// 学费数据接口
export interface TuitionData {
  total: number;               // 项目总学费金额
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
  source: string;
  isEstimate: boolean;
  lastUpdated: string;
  confidence?: number;         // 置信度 (0-1)
  programDuration: number;     // 项目时长（年）
}

// 住宿费用接口
export interface AccommodationCost {
  monthlyRange: {
    min: number;
    max: number;
  };
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
  source: string;
  confidence?: number;
  reasoning?: string;
}

export interface LivingCosts {
  total: {
    amount: number;
    range: { min: number; max: number };
  };
  accommodation: AccommodationCost;
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
  period: 'monthly';
  sources: string[];
  confidence?: number;
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
  currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
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
    totalCost: {
      amount: number;
      range: { min: number; max: number };
      duration: number;
    };
    currency: 'USD' | 'AUD' | 'GBP' | 'CAD' | 'EUR' | 'HKD' | 'MOP' | 'SGD';
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
  taskId?: string; // 用于轮询的taskId
}

// 估算进度接口
export interface EstimationProgress {
  step: string;
  progress: number;
  message: string;
}