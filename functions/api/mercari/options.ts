import { json, mercariGraphql, type Env } from "../../_lib";

const query = `query ListingOptions { productCategories { id name parentId hasChild } states { id name } availableProductConditionOptions { name type } availableShippingDurationOptions { name type } availableShippingMethodOptions { name type } availableShippingPayerOptions { name type } }`;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try { return json({ ok: true, data: await mercariGraphql(env, query) }); }
  catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "選択肢を取得できませんでした" }, 400); }
};
