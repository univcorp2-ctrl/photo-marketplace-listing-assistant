# 初期設定ガイド

## 1. Web画面を確認

Cloudflare PagesのProduction URLをスマートフォンで開きます。Secret未設定でも写真選択、画面編集、コピー、CSV出力UIは確認できます。`/api/health` は `openai`、`mercariShops`、`imageStorage` の設定状態を返します。

## 2. 写真AI解析を有効化

Cloudflare Dashboard → Workers & Pages → `photo-marketplace-listing-assistant` → Settings → Variables and Secrets → Add。

- Type: Secret
- Name: `OPENAI_API_KEY`
- Value: OpenAI project API key
- 通常変数: `OPENAI_MODEL=gpt-5.6`

保存後に再デプロイします。API keyをGitHub、ブラウザ、チャットへ貼らないでください。

## 3. R2画像保存を有効化

1. Cloudflare Dashboard → R2 → Create bucket。
2. bucket名を `photo-marketplace-listing-images` とする。
3. Pagesプロジェクト → Settings → Bindings → Add → R2 bucket。
4. Variable nameを **`LISTING_IMAGES`**、bucketを上記に指定。
5. PagesのProduction URLを通常変数 **`PUBLIC_BASE_URL`** に設定。
6. 再デプロイ。

画像は商品ページから取得される公開URLです。R2 lifecycle ruleで必要期間後に削除する運用を推奨します。

## 4. メルカリShops公式APIを有効化

個人版メルカリアカウントのtokenではありません。メルカリShops管理画面でAPI利用条件を満たし、Personal API Access Tokenを発行します。契約時に指定・割当されたAPI client nameをUser-Agentへ使用します。

Cloudflare Secrets/Variables:

- Secret: `MERCARI_SHOPS_TOKEN`
- Secret: `MERCARI_SHOPS_USER_AGENT`（例: `ASSIGNED_CLIENT_NAME/1.0.0`）
- Sandbox: `MERCARI_SHOPS_API_ENDPOINT=https://api.mercari-shops-sandbox.com/v1/graphql`
- Production: `MERCARI_SHOPS_API_ENDPOINT=https://api.mercari-shops.com/v1/graphql`

本番tokenとSandbox tokenは相互利用できません。最初はSandbox、商品statusは `UNOPENED` にしてください。

### 固定IPが必要な場合

メルカリShops側へ登録可能な日本国内固定IPを持つrelay APIが必要です。Cloudflare Pagesの通常変数 `MERCARI_API_PROXY_URL` にrelay endpointを設定します。relay interfaceの切替は実装済みですが、固定IP契約とメルカリ側の許可はアカウント所有者による手続きが必要です。

## 5. カテゴリIDと都道府県ID

Secrets設定後、`GET /api/mercari/options` を開くと公式APIのカテゴリ、都道府県、配送選択肢がJSONで返ります。カテゴリは `hasChild=false` の末端IDだけが出品に使用できます。

## 6. MCPを接続

Codespacesまたはローカルで `npm install` 後、MCPクライアントから `npm run mcp` をstdio serverとして起動します。環境変数はMCPクライアントのSecret/env機能で渡します。

## 7. 本番前チェック

- 写真に型番、付属品、傷を含めたか
- AIの質問が残っていないか
- 真贋・動作を推測で断定していないか
- 禁止出品物、許認可、知的財産権を確認したか
- 価格、送料負担、配送方法、在庫を確認したか
- `UNOPENED`で商品が正しく作られたか
- 本番endpoint/tokenへ切り替えたか
