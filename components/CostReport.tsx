'use client';

import { CostEstimateReport } from '@/types';
import { formatCurrency, formatCurrencyRange, formatDate, extractDomain } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CostReportProps {
  report: CostEstimateReport;
  onBack: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function CostReport({ report, onBack }: CostReportProps) {
  const { summary, tuition, livingCosts, otherCosts, userInput, recommendations, sources } = report;

  // 准备饼图数据
  const pieData = [
    { name: '学费', value: summary.breakdown.tuition, color: COLORS[0] },
    { name: '生活费', value: summary.breakdown.living, color: COLORS[1] },
    { name: '其他费用', value: summary.breakdown.other, color: COLORS[2] },
  ];

  // 准备柱状图数据
  const barData = [
    { category: '住宿', amount: livingCosts.accommodation.amount, range: `${livingCosts.accommodation.range.min}-${livingCosts.accommodation.range.max}` },
    { category: '饮食', amount: livingCosts.food.amount, range: `${livingCosts.food.range.min}-${livingCosts.food.range.max}` },
    { category: '交通', amount: livingCosts.transportation.amount, range: `${livingCosts.transportation.range.min}-${livingCosts.transportation.range.max}` },
    { category: '娱乐', amount: livingCosts.entertainment.amount, range: `${livingCosts.entertainment.range.min}-${livingCosts.entertainment.range.max}` },
    { category: '其他', amount: livingCosts.miscellaneous.amount, range: `${livingCosts.miscellaneous.range.min}-${livingCosts.miscellaneous.range.max}` },
  ];

  const downloadPDF = () => {
    // TODO: 实现PDF下载功能
    alert('PDF下载功能将在后续版本中实现');
  };

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

      {/* 报告标题 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">留学费用估算报告</h1>
          <p className="text-lg text-gray-600">
            {userInput.university} • {userInput.program} • {userInput.level === 'undergraduate' ? '本科' : '硕士'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            报告生成时间：{formatDate(new Date(report.generatedAt))}
          </p>
        </div>
      </div>

      {/* 费用总览 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">费用总览</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">年度总费用</h3>
            <p className="text-3xl font-bold text-blue-900">
              {formatCurrency(summary.totalAnnualCost.amount, summary.currency)}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {formatCurrencyRange(summary.totalAnnualCost.range.min, summary.totalAnnualCost.range.max, summary.currency)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-green-800 mb-2">月度费用</h3>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(summary.totalMonthlyCost.amount, summary.currency)}
            </p>
            <p className="text-sm text-green-700 mt-1">
              {formatCurrencyRange(summary.totalMonthlyCost.range.min, summary.totalMonthlyCost.range.max, summary.currency)}
            </p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">学费</h3>
            <p className="text-2xl font-bold text-yellow-900">
              {formatCurrency(tuition.amount, tuition.currency)}
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              {tuition.isEstimate ? '估算值' : '官方数据'}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">生活费(月)</h3>
            <p className="text-2xl font-bold text-purple-900">
              {formatCurrency(livingCosts.total.amount, livingCosts.currency)}
            </p>
            <p className="text-sm text-purple-700 mt-1">
              {formatCurrencyRange(livingCosts.total.range.min, livingCosts.total.range.max, livingCosts.currency)}
            </p>
          </div>
        </div>

        {/* 费用分布饼图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">年度费用分布</h3>
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

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">生活费明细 (月度)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), livingCosts.currency)} />
                <Bar dataKey="amount" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 详细费用明细 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 学费详情 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">学费详情</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">项目学费</span>
              <span className="font-semibold">{formatCurrency(tuition.amount, tuition.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">计费周期</span>
              <span>{tuition.period === 'annual' ? '年度' : '学期'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">数据来源</span>
              <a
                href={tuition.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                {extractDomain(tuition.source)}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">数据状态</span>
              <span className={tuition.isEstimate ? 'text-yellow-600' : 'text-green-600'}>
                {tuition.isEstimate ? '估算数据' : '官方数据'}
              </span>
            </div>
          </div>
        </div>

        {/* 其他费用详情 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">其他费用</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">申请费</span>
              <span className="font-semibold">{formatCurrency(otherCosts.applicationFee.amount, otherCosts.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">签证费</span>
              <span className="font-semibold">{formatCurrency(otherCosts.visaFee.amount, otherCosts.currency)}</span>
            </div>
            {otherCosts.healthInsurance && (
              <div className="flex justify-between">
                <span className="text-gray-600">健康保险</span>
                <span className="font-semibold">{formatCurrency(otherCosts.healthInsurance.amount, otherCosts.currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 个性化建议 */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">个性化省钱建议</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据来源 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">数据来源</h3>
        <div className="space-y-2">
          {sources.map((source, index) => (
            <div key={index}>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                {extractDomain(source)}
              </a>
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