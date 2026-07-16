export type Marketplace = "mercari-personal" | "yahoo-auctions" | "mercari-shops";

export interface ListingDraft {
  title: string;
  description: string;
  category_hint: string;
  brand: string;
  condition: "BRAND_NEW" | "ALMOST_NEW" | "CLEAN" | "LITTLE_DIRTY" | "DIRTY" | "BAD";
  defects: string[];
  price_min: number;
  price_recommended: number;
  price_max: number;
  keywords: string[];
  confidence: number;
  questions: string[];
  prohibited_risk: string;
}

export interface MercariPublishFields {
  categoryId: string;
  shippingFromStateId: string;
  shippingDuration: string;
  shippingMethod: string;
  shippingPayer: string;
  status: "UNOPENED" | "OPENED";
  stock: number;
}
