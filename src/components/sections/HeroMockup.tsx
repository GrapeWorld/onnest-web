const mapMarkers = [
  { label: "인수인계 3건", className: "left-[16%] top-[28%]" },
  { label: "반려동물 확인 필요", className: "right-[8%] top-[36%]" },
  { label: "야간 주차 확인 필요", className: "left-[34%] bottom-[36%]" },
];

const checklistItems = ["HUG 확인", "보증보험 연결", "입주청소 예약", "렌탈·생활제품 확인"];

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -right-5 top-8 h-56 w-56 rounded-full bg-mint blur-2xl" />
      <div className="absolute -bottom-5 left-8 h-36 w-36 rounded-full bg-cream blur-xl" />
      <div className="relative rounded-[34px] border border-forest/10 bg-white/80 p-3 shadow-glow backdrop-blur">
        <div className="relative min-h-[520px] overflow-hidden rounded-[28px] bg-mint p-5 sm:min-h-[560px]">
          <div className="absolute inset-0">
            <div className="absolute left-8 top-6 h-[120%] w-16 rotate-12 rounded-full bg-white/55" />
            <div className="absolute right-14 top-0 h-[120%] w-20 -rotate-12 rounded-full bg-cream/75" />
            <div className="absolute left-0 top-32 h-16 w-full rotate-[-8deg] rounded-full bg-white/45" />
            <div className="absolute bottom-24 left-8 h-14 w-[88%] rotate-[10deg] rounded-full bg-forest/10" />
            <div className="absolute bottom-44 right-10 h-12 w-[60%] rotate-[-18deg] rounded-full bg-white/35" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-sage">Map Preview</p>
              <h2 className="mt-2 text-2xl font-black text-forest">남양주 별내동</h2>
            </div>
            <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-forest shadow-card">
              공간 인수인계
            </span>
          </div>

          {mapMarkers.map((marker) => (
            <div key={marker.label} className={`absolute z-20 ${marker.className}`}>
              <div className="relative">
                <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest/15" />
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-forest text-white shadow-soft">
                  •
                </span>
                <div className="absolute left-1/2 top-10 w-max -translate-x-1/2 rounded-full bg-white px-3 py-2 text-xs font-bold text-forest shadow-soft">
                  {marker.label}
                </div>
              </div>
            </div>
          ))}

          <div className="absolute bottom-5 left-5 right-5 z-30 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-sage">우리집 인수인계서</p>
                  <h3 className="mt-1 text-lg font-black text-forest">별내 오피스텔 A타입</h3>
                  <p className="mt-1 text-sm font-semibold text-ink/60">인수인계서 2건</p>
                </div>
                <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">확인 가능</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["주차", "결로", "수납", "반려동물"].map((tag) => (
                  <span key={tag} className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-forest">
                    {tag}
                  </span>
                ))}
              </div>
              <button className="mt-4 w-full rounded-full bg-forest px-4 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-navy">
                프로젝트로 저장
              </button>
            </div>

            <div className="rounded-[24px] bg-navy p-4 text-white shadow-soft">
              <p className="text-xs font-bold text-white/55">입주 체크리스트</p>
              <div className="mt-3 space-y-2">
                {checklistItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint text-forest">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
