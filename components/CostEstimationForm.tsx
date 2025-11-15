'use client';

import { useState } from 'react';
import { UserInput, EstimationProgress } from '@/types';
import { US_UNIVERSITIES, AU_UNIVERSITIES, UK_UNIVERSITIES, CA_UNIVERSITIES, DE_UNIVERSITIES, CITIES } from '@/lib/constants';

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
      const allUniversities = [...US_UNIVERSITIES, ...AU_UNIVERSITIES, ...UK_UNIVERSITIES, ...CA_UNIVERSITIES, ...DE_UNIVERSITIES];
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
                             formData.country === 'DE' ? DE_UNIVERSITIES : [];
                             
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                目标国家 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value as 'US' | 'AU' | 'UK' | 'CA' | 'DE')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="US">美国</option>
                <option value="AU">澳大利亚</option>
                <option value="UK">英国</option>
                <option value="CA">加拿大</option>
                <option value="DE">德国</option>
              </select>
              {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                学位层次 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level || ''}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">请选择学位层次</option>
                <option value="undergraduate">本科</option>
                <option value="graduate">硕士</option>
              </select>
              {errors.level && <p className="text-red-500 text-sm mt-1">{errors.level}</p>}
            </div>
          </div>

          {/* 大学和专业 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                目标大学 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.university || ''}
                onChange={(e) => handleInputChange('university', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">请选择大学</option>
                {currentUniversities.map(uni => (
                  <option key={uni.name} value={uni.name}>{uni.name}</option>
                ))}
              </select>
              {errors.university && <p className="text-red-500 text-sm mt-1">{errors.university}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                专业/项目 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.program || ''}
                onChange={(e) => handleInputChange('program', e.target.value)}
                placeholder="例如：Computer Science, MBA, Medicine"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              {errors.program && <p className="text-red-500 text-sm mt-1">{errors.program}</p>}
            </div>
          </div>

          {/* 城市 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              目标城市 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">请选择城市</option>
              {currentCities.map(city => (
                <option key={city.name} value={city.name}>
                  {city.name}{city.state && `, ${city.state}`}
                </option>
              ))}
            </select>
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          {/* 生活方式偏好 */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">生活方式偏好</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  消费档次 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'economy', label: '经济型', desc: '节俭生活，平均费用-20%' },
                    { value: 'standard', label: '标准型', desc: '正常生活，平均费用水平' },
                    { value: 'comfortable', label: '舒适型', desc: '较好生活，平均费用+25%' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={formData.lifestyle === option.value}
                        onChange={(e) => handleInputChange('lifestyle', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.lifestyle && <p className="text-red-500 text-sm mt-1">{errors.lifestyle}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  住宿偏好 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'dormitory', label: '学校宿舍', desc: '校内住宿，安全便利' },
                    { value: 'shared', label: '合租房屋', desc: '与他人合租，经济实惠' },
                    { value: 'studio', label: '单人公寓', desc: '独立空间，私密性好' },
                    { value: 'apartment', label: '整租公寓', desc: '完全独立，空间最大' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={formData.accommodation === option.value}
                        onChange={(e) => handleInputChange('accommodation', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.accommodation && <p className="text-red-500 text-sm mt-1">{errors.accommodation}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  地理位置偏好 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'cityCentre', label: '市中心', desc: '交通便利，生活设施齐全' },
                    { value: 'outsideCityCentre', label: '郊区', desc: '相对安静，价格可能更实惠' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        value={option.value}
                        checked={formData.locationPreference === option.value}
                        onChange={(e) => handleInputChange('locationPreference', e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.locationPreference && <p className="text-red-500 text-sm mt-1">{errors.locationPreference}</p>}
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2.5a1 1 0 00-2 0V4a6 6 0 00-6 6 1 1 0 002 0z"></path>
                  </svg>
                  正在计算...
                </span>
              ) : (
                '生成个性化费用报告'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}