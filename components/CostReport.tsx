'use client';

import { useState } from 'react';
import { CostEstimateReport } from '@/types';
import { formatCurrency, formatCurrencyRange, formatDate, extractDomain, ensureUrlProtocol } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { openRouterClient } from '@/lib/openrouter';
import ReactMarkdown from 'react-markdown';

interface CostReportProps {
  report: CostEstimateReport;
  onBack: () => void;
}

interface DetailedRecommendation {
  id: string;
  title: string;
  description: string;
  details: string;
  isLoading: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function CostReport({ report, onBack }: CostReportProps) {
  const { summary, tuition, livingCosts, otherCosts, userInput, recommendations, sources } = report;
  const [showTuitionDetails, setShowTuitionDetails] = useState(false);
  const [showLivingCostDetails, setShowLivingCostDetails] = useState(false);
  const [showOtherCostsDetails, setShowOtherCostsDetails] = useState(false);
  const [detailedRecommendations, setDetailedRecommendations] = useState<{[key: string]: DetailedRecommendation}>({});

  // Prepare pie chart data - separating accommodation from other living costs
  const pieData = [
    { name: '学费', value: summary.breakdown.tuition, color: COLORS[0] },
    { 
      name: '住宿费', 
      value: (livingCosts.accommodation?.monthlyRange?.min || 0) * (tuition.programDuration || 1), 
      color: COLORS[1] 
    },
    { 
      name: '生活费', 
      value: summary.breakdown.living * (tuition.programDuration || 1), 
      color: COLORS[2] 
    },
    { name: '其他费用', value: summary.breakdown.other, color: COLORS[3] },
  ];

  // Prepare simplified bar chart data - only showing accommodation vs non-accommodation living costs
  const barData = [
    { 
      category: '住宿费', 
      amount: livingCosts.accommodation?.monthlyRange?.min || 0,
      range: `${livingCosts.accommodation?.monthlyRange?.min || 0}-${livingCosts.accommodation?.monthlyRange?.max || 0}`,
      source: livingCosts.accommodation?.source || ''
    },
    { 
      category: '生活费（不含住宿）', 
      amount: livingCosts.total?.amount || 0, 
      range: `${livingCosts.total?.range?.min || 0}-${livingCosts.total?.range?.max || 0}`,
      source: livingCosts.sources?.[0] || ''
    }
  ];

  const downloadPDF = () => {
    // TODO: 实现PDF下载功能
    alert('PDF下载功能将在后续版本中实现');
  };

  const getDetailedRecommendation = async (index: number) => {
    const recommendationId = `rec-${index}`;
    
    // 如果已经获取过详细信息且不是加载状态，直接返回
    if (detailedRecommendations[recommendationId] && !detailedRecommendations[recommendationId].isLoading) {
      return;
    }

    // 设置加载状态
    setDetailedRecommendations(prev => ({
      ...prev,
      [recommendationId]: {
        id: recommendationId,
        title: `建议详情`,
        description: recommendations[index],
        details: '',
        isLoading: true
      }
    }));

    try {
      // 构建提示词给AI生成详细建议
      const prompt = `作为一名留学费用规划专家，请为以下建议方向提供详细说明：

用户情况：
- 学校：${userInput.university}
- 专业：${userInput.program}
- 学位：${userInput.level === 'undergraduate' ? '本科' : '硕士'}
- 国家：${userInput.country}
- 城市：${userInput.city || '未知'}
- 生活方式：${userInput.lifestyle === 'economy' ? '经济型' : userInput.lifestyle === 'comfortable' ? '舒适型' : '标准型'}
- 住宿偏好：${userInput.accommodation === 'dormitory' ? '宿舍' : userInput.accommodation === 'apartment' ? '公寓' : '其他'}

建议方向：${recommendations[index]}

请提供：
1. 详细解释该建议的背景和重要性
2. 具体实施步骤（3-5个步骤）
3. 预期节省金额范围（如果适用）
4. 注意事项和潜在风险
5. 相关资源链接（如果有）

请用中文回复，内容要具体、实用，避免空泛的建议。`;

      // 调用AI生成详细建议
      const response = await openRouterClient.chat({
        model: 'openai/gpt-4o', // 使用指定模型
        messages: [
          {
            role: 'system',
            content: '你是一位专业的留学费用规划顾问，擅长为留学生提供个性化、实用的费用节省建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      // 更新详细建议
      setDetailedRecommendations(prev => ({
        ...prev,
        [recommendationId]: {
          id: recommendationId,
          title: `建议详情`,
          description: recommendations[index],
          details: response,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error('Failed to fetch detailed recommendation:', error);
      // 错误处理
      setDetailedRecommendations(prev => ({
        ...prev,
        [recommendationId]: {
          id: recommendationId,
          title: `建议详情`,
          description: recommendations[index],
          details: '获取详细建议时出现错误，请稍后重试。',
          isLoading: false
        }
      }));
    }
  };

  const handleBarClick = (data: any, index: number) => {
    const item = barData[index];
    if (item.source) {
      const url = ensureUrlProtocol(item.source);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 计算最大开销项
  const getMaxExpenseItem = () => {
    const items = [
      { name: '学费', value: summary.breakdown.tuition },
      { name: '生活费', value: summary.breakdown.living },
      { name: '其他费用', value: summary.breakdown.other }
    ];
    
    return items.reduce((max, item) => item.value > max.value ? item : max);
  };

  const maxExpenseItem = getMaxExpenseItem();
  const maxExpensePercentage = Math.round((maxExpenseItem.value / summary.totalCost.amount) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 头部操作 */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <span>←</span>
          <span>重新计算</span>
        </button>
        <button
          onClick={downloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          下载PDF报告
        </button>
      </div>

      {/* 区块1: 报告身份区 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {userInput.university} - {userInput.program} {userInput.level === 'undergraduate' ? '本科' : '硕士'}
          </h1>
          <p className="text-lg text-gray-600 mb-4">留学费用估算报告</p>
          
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {userInput.country === 'US' ? '🇺🇸 美国' : '🇦🇺 澳大利亚'}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {userInput.level === 'undergraduate' ? '🎓 本科' : '🎓 硕士'}
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {userInput.lifestyle === 'economy' ? '💰 经济型消费' : userInput.lifestyle === 'comfortable' ? '💰 舒适型消费' : '💰 标准型消费'}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {userInput.accommodation === 'dormitory' ? '🏠 校内宿舍' : '🏠 校外合租'}
            </span>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            报告生成时间：{formatDate(new Date(report.generatedAt))}
          </p>
        </div>
      </div>

      {/* 区块2: 核心指标区 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 总花费 */}
          <div className="border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-2">总花费</p>
            <p className="text-4xl font-bold text-gray-900 mb-2">
              {formatCurrency(summary.totalCost.amount, summary.currency)}
            </p>
            <p className="text-gray-600 text-sm">
              估算范围: {formatCurrencyRange(summary.totalCost.range.min, summary.totalCost.range.max, summary.currency)}
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800">
                💼
              </span>
            </div>
          </div>

          {/* 年度总估算费用 */}
          <div className="border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-2">年度总估算费用</p>
            <p className="text-4xl font-bold text-gray-900 mb-2">
              {formatCurrency(summary.totalAnnualCost.amount, summary.currency)}
            </p>
            <p className="text-gray-600 text-sm">
              估算范围: {formatCurrencyRange(summary.totalAnnualCost.range.min, summary.totalAnnualCost.range.max, summary.currency)}
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800">
                💰
              </span>
            </div>
          </div>

          {/* 月度平均支出 */}
          <div className="border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-2">月度平均支出</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(summary.totalMonthlyCost.amount, summary.currency)}
            </p>
            <p className="text-gray-600 text-sm">
              估算范围: {formatCurrencyRange(summary.totalMonthlyCost.range.min, summary.totalMonthlyCost.range.max, summary.currency)}
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800">
                📊
              </span>
            </div>
          </div>

          {/* 费用洞察 */}
          <div className="border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-2">最大开销</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {maxExpenseItem.name}
            </p>
            <p className="text-gray-600 text-sm">
              占总花费 {maxExpensePercentage}%
            </p>
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800">
                🎓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 区块3: 费用构成区 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 总花费支出饼图 */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">总花费支出</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), summary.currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 月度生活费构成条形图 */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">您的月度生活成本构成</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), livingCosts.currency)} />
                <Bar 
                  dataKey="amount" 
                  fill="#10B981" 
                  onClick={handleBarClick}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 区块4: 数据明细区 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">数据明细</h2>
        
        {/* 学费明细表格 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">学费明细</h3>
            <button 
              onClick={() => setShowTuitionDetails(!showTuitionDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showTuitionDetails ? '收起详情' : '查看详情'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">费用项目</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目时长</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据来源</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">项目总学费</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(tuition.total, tuition.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tuition.programDuration ? `${tuition.programDuration}年` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tuition.source ? (
                      <a 
                        href={ensureUrlProtocol(tuition.source)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(tuition.source) || tuition.source}
                      </a>
                    ) : (
                      <span className="text-gray-500">无来源信息</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {showTuitionDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">学费详情</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">数据状态</p>
                  <p className={tuition.isEstimate ? 'text-yellow-600' : 'text-green-600'}>
                    {tuition.isEstimate ? '估算数据' : '官方数据'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">置信度</p>
                  <p className="text-gray-900">
                    {tuition.confidence ? `${(tuition.confidence * 100).toFixed(0)}%` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">最后更新</p>
                  <p className="text-gray-900">{tuition.lastUpdated ? formatDate(new Date(tuition.lastUpdated)) : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 一次性费用明细表格 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">一次性费用明细</h3>
            <button 
              onClick={() => setShowOtherCostsDetails(!showOtherCostsDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showOtherCostsDetails ? '收起详情' : '查看详情'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">费用项目</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据来源</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">申请费</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(otherCosts.applicationFee.amount, otherCosts.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {otherCosts.applicationFee.source ? (
                      <a 
                        href={ensureUrlProtocol(otherCosts.applicationFee.source)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(otherCosts.applicationFee.source) || otherCosts.applicationFee.source}
                      </a>
                    ) : (
                      <span className="text-gray-500">无来源信息</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">签证费</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(otherCosts.visaFee.amount, otherCosts.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {otherCosts.visaFee.source ? (
                      <a 
                        href={ensureUrlProtocol(otherCosts.visaFee.source)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(otherCosts.visaFee.source) || otherCosts.visaFee.source}
                      </a>
                    ) : (
                      <span className="text-gray-500">无来源信息</span>
                    )}
                  </td>
                </tr>
                {otherCosts.healthInsurance && (
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">健康保险</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(otherCosts.healthInsurance.amount, otherCosts.currency)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500"></td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {otherCosts.healthInsurance.source ? (
                        <a 
                          href={ensureUrlProtocol(otherCosts.healthInsurance.source)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {extractDomain(otherCosts.healthInsurance.source) || otherCosts.healthInsurance.source}
                        </a>
                      ) : (
                        <span className="text-gray-500">无来源信息</span>
                      )}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">小计</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(
                      tuition.total + 
                      otherCosts.applicationFee.amount + 
                      otherCosts.visaFee.amount + 
                      (otherCosts.healthInsurance?.amount || 0),
                      summary.currency
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {showOtherCostsDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">一次性费用详情</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">费用说明</p>
                  <p className="text-gray-900">这些费用通常只需支付一次，不包含在年度或学期费用中</p>
                </div>
                <div>
                  <p className="text-gray-600">数据置信度</p>
                  <p className="text-gray-900">
                    {otherCosts.applicationFee.confidence ? `申请费: ${(otherCosts.applicationFee.confidence * 100).toFixed(0)}%` : ''}
                    {otherCosts.visaFee.confidence ? ` 签证费: ${(otherCosts.visaFee.confidence * 100).toFixed(0)}%` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 月度生活费明细表格 */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">月度生活成本明细</h3>
            <button 
              onClick={() => setShowLivingCostDetails(!showLivingCostDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showLivingCostDetails ? '收起详情' : '查看详情'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类别</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">估算范围</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据来源</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">住宿费</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrencyRange(livingCosts.accommodation.monthlyRange.min, livingCosts.accommodation.monthlyRange.max, livingCosts.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {userInput.accommodation === 'dormitory' ? '校内宿舍' : 
                     userInput.accommodation === 'shared' ? '校外合租' : 
                     userInput.accommodation === 'studio' ? '单间公寓' : '私人公寓'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {livingCosts.accommodation.source ? (
                      <a 
                        href={ensureUrlProtocol(livingCosts.accommodation.source)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(livingCosts.accommodation.source)}
                      </a>
                    ) : (
                      <span className="text-gray-500">无来源信息</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">生活费（不含住宿）</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrencyRange(livingCosts.total.range.min, livingCosts.total.range.max, livingCosts.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {livingCosts.sources && livingCosts.sources.length > 0 ? (
                      <a 
                        href={ensureUrlProtocol(livingCosts.sources[0])} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(livingCosts.sources[0]) || livingCosts.sources[0]}
                      </a>
                    ) : (
                      <span className="text-gray-500">无来源信息</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">月度总计</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrencyRange(
                      livingCosts.accommodation.monthlyRange.min + livingCosts.total.range.min,
                      livingCosts.accommodation.monthlyRange.max + livingCosts.total.range.max,
                      livingCosts.currency
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                  <td className="px-6 py-4 text-sm text-gray-500"></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {showLivingCostDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">生活费详情</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">数据置信度</p>
                  <p>{livingCosts.confidence ? `${(livingCosts.confidence * 100).toFixed(0)}%` : '无数据'}</p>
                </div>
                <div>
                  <p className="text-gray-600">主要数据来源</p>
                  <p>
                    {livingCosts.sources && livingCosts.sources.length > 0 ? (
                      <a 
                        href={ensureUrlProtocol(livingCosts.sources[0])} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {extractDomain(livingCosts.sources[0]) || livingCosts.sources[0]}
                      </a>
                    ) : '无来源信息'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">城市</p>
                  <p>{userInput.city}, {userInput.country === 'US' ? '美国' : '澳大利亚'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 年度总费用计算说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-gray-900 mb-2">费用计算说明</h3>
          <div className="text-sm text-gray-700">
            <p className="mb-2">
              <strong>年度总费用</strong> = 学费年均 + 12个月生活费
            </p>
            <p className="mb-2">
              计算公式：{formatCurrency(summary.breakdown.tuition / summary.totalCost.duration, summary.currency)} (学费年均) + 
              {formatCurrency(summary.breakdown.living / 12, summary.currency)} × 12 (12个月生活费) = 
              {formatCurrency(summary.totalAnnualCost.amount, summary.currency)}
            </p>
            <p className="mb-2">
              <strong>总花费</strong> = 项目总学费 + 生活费总额 + 一次性费用
            </p>
            <p className="mb-2">
              计算公式：{formatCurrency(tuition.total, summary.currency)} (项目总学费) + 
              {formatCurrency(livingCosts.total.amount, summary.currency)} × 12 × {summary.totalCost.duration} (生活费总额) + 
              {formatCurrency(summary.breakdown.other, summary.currency)} (一次性费用) = 
              {formatCurrency(summary.totalCost.amount, summary.currency)}
            </p>
            <p>
              数据来源：学费数据来自学校官网，生活费数据来自官方统计和实时查询，其他费用基于官方收费标准。
            </p>
          </div>
        </div>
      </div>

      {/* 区块5: 行动建议区 */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">为您的财务规划建言</h2>
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((recommendation, index) => {
              const recommendationId = `rec-${index}`;
              const detailedInfo = detailedRecommendations[recommendationId];

              return (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => getDetailedRecommendation(index)}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-gray-800 flex-1">{recommendation}</p>
                      <span className="text-gray-500 text-sm ml-2">
                        {detailedInfo ? (detailedInfo.isLoading ? '加载中...' : '查看详情') : '点击获取详细建议'}
                      </span>
                    </div>
                    
                    {detailedInfo && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {detailedInfo.isLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                            <span>正在生成详细建议...</span>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-2">{detailedInfo.title}</h4>
                            <div className="text-gray-700 mb-3">
                              <ReactMarkdown
                                components={{
                                  a: ({node, ...props}) => (
                                    <a 
                                      {...props} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    />
                                  )
                                }}
                              >
                                {detailedInfo.details}
                              </ReactMarkdown>
                            </div>
                            <button 
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 移除详细信息
                                const newDetailedRecommendations = { ...detailedRecommendations };
                                delete newDetailedRecommendations[recommendationId];
                                setDetailedRecommendations(newDetailedRecommendations);
                              }}
                            >
                              收起
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 数据来源 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">数据来源</h3>
        <div className="space-y-2">
          {sources.map((source, index) => (
            <div key={index} className="flex items-center">
              <span className="text-gray-500 mr-2">•</span>
              {source.includes('http') ? (
                <a
                  href={ensureUrlProtocol(source)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  {extractDomain(source) || source}
                </a>
              ) : (
                <span className="text-gray-700 text-sm">{source}</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          * 所有数据均来自官方渠道，但可能因时间推移而发生变化。请以官方最新信息为准。
        </p>
      </div>
    </div>
  );
}