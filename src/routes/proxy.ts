import { Hono } from "hono";

const proxyRouter = new Hono();

const urlStore = new Map<string, string>();

const PROXY_HEADERS = {
  "Referer": "https://hianime.to",
  "Origin": "https://hianime.to",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

proxyRouter.post("/proxy/store", async (c) => {
  try {
    const { url } = await c.req.json();
    if (!url) return c.json({ error: "URL required" }, 400);
    
    const token = Math.random().toString(36).substring(2, 10);
    urlStore.set(token, url);
    
    if (urlStore.size > 100) {
      const firstKey = urlStore.keys().next().value;
      if (firstKey) urlStore.delete(firstKey);
    }
    
    return c.json({ token });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

proxyRouter.get("/proxy/play/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const url = urlStore.get(token);
    if (!url) return c.json({ error: "Token not found" }, 404);

    const baseUrl = url.substring(0, url.lastIndexOf("/"));
    const reqUrl = new URL(c.req.url);
    const proxyBase = `${reqUrl.protocol}//${reqUrl.host}`;

    const response = await fetch(url, { headers: PROXY_HEADERS });
    if (!response.ok) return c.json({ error: `Fetch failed: ${response.status}` }, 500);

    const text = await response.text();

    const rewritten = text.split("\n").map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const segUrl = trimmed.startsWith("http")
          ? trimmed
          : `${baseUrl}/${trimmed}`;
        return `${proxyBase}/proxy/seg?url=${encodeURIComponent(segUrl)}`;
      }
      return line;
    }).join("\n");

    return new Response(rewritten, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      }
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

proxyRouter.get("/proxy/seg", async (c) => {
  try {
    const url = c.req.query("url");
    if (!url) return c.json({ error: "URL required" }, 400);

    const response = await fetch(url, { headers: PROXY_HEADERS });
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "video/MP2T",
        "Access-Control-Allow-Origin": "*",
      }
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export { proxyRouter };