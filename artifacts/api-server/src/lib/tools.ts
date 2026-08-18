export type ToolStatus = "Ready" | "Needs setup" | "Disabled";

export type HamauminTool = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ToolStatus;
  requiresPermission: boolean;
};

const tools: HamauminTool[] = [
  {
    id: "web-search",
    name: "گەڕانی وێب",
    description: "زانیارییە نوێکان لە سەر وێب دەدۆزێتەوە",
    category: "زانیاری",
    status: process.env.BRAVE_SEARCH_API_KEY ? "Ready" : "Needs setup",
    requiresPermission: false,
  },
  {
    id: "web-fetch",
    name: "خوێندنەوەی پەڕە",
    description: "ناوەڕۆکی پەڕەیەکی دیاریکراو دەخوێنێتەوە",
    category: "زانیاری",
    status: "Ready",
    requiresPermission: false,
  },
  {
    id: "image-analysis",
    name: "شیکردنەوەی وێنە",
    description: "وێنە و بەڵگەنامەکان بە یارمەتی بینین دەفهمێت",
    category: "AI",
    status: process.env.OPENAI_API_KEY ? "Ready" : "Needs setup",
    requiresPermission: false,
  },
  {
    id: "file-ops",
    name: "فایلەکان",
    description: "دروستکردن، خوێندنەوە و دەستکاریکردنی فایل",
    category: "کۆد",
    status: "Ready",
    requiresPermission: true,
  },
  {
    id: "code-agent",
    name: "ئەجێنتی کۆد",
    description: "پڕۆژە، کۆد، تاقیکردنەوە و چاککردنەوە بە شێوەی هەنگاوی",
    category: "کۆد",
    status: "Ready",
    requiresPermission: true,
  },
  {
    id: "reminders",
    name: "بیرخستنەوە",
    description: "ئەرک و بیرخستنەوەکانی کات‌دار بەڕێوەدەبات",
    category: "بەرهەمهێنان",
    status: "Ready",
    requiresPermission: true,
  },
  {
    id: "location",
    name: "شوێن",
    description: "تەنها لەگەڵ ڕەزامەندی بەکارهێنەر شوێن بەکاردێنێت",
    category: "دەستگەیشتن",
    status: "Ready",
    requiresPermission: true,
  },
  {
    id: "smart-home",
    name: "ماڵی زیرەک",
    description: "بنەمای پەیوەندی بە ئامێرە زیرەکەکان",
    category: "دەستگەیشتن",
    status: "Needs setup",
    requiresPermission: true,
  },
];

export function listTools(): HamauminTool[] {
  return tools;
}

export async function webSearch(query: string): Promise<string> {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    throw new Error(
      "کلیلی گەڕانی وێب دانەنراوە؛ BRAVE_SEARCH_API_KEY زیاد بکە بۆ چالاککردنی ئەم ئامرازە.",
    );
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  const response = await fetch(url, {
    headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Web search failed with status ${response.status}`);
  }
  const payload = (await response.json()) as {
    web?: { results?: Array<{ title?: string; description?: string; url?: string }> };
  };
  return (payload.web?.results ?? [])
    .map((item) => `${item.title ?? ""}: ${item.description ?? ""} (${item.url ?? ""})`)
    .join("\n");
}

export async function webFetch(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Web fetch failed with status ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text")) {
    throw new Error("ئەم پەڕەیە ناوەڕۆکی دەق نییە");
  }
  const text = await response.text();
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
}