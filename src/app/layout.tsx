import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const DESCRIPTION =
  "자립준비청년이 AI 선배 ‘든든’에게 채팅으로 물어보면, 공공데이터에서 받을 수 있는 복지·청년정책·임대주택 공고·고용센터·무료 문화행사를 찾아 알려줘요.";

export const metadata: Metadata = {
  title: "먼저살기 | 든든이랑 같이 챙겨요",
  description: DESCRIPTION,
  applicationName: "먼저살기",
  openGraph: {
    title: "먼저살기 | 든든이랑 같이 챙겨요",
    description: DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    siteName: "먼저살기",
    images: [{ url: "/character/full.webp", width: 640, height: 950, alt: "AI 자립 선배 든든" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f7a5e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="mx-auto min-h-dvh w-full max-w-md bg-background shadow-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
