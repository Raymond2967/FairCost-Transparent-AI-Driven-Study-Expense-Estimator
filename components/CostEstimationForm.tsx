'use client';

import { useState } from 'react';
import { UserInput, EstimationProgress } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES, UK_UNIVERSITIES, CA_UNIVERSITIES, DE_UNIVERSITIES, HK_UNIVERSITIES, MO_UNIVERSITIES, SG_UNIVERSITIES, CITIES } from '@/lib/constants';

interface CostEstimationFormProps {
  onSubmit: (userInput: UserInput) => void;
  isLoading?: boolean;
  progress?: EstimationProgress;
}

export default function CostEstimationForm({ onSubmit, isLoading, progress }: CostEstimationFormProps) {
  const [formData, setFormData] = useState<Partial<UserInput>>({
    country: 'US',
    lifestyle: 'standard',
    accommodation: 'dormitory',
    locationPreference: 'cityCentre'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof UserInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // 当国家改变时，重置大学和城市选择
    if (field === 'country') {
      setFormData(prev => ({ ...prev, university: '', city: '', program: '' }));
    }

    // 当大学改变时，更新城市
    if (field === 'university') {
      const allUniversities = [...US_UNIVERSITIES, ...AU_UNIVERSITIES, ...UK_UNIVERSITIES, ...CA_UNIVERSITIES, ...DE_UNIVERSITIES, ...HK_UNIVERSITIES, ...MO_UNIVERSITIES, ...SG_UNIVERSITIES];
      const selectedUni = allUniversities.find(uni => uni.name === value);
      if (selectedUni) {
        setFormData(prev => ({ ...prev, city: selectedUni.city }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.country) newErrors.country = '请选择国家';
    if (!formData.university) newErrors.university = '请选择大学';
    if (!formData.program) newErrors.program = '请填写专业';
    if (!formData.city) newErrors.city = '请选择城市';
    if (!formData.level) newErrors.level = '请选择学位层次';
    if (!formData.lifestyle) newErrors.lifestyle = '请选择消费档次';
    if (!formData.accommodation) newErrors.accommodation = '请选择住宿偏好';
    if (!formData.locationPreference) newErrors.locationPreference = '请选择地理位置偏好';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData as UserInput);
  };

  const currentUniversities = formData.country === 'US' ? US_UNIVERSITIES : 
                             formData.country === 'AU' ? AU_UNIVERSITIES :
                             formData.country === 'UK' ? UK_UNIVERSITIES :
                             formData.country === 'CA' ? CA_UNIVERSITIES :
                             formData.country === 'DE' ? DE_UNIVERSITIES :
                             formData.country === 'HK' ? HK_UNIVERSITIES :
                             formData.country === 'MO' ? MO_UNIVERSITIES :
                             formData.country === 'SG' ? SG_UNIVERSITIES : [];
                             
  const currentCities = CITIES.filter(city => city.country === formData.country);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">开始你的留学费用估算</h2>
          <p className="text-gray-600">
            请填写以下信息，我们将为你提供准确、个性化的留学费用报告。所有数据都来自官方渠道，并提供可验证的来源链接。
          </p>
        </div>

        {progress && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-800 font-medium">{progress.message}</span>
                <span className="text-blue-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 国家选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标国家 *
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="US">🇺🇸 美国</option>
                <option value="AU">🇦🇺 澳大利亚</option>
                <option value="UK">🇬🇧 英国</option>
                <option value="CA">🇨🇦 加拿大</option>
                <option value="DE">🇩🇪 德国</option>
                <option value="HK">🇭🇰 中国香港</option>
                <option value="MO">🇲🇴 中国澳门</option>
                <option value="SG">🇸🇬 新加坡</option>
              </select>
              {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
            </div>

            {/* 学位层次 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学位层次 *
              </label>
              <select
                value={formData.level || ''}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择学位层次</option>
                <option value="undergraduate">本科</option>
                <option value="graduate">研究生</option>
              </select>
              {errors.level && <p className="mt-1 text-sm text-red-600">{errors.level}</p>}
            </div>

            {/* 大学选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标大学 *
              </label>
              <select
                value={formData.university || ''}
                onChange={(e) => handleInputChange('university', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择大学</option>
                {currentUniversities.map((uni) => (
                  <option key={uni.name} value={uni.name}>
                    {uni.name}
                  </option>
                ))}
              </select>
              {errors.university && <p className="mt-1 text-sm text-red-600">{errors.university}</p>}
            </div>

            {/* 专业填写 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                专业名称 *
              </label>
              <input
                type="text"
                value={formData.program || ''}
                onChange={(e) => handleInputChange('program', e.target.value)}
                placeholder="例如：计算机科学、商业管理"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.program && <p className="mt-1 text-sm text-red-600">{errors.program}</p>}
            </div>

            {/* 城市选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所在城市 *
              </label>
              <select
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择城市</option>
                {currentCities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
            </div>

            {/* 生活方式选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                生活方式 *
              </label>
              <select
                value={formData.lifestyle || ''}
                onChange={(e) => handleInputChange('lifestyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择生活方式</option>
                <option value="economy">经济型 (-20%)</option>
                <option value="standard">标准型 (基准)</option>
                <option value="comfortable">舒适型 (+25%)</option>
              </select>
              {errors.lifestyle && <p className="mt-1 text-sm text-red-600">{errors.lifestyle}</p>}
            </div>

            {/* 住宿偏好 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                住宿偏好 *
              </label>
              <select
                value={formData.accommodation || ''}
                onChange={(e) => handleInputChange('accommodation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择住宿类型</option>
                <option value="dormitory">学校宿舍</option>
                <option value="shared">合租房间</option>
                <option value="studio">单人公寓</option>
                <option value="apartment">多人公寓</option>
              </select>
              {errors.accommodation && <p className="mt-1 text-sm text-red-600">{errors.accommodation}</p>}
            </div>

            {/* 地理位置偏好 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地理位置偏好 *
              </label>
              <select
                value={formData.locationPreference || ''}
                onChange={(e) => handleInputChange('locationPreference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择地理位置</option>
                <option value="cityCentre">市中心</option>
                <option value="outsideCityCentre">郊区</option>
              </select>
              {errors.locationPreference && <p className="mt-1 text-sm text-red-600">{errors.locationPreference}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              带 * 的为必填项
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '正在生成报告...' : '开始估算'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}