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

// 英国热门大学数据
export const UK_UNIVERSITIES: UniversityData[] = [
  { name: "University of Oxford", country: "UK", city: "Oxford", programs: ["Law", "Medicine", "Business", "Engineering"], website: "https://www.ox.ac.uk" },
  { name: "University of Cambridge", country: "UK", city: "Cambridge", programs: ["Law", "Medicine", "Engineering", "Business"], website: "https://www.cam.ac.uk" },
  { name: "Imperial College London", country: "UK", city: "London", programs: ["Engineering", "Medicine", "Business", "Science"], website: "https://www.imperial.ac.uk" },
  { name: "University College London", country: "UK", city: "London", programs: ["Medicine", "Law", "Business", "Arts"], website: "https://www.ucl.ac.uk" },
  { name: "London School of Economics", country: "UK", city: "London", programs: ["Economics", "Business", "Law", "Politics"], website: "https://www.lse.ac.uk" },
  { name: "University of Edinburgh", country: "UK", city: "Edinburgh", programs: ["Engineering", "Medicine", "Business", "Arts"], website: "https://www.ed.ac.uk" },
  { name: "King's College London", country: "UK", city: "London", programs: ["Medicine", "Law", "Business", "Liberal Arts"], website: "https://www.kcl.ac.uk" },
  { name: "University of Manchester", country: "UK", city: "Manchester", programs: ["Engineering", "Business", "Medicine", "Science"], website: "https://www.manchester.ac.uk" },
  { name: "University of Bristol", country: "UK", city: "Bristol", programs: ["Engineering", "Medicine", "Business", "Law"], website: "https://www.bristol.ac.uk" },
  { name: "University of Warwick", country: "UK", city: "Coventry", programs: ["Business", "Engineering", "Economics", "Mathematics"], website: "https://warwick.ac.uk" }
];

// 加拿大热门大学数据
export const CA_UNIVERSITIES: UniversityData[] = [
  { name: "University of Toronto", country: "CA", city: "Toronto", programs: ["Medicine", "Engineering", "Business", "Law"], website: "https://www.utoronto.ca" },
  { name: "University of British Columbia", country: "CA", city: "Vancouver", programs: ["Business", "Engineering", "Medicine", "Forestry"], website: "https://www.ubc.ca" },
  { name: "University of Alberta", country: "CA", city: "Edmonton", programs: ["Engineering", "Business", "Medicine", "Science"], website: "https://www.ualberta.ca" },
  { name: "McGill University", country: "CA", city: "Montreal", programs: ["Medicine", "Engineering", "Business", "Law"], website: "https://www.mcgill.ca" },
  { name: "University of Waterloo", country: "CA", city: "Waterloo", programs: ["Engineering", "Computer Science", "Mathematics", "Business"], website: "https://uwaterloo.ca" },
  { name: "University of Calgary", country: "CA", city: "Calgary", programs: ["Engineering", "Business", "Medicine", "Science"], website: "https://www.ucalgary.ca" },
  { name: "University of Ottawa", country: "CA", city: "Ottawa", programs: ["Law", "Engineering", "Business", "Medicine"], website: "https://www.uottawa.ca" },
  { name: "Simon Fraser University", country: "CA", city: "Burnaby", programs: ["Business", "Engineering", "Communication", "Science"], website: "https://www.sfu.ca" },
  { name: "University of Montreal", country: "CA", city: "Montreal", programs: ["Medicine", "Engineering", "Business", "Law"], website: "https://www.umontreal.ca" },
  { name: "Western University", country: "CA", city: "London", programs: ["Business", "Engineering", "Medicine", "Law"], website: "https://www.uwo.ca" }
];

