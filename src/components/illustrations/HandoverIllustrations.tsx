/**
 * 인수인계 예시 일러스트.
 *
 * 스톡 사진 대신 브랜드 색으로 그린 도형이라 저작권 문제가 없고,
 * 확대해도 깨지지 않으며 파일 요청도 늘지 않는다.
 * 4개가 한 벌로 보이도록 같은 viewBox와 선 두께를 쓴다.
 */

const forest = "#123C35";
const navy = "#172A46";
const mint = "#DFF4EA";
const cream = "#FFF7E8";
const sage = "#7FA893";

type IllustrationProps = { className?: string };

/** 4개 일러스트가 공유하는 틀. 배경과 비율을 한곳에서 맞춘다. */
function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // 카드마다 비율이 달라 slice로는 그림이 잘린다. meet으로 전체를 보이게 하고,
    // 남는 여백은 카드 배경색(bgClass)이 채워 이어지게 한다.
    // 설명은 각 카드의 figcaption이 하므로 그림 자체는 장식으로 둔다.
    <svg
      viewBox="0 0 320 240"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 채광과 수납 상태 */
export function DaylightIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect width="320" height="240" fill={mint} />

      {/* 창으로 들어오는 빛 */}
      <path
        d="M84 34 L250 100 L250 158 L84 158 Z"
        fill={cream}
        opacity="0.85"
      />

      {/* 창틀 */}
      <rect
        x="52"
        y="30"
        width="96"
        height="104"
        rx="8"
        fill="#FFFFFF"
        stroke={forest}
        strokeWidth="4"
      />
      <line
        x1="100"
        y1="30"
        x2="100"
        y2="134"
        stroke={forest}
        strokeWidth="4"
      />
      <line x1="52" y1="82" x2="148" y2="82" stroke={forest} strokeWidth="4" />

      {/* 수납 선반 */}
      <rect
        x="196"
        y="64"
        width="80"
        height="94"
        rx="6"
        fill="#FFFFFF"
        stroke={forest}
        strokeWidth="4"
      />
      <line x1="196" y1="96" x2="276" y2="96" stroke={forest} strokeWidth="3" />
      <line
        x1="196"
        y1="128"
        x2="276"
        y2="128"
        stroke={forest}
        strokeWidth="3"
      />
      <rect x="206" y="72" width="18" height="16" rx="3" fill={sage} />
      <rect x="230" y="72" width="26" height="16" rx="3" fill={mint} />
      <rect x="206" y="104" width="30" height="16" rx="3" fill={mint} />
      <rect x="242" y="104" width="14" height="16" rx="3" fill={sage} />

      {/* 바닥선 */}
      <line
        x1="28"
        y1="158"
        x2="292"
        y2="158"
        stroke={forest}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Frame>
  );
}

/** 단지 외관과 주차 동선 */
export function BuildingIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect width="320" height="240" fill={cream} />

      <rect
        x="48"
        y="34"
        width="88"
        height="124"
        rx="8"
        fill="#FFFFFF"
        stroke={forest}
        strokeWidth="4"
      />
      <rect
        x="152"
        y="66"
        width="76"
        height="92"
        rx="8"
        fill={mint}
        stroke={forest}
        strokeWidth="4"
      />

      {/* 창문 */}
      {[50, 82, 114].map((y) => (
        <g key={y}>
          <rect x="64" y={y} width="22" height="18" rx="3" fill={mint} />
          <rect x="98" y={y} width="22" height="18" rx="3" fill={sage} />
        </g>
      ))}
      {[84, 116].map((y) => (
        <g key={y}>
          <rect x="166" y={y} width="20" height="16" rx="3" fill="#FFFFFF" />
          <rect x="194" y={y} width="20" height="16" rx="3" fill="#FFFFFF" />
        </g>
      ))}

      {/* 주차 동선 */}
      <path
        d="M34 158 C104 158 148 140 240 140"
        stroke={sage}
        strokeWidth="4"
        strokeDasharray="10 10"
        strokeLinecap="round"
        fill="none"
      />
      <rect
        x="240"
        y="112"
        width="44"
        height="26"
        rx="8"
        fill={navy}
        stroke={forest}
        strokeWidth="3"
      />
      <circle cx="252" cy="140" r="6" fill={forest} />
      <circle cx="274" cy="140" r="6" fill={forest} />
    </Frame>
  );
}

/** 열쇠 인계 */
export function KeyHandoverIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect width="320" height="240" fill={mint} />

      {/* 문 */}
      <rect
        x="188"
        y="28"
        width="96"
        height="122"
        rx="10"
        fill="#FFFFFF"
        stroke={forest}
        strokeWidth="4"
      />
      <circle cx="206" cy="96" r="6" fill={sage} />

      {/* 큰 열쇠 */}
      <circle
        cx="86"
        cy="84"
        r="32"
        fill={cream}
        stroke={forest}
        strokeWidth="5"
      />
      <circle
        cx="86"
        cy="84"
        r="12"
        fill={mint}
        stroke={forest}
        strokeWidth="4"
      />
      <path
        d="M118 84 H188"
        stroke={forest}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M156 84 V106"
        stroke={forest}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M174 84 V102"
        stroke={forest}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* 넘겨주는 방향 */}
      <path
        d="M74 140 H206"
        stroke={sage}
        strokeWidth="4"
        strokeDasharray="9 9"
        strokeLinecap="round"
      />
      <path
        d="M196 132 L208 140 L196 148"
        fill="none"
        stroke={sage}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** 계약 확인과 확정일자 */
export function ContractIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect width="320" height="240" fill={cream} />

      {/* 뒤쪽 문서 */}
      <rect
        x="70"
        y="24"
        width="126"
        height="126"
        rx="10"
        fill={mint}
        stroke={forest}
        strokeWidth="4"
      />
      {/* 앞쪽 문서 */}
      <rect
        x="94"
        y="38"
        width="126"
        height="126"
        rx="10"
        fill="#FFFFFF"
        stroke={forest}
        strokeWidth="4"
      />

      {[64, 84, 104, 124].map((y) => (
        <line
          key={y}
          x1="112"
          y1={y}
          x2={y === 124 ? "172" : "200"}
          y2={y}
          stroke={sage}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}

      {/* 확정일자 도장 */}
      <circle
        cx="232"
        cy="132"
        r="32"
        fill={forest}
        stroke="#FFFFFF"
        strokeWidth="4"
      />
      <path
        d="M218 132 L228 143 L247 121"
        fill="none"
        stroke={mint}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}
