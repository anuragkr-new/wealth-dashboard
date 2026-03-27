import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CSV_IMPORT_MAX_BYTES,
  parseHoldingsCsv,
} from "@/lib/csv-holdings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart form data" },
        { status: 400 }
      );
    }

    const categoryId = String(form.get("categoryId") ?? "").trim();
    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      );
    }

    const replaceRaw = form.get("replaceCategory");
    const replaceCategory =
      replaceRaw === "true" ||
      replaceRaw === "1" ||
      replaceRaw === "on";

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > CSV_IMPORT_MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${CSV_IMPORT_MAX_BYTES} bytes)` },
        { status: 400 }
      );
    }

    const category = await prisma.assetCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const text = await file.text();
    const parsed = parseHoldingsCsv(text);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { rows } = parsed;

    await prisma.$transaction(async (tx) => {
      if (replaceCategory) {
        await tx.asset.deleteMany({ where: { categoryId } });
      }
      await tx.asset.createMany({
        data: rows.map((row) => ({
          name: row.name,
          value: row.value,
          categoryId,
          notes: row.notes,
        })),
      });
    });

    return NextResponse.json({
      ok: true,
      created: rows.length,
      skipped: 0,
      errors: [] as string[],
    });
  } catch (e) {
    console.error("import-csv", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Import failed (server error)",
      },
      { status: 500 }
    );
  }
}
