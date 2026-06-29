import { and, inArray, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { imports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role === "read") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { fileNames?: string[] } | null;
  const fileNames = Array.isArray(body?.fileNames) ? body.fileNames.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];

  if (fileNames.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  const duplicateRows = await db
    .select({ id: imports.id, fileName: imports.fileName, status: imports.status })
    .from(imports)
    .where(and(eq(imports.ownerUserId, user.id), inArray(imports.fileName, fileNames)));

  return NextResponse.json({
    duplicates: duplicateRows.map((row) => ({
      importId: row.id,
      fileName: row.fileName,
      status: row.status,
    })),
  });
}
