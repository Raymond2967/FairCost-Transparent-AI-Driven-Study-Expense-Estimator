import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化货币
export function formatCurrency(amount: number, currency: 'USD' | 'AUD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 格式化货币范围
export function formatCurrencyRange(min: number, max: number, currency: 'USD' | 'AUD'): string {
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
}

// 计算范围
export function calculateRange(base: number, variance: number = 0.2): { min: number; max: number } {
  return {
    min: Math.round(base * (1 - variance)),
    max: Math.round(base * (1 + variance))
  };
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 计算年度总费用
export function calculateAnnualCost(
  tuitionAnnual: number,
  livingMonthly: number,
  otherCosts: number = 0
): number {
  return tuitionAnnual + (livingMonthly * 12) + otherCosts;
}

// 检查是否为有效的大学URL
export function isValidUniversityUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
           (parsed.hostname.includes('edu') ||
            parsed.hostname.includes('university') ||
            parsed.hostname.includes('college'));
  } catch {
    return false;
  }
}

// 从URL提取域名
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// 格式化日期
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 计算生活成本调整
export function adjustForLifestyle(
  baseCost: number,
  lifestyle: 'economy' | 'standard' | 'comfortable'
): number {
  const multipliers = {
    economy: 0.8,
    standard: 1.0,
    comfortable: 1.25
  };
  return Math.round(baseCost * multipliers[lifestyle]);
}