import { UniversityData, CityData } from '@/types';

// 美国热门大学数据
export const US_UNIVERSITIES: UniversityData[] = [
  { name: "Harvard University", country: "US", city: "Cambridge", programs: ["Business", "Law", "Medicine", "Engineering", "Liberal Arts"], website: "https://www.harvard.edu" },
  { name: "Stanford University", country: "US", city: "Stanford", programs: ["Computer Science", "Engineering", "Business", "Medicine"], website: "https://www.stanford.edu" },
  { name: "MIT", country: "US", city: "Cambridge", programs: ["Engineering", "Computer Science", "Business", "Science"], website: "https://web.mit.edu" },
  { name: "University of California, Berkeley", country: "US", city: "Berkeley", programs: ["Engineering", "Business", "Law", "Public Policy"], website: "https://www.berkeley.edu" },
  { name: "Columbia University", country: "US", city: "New York", programs: ["Journalism", "Business", "Law", "Medicine"], website: "https://www.columbia.edu" },
  { name: "University of Chicago", country: "US", city: "Chicago", programs: ["Economics", "Business", "Law", "Medicine"], website: "https://www.uchicago.edu" },
  { name: "Yale University", country: "US", city: "New Haven", programs: ["Law", "Medicine", "Business", "Liberal Arts"], website: "https://www.yale.edu" },
  { name: "Princeton University", country: "US", city: "Princeton", programs: ["Engineering", "Public Policy", "Liberal Arts"], website: "https://www.princeton.edu" },
  { name: "UCLA", country: "US", city: "Los Angeles", programs: ["Film", "Business", "Medicine", "Engineering"], website: "https://www.ucla.edu" },
  { name: "NYU", country: "US", city: "New York", programs: ["Business", "Film", "Law", "Arts"], website: "https://www.nyu.edu" }
];

// 澳大利亚热门大学数据
export const AU_UNIVERSITIES: UniversityData[] = [
  { name: "University of Melbourne", country: "AU", city: "Melbourne", programs: ["Medicine", "Law", "Business", "Engineering"], website: "https://www.unimelb.edu.au" },
  { name: "Australian National University", country: "AU", city: "Canberra", programs: ["Politics", "International Relations", "Science", "Engineering"], website: "https://www.anu.edu.au" },
  { name: "University of Sydney", country: "AU", city: "Sydney", programs: ["Medicine", "Law", "Business", "Architecture"], website: "https://www.sydney.edu.au" },
  { name: "University of New South Wales", country: "AU", city: "Sydney", programs: ["Engineering", "Business", "Medicine", "Arts"], website: "https://www.unsw.edu.au" },
  { name: "Monash University", country: "AU", city: "Melbourne", programs: ["Medicine", "Engineering", "Business", "Arts"], website: "https://www.monash.edu" },
  { name: "University of Queensland", country: "AU", city: "Brisbane", programs: ["Medicine", "Engineering", "Business", "Science"], website: "https://www.uq.edu.au" },
  { name: "University of Western Australia", country: "AU", city: "Perth", programs: ["Medicine", "Engineering", "Business", "Science"], website: "https://www.uwa.edu.au" },
  { name: "University of Adelaide", country: "AU", city: "Adelaide", programs: ["Medicine", "Engineering", "Business", "Wine"], website: "https://www.adelaide.edu.au" },
  { name: "Macquarie University", country: "AU", city: "Sydney", programs: ["Business", "Science", "Arts", "Health Sciences"], website: "https://www.mq.edu.au" },
  { name: "RMIT University", country: "AU", city: "Melbourne", programs: ["Design", "Engineering", "Business", "Arts"], website: "https://www.rmit.edu.au" }
];

// 城市数据
export const CITIES: CityData[] = [
  // 美国城市
  { name: "Cambridge", country: "US", state: "Massachusetts", avgCostOfLiving: 3500, currency: "USD" },
  { name: "Stanford", country: "US", state: "California", avgCostOfLiving: 4000, currency: "USD" },
  { name: "Berkeley", country: "US", state: "California", avgCostOfLiving: 3800, currency: "USD" },
  { name: "New York", country: "US", state: "New York", avgCostOfLiving: 4500, currency: "USD" },
  { name: "Chicago", country: "US", state: "Illinois", avgCostOfLiving: 2800, currency: "USD" },
  { name: "New Haven", country: "US", state: "Connecticut", avgCostOfLiving: 2500, currency: "USD" },
  { name: "Princeton", country: "US", state: "New Jersey", avgCostOfLiving: 3200, currency: "USD" },
  { name: "Los Angeles", country: "US", state: "California", avgCostOfLiving: 3600, currency: "USD" },

  // 澳大利亚城市
  { name: "Melbourne", country: "AU", state: "Victoria", avgCostOfLiving: 2800, currency: "AUD" },
  { name: "Canberra", country: "AU", state: "Australian Capital Territory", avgCostOfLiving: 2600, currency: "AUD" },
  { name: "Sydney", country: "AU", state: "New South Wales", avgCostOfLiving: 3200, currency: "AUD" },
  { name: "Brisbane", country: "AU", state: "Queensland", avgCostOfLiving: 2400, currency: "AUD" },
  { name: "Perth", country: "AU", state: "Western Australia", avgCostOfLiving: 2300, currency: "AUD" },
  { name: "Adelaide", country: "AU", state: "South Australia", avgCostOfLiving: 2100, currency: "AUD" }
];

// 生活方式系数
export const LIFESTYLE_MULTIPLIERS = {
  economy: 0.8,    // -20%
  standard: 1.0,   // ±0%
  comfortable: 1.25 // +25%
} as const;

// 住宿类型基础价格 (月租)
export const ACCOMMODATION_BASE_COSTS = {
  US: {
    dormitory: 800,
    shared: 1200,
    studio: 1800,
    apartment: 2400
  },
  AU: {
    dormitory: 600,
    shared: 900,
    studio: 1400,
    apartment: 1800
  }
} as const;

// 签证费用
export const VISA_FEES = {
  US: {
    F1: 350, // 学生签证
    source: "https://travel.state.gov"
  },
  AU: {
    student: 650, // 学生签证子类500
    source: "https://immi.homeaffairs.gov.au"
  }
} as const;

// OpenRouter模型配置
export const OPENROUTER_CONFIG = {
  baseURL: "https://openrouter.ai/api/v1",
  model: "openai/gpt-4o",
  temperature: 0.3,
  max_tokens: 2000
} as const;

// 搜索模型配置
export const SEARCH_MODEL = "openai/gpt-4o-search-preview";

// 报告生成模型配置
export const REPORT_MODEL = "anthropic/claude-3.5-sonnet";