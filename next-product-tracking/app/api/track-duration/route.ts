import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const clickId = typeof body.clickId === "string" ? body.clickId.trim() : null;
    let duration =
      typeof body.duration === "number"
        ? body.duration
        : typeof body.duration === "string"
          ? parseInt(body.duration, 10)
          : null;

    if (!clickId) {
      return NextResponse.json(
        { error: "clickId required" },
        { status: 400 }
      );
    }

    if (duration == null || Number.isNaN(duration) || duration < 0) {
      duration = 0;
    }
    const durationSeconds = Math.min(Math.round(duration), 86400);

    const click = await prisma.click.findUnique({
      where: { id: clickId },
    });

    if (!click) {
      return NextResponse.json({ error: "Click not found" }, { status: 404 });
    }

    await prisma.click.update({
      where: { id: clickId },
      data: { duration: durationSeconds },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Track duration error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
