import type { ListingDraft, Marketplace } from "../types";

export const emptyDraft: ListingDraft = {
  title: "",
  description: "",
  category_hint: "",
  brand: "",
  condition: "CLEAN",
  defects: [],
  price_min: 300,
  price_recommended: 1000,
  price_max: 1500,
  keywords: [],
  confidence: 0,
  questions: [],
  prohibited_risk: ""
};

export function validateDraft(draft: ListingDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("タイトルが空です");
  if (draft.title.length > 130) errors.push("タイトルは130文字以内にしてください");
  if (!draft.description.trim()) errors.push("説明文が空です");
  if (draft.description.length > 3000) errors.push("説明文は3000文字以内にしてください");
  if (draft.price_recommended < 300 || draft.price_recommended > 9_999_999) errors.push("価格は300〜9,999,999円です");
  if (draft.prohibited_risk.trim()) errors.push(`出品可否を確認してください: ${draft.prohibited_risk}`);
  return errors;
}

export function draftAsText(draft: ListingDraft, marketplace: Marketplace): string {
  const label = marketplace === "mercari-personal" ? "メルカリ個人" : marketplace === "yahoo-auctions" ? "Yahoo!オークション" : "メルカリShops";
  return [`【${label} 出品原稿】`, draft.title, "", draft.description, "", `価格目安: ${draft.price_recommended.toLocaleString()}円`, `カテゴリ候補: ${draft.category_hint || "未設定"}`, `ブランド: ${draft.brand || "なし/不明"}`, `状態: ${draft.condition}`, `検索語: ${draft.keywords.join(" / ")}`].join("\n");
}

export function draftAsCsv(draft: ListingDraft, marketplace: Marketplace): string {
  const q = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const headers = ["marketplace", "title", "description", "category_hint", "brand", "condition", "price", "keywords", "questions"];
  const row = [marketplace, draft.title, draft.description, draft.category_hint, draft.brand, draft.condition, draft.price_recommended, draft.keywords.join("|"), draft.questions.join("|")];
  return `${headers.map(q).join(",")}\r\n${row.map(q).join(",")}\r\n`;
}

export function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
