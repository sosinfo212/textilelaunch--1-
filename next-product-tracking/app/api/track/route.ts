import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getCountry, getUserAgent, isBot } from "@/lib/track-utils";

export async function POST(request: NextRequest) {
  try {
    const userAgent = getUserAgent(request);
    if (isBot(userAgent)) {
      return NextResponse.json({ ok: false, reason: "bot" }, { status: 200 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId.trim() : null;
    const slug = typeof body.slug === "string" ? body.slug.trim() : null;

    if (!productId && !slug) {
      return NextResponse.json(
        { error: "productId or slug required" },
        { status: 400 }
      );
    }

    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({ where: { id: productId } });
    }
    if (!product && slug) {
      product = await prisma.product.findUnique({ where: { slug } });
    }
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ip = getClientIp(request);
    const country = getCountry(request);

    const click = await prisma.click.create({
      data: {
        productId: product.id,
        ip,
        country,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true, clickId: click.id });
  } catch (e) {
    console.error("Track error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
