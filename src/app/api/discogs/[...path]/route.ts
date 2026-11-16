// Fallback relay for browsers that cannot reach api.discogs.com directly.
// GET only, on the caller's own token: Disclist never writes to Discogs.
import type { NextRequest } from "next/server";

const ALLOWED = /^(oauth\/identity|database\/search|masters\/\d+(\/versions)?|releases\/\d+|artists\/\d+|marketplace\/stats\/\d+|users\/[^/]+\/(collection\/folders\/0\/releases|wants))$/;

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.map(encodeURIComponent).join("/");
  const token = req.headers.get("x-discogs-token");
  if (!token || !ALLOWED.test(path.join("/"))) {
    return Response.json({ message: "Not allowed" }, { status: 400 });
  }
  const upstream = await fetch(`https://api.discogs.com/${joined}${req.nextUrl.search}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": "Disclist/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
