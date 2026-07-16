import { useMemo, useState } from "react";
import type { ListingDraft, Marketplace, MercariPublishFields } from "./types";
import { emptyDraft, draftAsCsv, draftAsText, downloadText, validateDraft } from "./lib/listing";
import { compressImage } from "./lib/images";

const marketplaceNames: Record<Marketplace, string> = {
  "mercari-personal": "メルカリ（個人）",
  "yahoo-auctions": "Yahoo!オークション",
  "mercari-shops": "メルカリShops（公式API）"
};

const conditions = ["BRAND_NEW", "ALMOST_NEW", "CLEAN", "LITTLE_DIRTY", "DIRTY", "BAD"] as const;

export default function App() {
  const [marketplace, setMarketplace] = useState<Marketplace>("mercari-personal");
  const [images, setImages] = useState<string[]>([]);
  const [publicImageUrls, setPublicImageUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("写真を1〜4枚追加してください");
  const [publish, setPublish] = useState<MercariPublishFields>({
    categoryId: "",
    shippingFromStateId: "",
    shippingDuration: "TWO_TO_THREE_DAYS",
    shippingMethod: "UNDECIDED",
    shippingPayer: "SELLER",
    status: "UNOPENED",
    stock: 1
  });

  const validation = useMemo(() => validateDraft(draft), [draft]);

  async function selectPhotos(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    try {
      const next = await Promise.all(Array.from(files).slice(0, 4).map(compressImage));
      setImages(next);
      setPublicImageUrls([]);
      setMessage(`${next.length}枚の写真を準備しました。AI解析を実行できます。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像処理に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!images.length) return setMessage("先に写真を追加してください");
    setBusy(true);
    setMessage("画像を解析して出品原稿を作成中です…");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ images, notes, marketplace }) });
      const body = await response.json() as { ok?: boolean; draft?: ListingDraft; error?: string };
      if (!response.ok || !body.draft) throw new Error(body.error || "AI解析に失敗しました");
      setDraft(body.draft);
      setMessage("原稿を生成しました。AIの推定なので、傷・型番・出品禁止物を必ず確認してください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI解析に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages(): Promise<string[]> {
    if (publicImageUrls.length === images.length) return publicImageUrls;
    const response = await fetch("/api/images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ images }) });
    const body = await response.json() as { urls?: string[]; error?: string };
    if (!response.ok || !body.urls) throw new Error(body.error || "公開画像URLの作成に失敗しました");
    setPublicImageUrls(body.urls);
    return body.urls;
  }

  async function publishMercariShops() {
    const errors = [...validation];
    if (!publish.categoryId) errors.push("メルカリShopsの末端カテゴリIDが必要です");
    if (!publish.shippingFromStateId) errors.push("発送元都道府県IDが必要です");
    if (errors.length) return setMessage(errors.join(" / "));
    setBusy(true);
    setMessage("画像を公開URLへ保存し、メルカリShopsへ送信中です…");
    try {
      const imageUrls = await uploadImages();
      const response = await fetch("/api/mercari/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.title,
          description: draft.description,
          price: draft.price_recommended,
          condition: draft.condition,
          imageUrls,
          categoryId: publish.categoryId,
          shippingFromStateId: publish.shippingFromStateId,
          shippingDuration: publish.shippingDuration,
          shippingMethod: publish.shippingMethod,
          shippingPayer: publish.shippingPayer,
          status: publish.status,
          variants: [{ name: "通常", stockQuantity: publish.stock }]
        })
      });
      const body = await response.json() as { product?: { id: string; name: string; status: string }; error?: string };
      if (!response.ok || !body.product) throw new Error(body.error || "出品に失敗しました");
      setMessage(`完了: ${body.product.name}（ID: ${body.product.id} / ${body.product.status}）`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "出品に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draftAsText(draft, marketplace));
    setMessage("出品原稿をコピーしました");
  }

  return <main>
    <header className="hero">
      <p className="eyebrow">PHOTO → AI → LISTING</p>
      <h1>写真を撮るだけ。<br />出品原稿まで一気に作成。</h1>
      <p>公式APIがあるメルカリShopsは公開・非公開出品まで対応。個人版メルカリとYahoo!オークションは規約に沿って最終確認用原稿を出力します。</p>
    </header>

    <section className="card grid two">
      <div>
        <label>出品先</label>
        <select value={marketplace} onChange={e => setMarketplace(e.target.value as Marketplace)}>{Object.entries(marketplaceNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
        <label className="upload">
          <span>カメラ・写真を追加</span>
          <small>正面、裏面、型番、傷のアップを推奨</small>
          <input type="file" accept="image/*" capture="environment" multiple onChange={e => selectPhotos(e.target.files)} />
        </label>
        <div className="previews">{images.map((src, index) => <img key={index} src={src} alt={`商品写真 ${index + 1}`} />)}</div>
        <label>補足メモ（任意）</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="購入時期、使用回数、付属品、動作確認など" />
        <button className="primary" disabled={busy || !images.length} onClick={analyze}>{busy ? "処理中…" : "AIで出品原稿を作る"}</button>
      </div>

      <div>
        <label>タイトル</label>
        <input value={draft.title} maxLength={130} onChange={e => update("title", e.target.value)} />
        <label>説明文</label>
        <textarea className="description" value={draft.description} maxLength={3000} onChange={e => update("description", e.target.value)} />
        <div className="grid two compact">
          <div><label>価格（円）</label><input type="number" min={300} max={9999999} value={draft.price_recommended} onChange={e => update("price_recommended", Number(e.target.value))} /></div>
          <div><label>状態</label><select value={draft.condition} onChange={e => update("condition", e.target.value as ListingDraft["condition"])}>{conditions.map(value => <option key={value}>{value}</option>)}</select></div>
          <div><label>カテゴリ候補</label><input value={draft.category_hint} onChange={e => update("category_hint", e.target.value)} /></div>
          <div><label>ブランド</label><input value={draft.brand} onChange={e => update("brand", e.target.value)} /></div>
        </div>
        {!!draft.questions.length && <div className="notice"><strong>AIからの確認事項</strong><ul>{draft.questions.map(q => <li key={q}>{q}</li>)}</ul></div>}
        {!!draft.prohibited_risk && <div className="danger"><strong>出品可否の確認:</strong> {draft.prohibited_risk}</div>}
      </div>
    </section>

    {marketplace === "mercari-shops" ? <section className="card">
      <h2>メルカリShops 公式API出品</h2>
      <p className="muted">初回はCloudflare Secrets、R2画像バケット、メルカリShops API契約・トークン・登録済み送信元IPが必要です。まずは「非公開」でテストしてください。</p>
      <div className="grid three">
        <div><label>末端カテゴリID</label><input value={publish.categoryId} onChange={e => setPublish(v => ({...v, categoryId: e.target.value}))} placeholder="productCategoriesで取得" /></div>
        <div><label>発送元都道府県ID</label><input value={publish.shippingFromStateId} onChange={e => setPublish(v => ({...v, shippingFromStateId: e.target.value}))} placeholder="例: jp13" /></div>
        <div><label>在庫</label><input type="number" min={0} value={publish.stock} onChange={e => setPublish(v => ({...v, stock: Number(e.target.value)}))} /></div>
        <div><label>発送まで</label><select value={publish.shippingDuration} onChange={e => setPublish(v => ({...v, shippingDuration: e.target.value}))}><option>ONE_TO_TWO_DAYS</option><option>TWO_TO_THREE_DAYS</option><option>FOUR_TO_SEVEN_DAYS</option><option>EIGHT_DAYS_OR_MORE_OR_UNDECIDED</option></select></div>
        <div><label>配送方法</label><select value={publish.shippingMethod} onChange={e => setPublish(v => ({...v, shippingMethod: e.target.value}))}><option>UNDECIDED</option><option>MERCARI_SHIPPING_YAMATO</option><option>MERCARI_SHIPPING_YAMATO_COOL_REFRIGERATED</option><option>MERCARI_SHIPPING_YAMATO_COOL_FROZEN</option><option>COOL</option></select></div>
        <div><label>公開状態</label><select value={publish.status} onChange={e => setPublish(v => ({...v, status: e.target.value as "UNOPENED" | "OPENED"}))}><option value="UNOPENED">非公開（推奨）</option><option value="OPENED">公開</option></select></div>
      </div>
      <button className="primary" disabled={busy} onClick={publishMercariShops}>公式APIで{publish.status === "OPENED" ? "公開出品" : "非公開登録"}</button>
    </section> : <section className="card">
      <h2>{marketplaceNames[marketplace]}用に出力</h2>
      <p className="muted">個人アカウントへの無許可ブラウザ自動操作は実装していません。原稿をコピーまたはCSVで保存し、公式画面で内容を確認して出品してください。</p>
      <div className="actions"><button onClick={copyDraft}>原稿をコピー</button><button onClick={() => downloadText(`${marketplace}-draft.csv`, draftAsCsv(draft, marketplace), "text/csv;charset=utf-8")}>CSV保存</button></div>
    </section>}

    <aside className={validation.length ? "status warn" : "status"}><strong>状態:</strong> {message}{validation.length ? ` / ${validation.join(" / ")}` : ""}</aside>
    <footer>AI推定だけで出品せず、型番・真贋・傷・法令・各サービスの禁止出品物を確認してください。</footer>
  </main>;
}
