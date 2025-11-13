// 用户输入数据接口
export interface UserInput {
  // 必填字段
  country: 'US' | 'AU';
  university: string;
  program: string;
  level: 'undergraduate' | 'graduate';
  lifestyle: 'economy' | 'standard' | 'comfortable';
  accommodation: 'dormitory' | 'shared' | 'studio' | 'apartment';

  // 选填字段
  diet?: 'normal' | 'vegetarian' | 'halal' | 'kosher' | 'custom';
  transportation?: 'walking' | 'public' | 'bike' | 'car';
  programDuration?: number; // 学制（年）
  city?: string; // 城市信息
}

// 学费数据接口
export interface TuitionData {
  amount: number;              // 总学费金额
  currency: 'USD' | 'AUD';
  period: 'total';             // 总费用，不区分计费方式
  source: string;
  isEstimate: boolean;
  lastUpdated: string;
  confidence?: number;         // 置信度 (0-1)
  programDuration?: number;    // 项目时长（年）
}

// 生活费用数据接口