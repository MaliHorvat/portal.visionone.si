import { prisma } from "@/lib/db";
import { DEFAULT_MARKETING_SITE_CONTENT } from "@/lib/marketing-cms/default-content";
import { mergeMarketingContent } from "@/lib/marketing-cms/merge";
import type { MarketingSiteContent } from "@/lib/marketing-cms/types";

const ROW_ID = "default";

export async function getMarketingSiteContent(): Promise<MarketingSiteContent> {
  if (!prisma) return DEFAULT_MARKETING_SITE_CONTENT;
  try {
    const row = await prisma.marketingSiteContent.findUnique({ where: { id: ROW_ID } });
    if (!row?.content) return DEFAULT_MARKETING_SITE_CONTENT;
    return mergeMarketingContent(row.content);
  } catch {
    return DEFAULT_MARKETING_SITE_CONTENT;
  }
}

export async function saveMarketingSiteContent(
  content: MarketingSiteContent,
  updatedBy: string,
): Promise<MarketingSiteContent> {
  if (!prisma) throw new Error("Baza ni nastavljena.");
  const payload: MarketingSiteContent = {
    ...content,
    version: (content.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await prisma.marketingSiteContent.upsert({
    where: { id: ROW_ID },
    create: {
      id: ROW_ID,
      content: payload as object,
      updatedBy,
    },
    update: {
      content: payload as object,
      updatedBy,
    },
  });
  return payload;
}
