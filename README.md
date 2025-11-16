# FairCost - 留学费用估算工具

一个基于人工智能技术的留学费用估算工具，帮助计划申请海外本科或硕士的学生了解目标国家的学习和生活成本。

## 功能特点

- 🎯 **个性化估算**：根据用户的生活方式偏好提供定制化费用估算
- 🏛️ **官方数据源**：从大学官网和政府网站获取最新、最准确的费用信息
- 📊 **可视化报告**：提供直观的图表和详细的费用分解
- 💡 **省钱建议**：基于用户选择的个性化省钱建议
- 🔗 **数据透明**：所有估算都提供可验证的数据来源链接


## 技术架构

### 前端
- **Next.js 15** - React全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 现代化UI
- **Recharts** - 数据可视化
- **React Markdown** - Markdown内容渲染

### 后端
- **Next.js API Routes** - 服务端API
- **OpenRouter** - LLM集成 (GPT-4o)
- **智能代理系统** - 并行数据查询与分析

### 核心模块

1. **学费查询助手** - 从官方网站查询准确学费信息
2. **住宿与生活成本分析师** - 基于城市和生活方式分析生活费
3. **其他费用专员** - 计算申请费、签证费等额外费用
4. **报告撰写员** - 生成个性化的可视化报告

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**

   复制 [.env.example]文件并重命名为 [.env.local]：
   ```bash
   cp .env.example .env.local
   ```
   
   然后在 [.env.local]文件中填入您的 OpenRouter API 密钥：
   ```env
   OPENROUTER_API_KEY=your_actual_openrouter_api_key
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**

   打开浏览器访问 http://localhost:3000

## 使用流程

1. **填写基本信息**
   - 选择目标国家/地区
   - 选择大学和专业
   - 设定学位层次（本科/硕士）

2. **个性化设置**
   - 选择生活方式（经济型/标准型/舒适型）
   - 设定住宿偏好
   - 可选：饮食习惯和交通偏好

3. **获取报告**
   - 系统并行查询各项费用
   - 生成个性化费用估算报告
   - 查看详细的费用分解和建议

## 数据来源

- 🏛️ 大学官方网站
- 🏛️ 政府官方数据
- 📊 Numbeo等生活成本数据平台
- 📋 官方签证费用标准

## 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/estimate/      # API端点
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 布局组件
│   └── page.tsx          # 主页面
├── components/            # React组件
│   ├── CostEstimationForm.tsx
│   └── CostReport.tsx
├── lib/                   # 核心逻辑
│   ├── agents/           # 智能代理
│   │   ├── tuition-agent.ts
│   │   ├── accommodation-agent.ts
│   │   ├── living-cost-agent.ts
│   │   ├── other-costs-agent.ts
│   │   └── report-agent.ts
│   ├── constants.ts      # 常量配置
│   ├── utils.ts          # 工具函数
│   ├── openrouter.ts     # LLM客户端
│   └── estimation-coordinator.ts # 协调器
├── types/                 # TypeScript类型定义
└── README.md             # 项目文档
```

## 开发计划

### MVP 版本 ✅
- [x] 基础费用估算功能
- [x] 多国家主要大学支持
- [x] 可视化报告生成
- [x] 个性化建议系统

### 后续版本
- [ ] 更多国家支持
- [ ] 历史费用趋势分析
- [ ] 用户账户系统
- [ ] PDF报告导出
- [ ] 移动端优化
- [ ] 费用对比功能

## 联系我们

如有问题或建议，请通过以下方式联系：

- 📧 Email: [ruilangwang424@gmail.com]
- 🐛 Issues: [GitHub Issues](https://github.com/Raymond2967/FairCost-Transparent-AI-Driven-Study-Expense-Estimator/issues)
---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！