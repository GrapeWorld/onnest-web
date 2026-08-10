import { CTASection } from "@/components/sections/CTASection";
import { CoreFeaturesSection } from "@/components/sections/CoreFeaturesSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { getCurrentUser } from "@/lib/auth";

// 첫 방문자가 훑어보고 바로 시작할 수 있도록 Hero → 핵심 기능 3가지 →
// 이용 방법 3단계 → 회원가입 CTA 네 블록으로만 구성한다. 보험·법률·안전
// 안내처럼 더 깊은 내용은 각 상세 페이지(/policy/safety 등, Footer 참고)에
// 그대로 남아있다 — 홈에서 섹션만 걷어냈을 뿐 페이지 자체는 삭제하지 않았다.
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main>
      <HeroSection />
      <CoreFeaturesSection />
      <HowItWorksSection />
      <CTASection
        title={
          user
            ? "다음 할 일을 마이페이지에서 이어서 진행하세요."
            : "지금 바로 입주 준비를 시작해보세요."
        }
        description={
          user
            ? "진행 중인 프로젝트, 받은 견적, 문의 내역을 마이페이지 한곳에서 확인할 수 있습니다."
            : "몇 가지 정보만 입력하면 프로젝트를 만들고 바로 시작할 수 있습니다."
        }
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}
