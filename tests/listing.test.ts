import { describe, expect, it } from "vitest";
import { draftAsCsv, draftAsText, emptyDraft, validateDraft } from "../src/lib/listing";

const valid = { ...emptyDraft, title: "テスト商品", description: "状態の説明です", price_recommended: 1200, keywords: ["テスト", "商品"] };

describe("listing utilities", () => {
  it("validates required fields and price", () => {
    expect(validateDraft(emptyDraft)).toContain("タイトルが空です");
    expect(validateDraft(valid)).toEqual([]);
    expect(validateDraft({ ...valid, price_recommended: 100 })).toContain("価格は300〜9,999,999円です");
  });
  it("formats human-readable draft", () => {
    expect(draftAsText(valid, "mercari-personal")).toContain("テスト商品");
    expect(draftAsText(valid, "mercari-personal")).toContain("1,200円");
  });
  it("escapes CSV quotes", () => {
    const csv = draftAsCsv({ ...valid, title: 'A "quoted" item' }, "yahoo-auctions");
    expect(csv).toContain('"A ""quoted"" item"');
  });
});
