# qgis-dify-tourism-poc

QGIS で観光エリア指標を作り、Dify で根拠付きの自然言語説明を返す PoC です。

## Main Branches

- `master`
  - 設計資料と QGIS 作業ファイル中心
- `codex/map-ui-dify-integration`
  - `web/` の地図 UI と Dify 右レールを含む最新ブランチ

ローカルで確認するときは、通常 `codex/map-ui-dify-integration` を使います。

## Local Verification

### QGIS

QGIS で確認するファイル:

- `qgis/phase1-tourism-poc.qgz`
- `data/boundaries/phase1-areas-working.gpkg`

### Web UI

`web/` は `Node 24.13.1` 以上を前提にしています。

`Node 14` では `npm ci` や `vite` が失敗します。Windows 由来の古い `nvm` 設定やログインシェルの既定値が残っている場合は、先にバージョンを切り替えてください。

```bash
git switch codex/map-ui-dify-integration
nvm use
cd web
nvm use
cp -n .env.example .env
npm ci
npm run dev
```

ブラウザ確認先:

- `http://127.0.0.1:5173`

### Dify Proxy

Dify 接続まで確認する場合:

```bash
cd web
nvm use
cp -n .env.proxy.example .env.proxy
npm run dify:proxy
```

必要な環境変数:

- `DIFY_API_KEY`
- `DIFY_API_BASE_URL`
- `DIFY_APP_PATH`

`VITE_DIFY_CHAT_ENDPOINT` はローカル開発では `/api/dify/chat` を推奨します。

## Key Docs

- `docs/poc-design.md`
- `docs/dify-setup-checklist.md`
- `docs/railway-deploy.md`
- `docs/progress-and-next-steps.md`
