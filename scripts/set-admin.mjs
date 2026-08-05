import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("사용법: npm run set-admin -- <이메일>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { adminRole: "super" },
  });
  console.log(`${user.email} 계정을 최고관리자로 변경했습니다.`);
} catch {
  console.error(`${email} 계정을 찾을 수 없습니다. 먼저 회원가입해주세요.`);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
