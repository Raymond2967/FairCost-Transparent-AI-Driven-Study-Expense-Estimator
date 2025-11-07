import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智能留学费用估算工具",
  description: "为申请海外本科及硕士的留学生提供最可信、最个性化的留学费用透明度工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              智能留学费用估算工具
            </h1>
            <p className="text-gray-600 mt-1">
              为留学生提供可信、个性化的费用估算报告
            </p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-white border-t mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-gray-600">
            <p>&copy; 2024 智能留学费用估算工具. 为留学生提供透明、可信的费用信息。</p>
          </div>
        </footer>
      </body>
    </html>
  );
}