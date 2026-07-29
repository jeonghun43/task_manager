import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '정정쓰 TASK MANAGER',
  description: '큰 과업을 작은 과업으로 쪼개서 관리하는 시각적 태스크 매니저',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * data-theme 은 하이드레이션 시점에 useUiStore 가 붙인다.
 * 그전까지는 globals.css 의 prefers-color-scheme 규칙이 색을 정하므로
 * 인라인 부트스트랩 스크립트가 필요 없다.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
