import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '酒店停车场车位远程监测与管理系统',
    template: '%s | 酒店停车场车位远程监测与管理系统',
  },
  description: '酒店停车场车位远程监测与管理系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
