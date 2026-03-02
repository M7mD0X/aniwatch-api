import { Hono } from "hono";

const proxyRouter = new Hono();

const HEADERS = {
  "Referer": "https://hianime.to",
  "Origin": "https://hianime.to",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

proxyRouter.get("/proxy/m3u8", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("URL required", 400);

  const baseUrl = url.substring(0, url.lastIndexOf("/"));
  const proxyBase = new URL(c.req.url).origin;

  const response = await fetch(url, { headers: HEADERS });
  const text = await response.text();

  const rewritten = text.split("\n").map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const segUrl = trimmed.startsWith("http") ? trimmed : `${baseUrl}/${trimmed}`;
      return `${proxyBase}/proxy/seg?url=${encodeURIComponent(segUrl)}`;
    }
    return line;
  }).join("\n");

  return new Response(rewritten, {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*",
    }
  });
});

proxyRouter.get("/proxy/seg", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.text("URL required", 400);

  const response = await fetch(url, { headers: HEADERS });
  const buffer = await response.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "video/MP2T",
      "Access-Control-Allow-Origin": "*",
    }
  });
});

export { proxyRouter };