// 德国热门大学数据
export const DE_UNIVERSITIES: UniversityData[] = [
  { name: "Technical University of Munich", country: "DE", city: "Munich", programs: ["Engineering", "Business", "Medicine", "Science"], website: "https://www.tum.de" },
  { name: "University of Munich", country: "DE", city: "Munich", programs: ["Medicine", "Law", "Business", "Philosophy"], website: "https://www.lmu.de" },
  { name: "University of Heidelberg", country: "DE", city: "Heidelberg", programs: ["Medicine", "Law", "Business", "Science"], website: "https://www.uni-heidelberg.de" },
  { name: "Humboldt University of Berlin", country: "DE", city: "Berlin", programs: ["Law", "Business", "Philosophy", "Medicine"], website: "https://www.hu-berlin.de" },
  { name: "Free University of Berlin", country: "DE", city: "Berlin", programs: ["Law", "Business", "Philosophy", "Medicine"], website: "https://www.fu-berlin.de" },
  { name: "University of Bonn", country: "DE", city: "Bonn", programs: ["Mathematics", "Law", "Business", "Philosophy"], website: "https://www.uni-bonn.de" },
  { name: "University of Hamburg", country: "DE", city: "Hamburg", programs: ["Business", "Law", "Maritime Studies", "Engineering"], website: "https://www.uni-hamburg.de" },
  { name: "University of Cologne", country: "DE", city: "Cologne", programs: ["Business", "Law", "Economics", "Philosophy"], website: "https://www.uni-koeln.de" },
  { name: "RWTH Aachen University", country: "DE", city: "Aachen", programs: ["Engineering", "Business", "Science", "Mathematics"], website: "https://www.rwth-aachen.de" },
  { name: "University of Stuttgart", country: "DE", city: "Stuttgart", programs: ["Engineering", "Business", "Architecture", "Computer Science"], website: "https://www.uni-stuttgart.de" }
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
  { name: "Adelaide", country: "AU", state: "South Australia", avgCostOfLiving: 2100, currency: "AUD" },
  
  // 英国城市
  { name: "London", country: "UK", state: "England", avgCostOfLiving: 3500, currency: "GBP" },
  { name: "Oxford", country: "UK", state: "England", avgCostOfLiving: 2800, currency: "GBP" },
  { name: "Cambridge", country: "UK", state: "England", avgCostOfLiving: 2900, currency: "GBP" },
  { name: "Edinburgh", country: "UK", state: "Scotland", avgCostOfLiving: 2500, currency: "GBP" },
  { name: "Manchester", country: "UK", state: "England", avgCostOfLiving: 2200, currency: "GBP" },
  { name: "Bristol", country: "UK", state: "England", avgCostOfLiving: 2300, currency: "GBP" },
  { name: "Coventry", country: "UK", state: "England", avgCostOfLiving: 2000, currency: "GBP" },
  
  // 加拿大城市
  { name: "Toronto", country: "CA", state: "Ontario", avgCostOfLiving: 3000, currency: "CAD" },
  { name: "Vancouver", country: "CA", state: "British Columbia", avgCostOfLiving: 3200, currency: "CAD" },
  { name: "Montreal", country: "CA", state: "Quebec", avgCostOfLiving: 2500, currency: "CAD" },
  { name: "Calgary", country: "CA", state: "Alberta", avgCostOfLiving: 2800, currency: "CAD" },
  { name: "Edmonton", country: "CA", state: "Alberta", avgCostOfLiving: 2600, currency: "CAD" },
  { name: "Ottawa", country: "CA", state: "Ontario", avgCostOfLiving: 2700, currency: "CAD" },
  { name: "Waterloo", country: "CA", state: "Ontario", avgCostOfLiving: 2400, currency: "CAD" },
  { name: "Burnaby", country: "CA", state: "British Columbia", avgCostOfLiving: 2600, currency: "CAD" },
  { name: "London", country: "CA", state: "Ontario", avgCostOfLiving: 2300, currency: "CAD" },
  
  // 德国城市
  { name: "Munich", country: "DE", state: "Bavaria", avgCostOfLiving: 1800, currency: "EUR" },
  { name: "Berlin", country: "DE", state: "Berlin", avgCostOfLiving: 1600, currency: "EUR" },
  { name: "Heidelberg", country: "DE", state: "Baden-Württemberg", avgCostOfLiving: 1500, currency: "EUR" },
  { name: "Bonn", country: "DE", state: "North Rhine-Westphalia", avgCostOfLiving: 1400, currency: "EUR" },
  { name: "Hamburg", country: "DE", state: "Hamburg", avgCostOfLiving: 1700, currency: "EUR" },
  { name: "Cologne", country: "DE", state: "North Rhine-Westphalia", avgCostOfLiving: 1500, currency: "EUR" },
  { name: "Aachen", country: "DE", state: "North Rhine-Westphalia", avgCostOfLiving: 1300, currency: "EUR" },
  { name: "Stuttgart", country: "DE", state: "Baden-Württemberg", avgCostOfLiving: 1600, currency: "EUR" }
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
  },
  UK: {
    dormitory: 700,
    shared: 800,
    studio: 1200,
    apartment: 1600
  },
  CA: {
    dormitory: 750,
    shared: 900,
    studio: 1300,
    apartment: 1700
  },
  DE: {
    dormitory: 400,
    shared: 500,
    studio: 700,
    apartment: 900
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
  },
  UK: {
    tier4: 475, // Tier 4学生签证
    source: "https://www.gov.uk/student-visa"
  },
  CA: {
    study: 150, // 学习许可
    source: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html"
  },
  DE: {
    national: 75, // 国家签证
    source: "https://www.auswaertiges-amt.de/en/einreiseundaufenthalt/visaformular/-/2292840"
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
export const REPORT_MODEL = "openai/gpt-4o";