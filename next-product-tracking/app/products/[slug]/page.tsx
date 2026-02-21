"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";

function useProductTrack(slug: string | undefined) {
  const clickIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!slug) return;

    startRef.current = Date.now();

    const controller = new AbortController();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; clickId?: string }) => {
        if (data?.ok && typeof data.clickId === "string") {
          clickIdRef.current = data.clickId;
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
      const clickId = clickIdRef.current;
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
      if (clickId && durationSeconds >= 0) {
        const payload = JSON.stringify({ clickId, duration: durationSeconds });
        const blob = new Blob([payload], { type: "application/json" });
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/track-duration", blob);
        }
      }
    };
  }, [slug]);
}

export default function ProductPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : undefined;

  useProductTrack(slug);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">
        Product: {slug ?? "—"}
      </h1>
      <p className="mt-2 text-gray-600">
        Visit and time on this page are tracked. Close or navigate away to send duration.
      </p>
    </div>
  );
}
