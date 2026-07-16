import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONNEST | 집도 인수인계가 필요합니다",
  description:
    "온네스트는 우리집 인수인계서에서 시작해 계약부터 입주까지의 과정을 관리하는 주거 전환 플랫폼입니다.",
  openGraph: {
    title: "ONNEST | 집도 인수인계가 필요합니다",
    description:
      "계약부터 입주까지 온네스트 하나로. 공간과 생활 경험을 인수인계하는 주거 전환 플랫폼.",
    type: "website",
    locale: "ko_KR"
    // TODO: Add /public/og-image.png when the final brand image is ready.
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
