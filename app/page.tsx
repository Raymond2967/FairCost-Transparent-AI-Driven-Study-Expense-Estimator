'use client';

import { useState } from 'react';
import CostEstimationForm from '@/components/CostEstimationForm';
import CostReport from '@/components/CostReport';
import { UserInput, CostEstimateReport, EstimationProgress } from '@/types';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<CostEstimateReport | null>(null);
  const [progress, setProgress] = useState<EstimationProgress | undefined>();
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (userInput: UserInput) => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      // 启动估算任务
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInput),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const { data: { taskId } } = await response.json();

      // 轮询获取进度
      const pollProgress = async () => {
        const progressResponse = await fetch(`/api/estimate?taskId=${taskId}`);
        const progressData = await progressResponse.json();

        if (progressData.success) {
          if (progressData.data.status === 'in_progress') {
            setProgress(progressData.data.progress);
            setTimeout(pollProgress, 1000); // 每秒轮询一次
          } else {
            // 任务完成
            setReport(progressData.data);
            setProgress(undefined);
            setIsLoading(false);
          }
        } else {
          throw new Error(progressData.error || '获取进度失败');
        }
      };

      setTimeout(pollProgress, 1000);

    } catch (err) {
      console.error('Estimation error:', err);
      setError('生成报告时发生错误，请重试');
      setProgress(undefined);
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-800">
              <strong>错误:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!report ? (
        <CostEstimationForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          progress={progress}
        />
      ) : (
        <CostReport
          report={report}
          onBack={handleBackToForm}
        />
      )}
    </div>
  );
}