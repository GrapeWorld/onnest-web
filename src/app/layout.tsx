import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "ONNEST | 입주 준비를 프로젝트로 관리하세요",
  description:
    "온네스트는 입주 준비 일정과 필요한 서비스, 생활 정보를 한곳에서 관리하는 주거 전환 플랫폼입니다.",
  openGraph: {
    title: "ONNEST | 입주 준비를 프로젝트로 관리하세요",
    description:
      "계약부터 입주까지 온네스트 하나로. 일정 관리부터 생활 정보 확인까지 한곳에서 해결하세요.",
    type: "website",
    locale: "ko_KR"
    // TODO: Add /public/og-image.png when the final brand image is ready.
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
