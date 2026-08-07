import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff, getServiceRequestWritePermission } from "@/lib/partnerAuth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { deleteProjectFile, isStorageConfigured, putProjectFile } from "@/lib/storage";
import { validateUpload, validateUploadContents } from "@/lib/documents";
import { serviceRequestFileCategories } from "@/data/serviceRequestFiles";

/** 업체 포털 — 견적서·작업 사진·계약서 업로드. multipart/form-data(file, category)를 받는다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerRequestFile", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const { id } = await params;
  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { id: true, partnerId: true, partnerStaffId: true, projectId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }
  const permission = await getServiceRequestWritePermission(user, existing);
  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.reason === "forbidden" ? "권한이 없습니다." : "요청을 찾을 수 없습니다." },
      { status: permission.reason === "forbidden" ? 403 : 404 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const category = form?.get("category");
  if (
    typeof category !== "string" ||
    !serviceRequestFileCategories.includes(category as (typeof serviceRequestFileCategories)[number])
  ) {
    return NextResponse.json(
      { error: "파일 종류(견적서/작업 사진/계약서)를 선택해주세요." },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "올릴 파일을 선택해주세요." },
      { status: 400 },
    );
  }

  const invalid = validateUpload(file);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }
  const invalidContents = await validateUploadContents(file);
  if (invalidContents) {
    return NextResponse.json({ error: invalidContents }, { status: 400 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "파일 스토리지가 설정되지 않았습니다. 관리자에게 문의해주세요." },
      { status: 503 },
    );
  }

  const stored = await putProjectFile(existing.projectId, file);

  let document;
  try {
    document = await prisma.document.create({
      data: {
        projectId: existing.projectId,
        serviceRequestId: id,
        category,
        uploadedByRole: "PARTNER",
        uploadedById: user.id,
        uploadedByName: user.name,
        partnerId: user.partnerId,
        filename: file.name.slice(0, 200),
        mimeType: file.type,
        size: file.size,
        storageKey: stored.storageKey,
      },
      select: { id: true, filename: true, category: true, size: true, createdAt: true },
    });
  } catch (error) {
    try {
      await deleteProjectFile(stored.storageKey);
    } catch {
      console.error(`[service-request-file-upload] orphan blob cleanup failed for request ${id}`);
    }
    throw error;
  }

  return NextResponse.json(document, { status: 201 });
}
