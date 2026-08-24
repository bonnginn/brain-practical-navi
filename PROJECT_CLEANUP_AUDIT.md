# プロジェクト・クリーンアップ監査

更新日: 2026-08-24

## 対象

現行アプリはReact／Viteの静的教材で、`vite.config.ts` からSites用Vite pluginとPWA pluginを使用する。`.openai/hosting.json` はD1／R2を使用しない設定で、`package.json` にNext.js、Vinext、Drizzle、Cloudflare D1の依存関係や実行scriptはない。

初期スターターから残っていた次の未使用ファイルを削除した。

- Next.jsの空設定と型宣言: `next.config.ts`、`next-env.d.ts`
- 未使用のD1／Drizzle雛形: `db/`、`drizzle/`、`drizzle.config.ts`、`examples/d1/`
- 未使用のVinext Worker雛形: `worker/`
- 現在の依存関係では実行不能だったNext.js向けESLint設定: `eslint.config.mjs`

現役の `build/sites-vite-plugin.ts`、`build/pwa-vite-plugin.ts`、`.openai/hosting.json`、Vite設定、教材アセット、監査用fixtureは残した。ローカル証拠を含むgitignored `work/` と、再取得コストの大きい `node_modules/` も削除対象にしていない。

再生成可能な `dist/`、`tsconfig.tsbuildinfo`、`scripts/__pycache__/` と、PWA再監査専用の一時build root `work/pwa-current-head-63e6974/` は、最終検証後に作業フォルダから削除した。PWAのJSON監査成果物を含む他の `work/` は保持している。これはソース、監査証拠、公開アセットを削除する操作ではない。

## 完了条件

- 旧スターターの入口・設定・DB例が追跡対象に残らない。
- Viteの型検査、通常build、Pages build、全自動テストが成功する。
- PWA／Sitesの現役pluginとホスティング設定を保持する。
- main統合、公開サイト更新、Sitesへの配備を行わない。

## 検証結果

2026-08-24、削除後に全自動テスト392/392、TypeScript型検査、通常／Pages本番buildが成功した。両buildで `.openai/hosting.json` がソースと一致し、`server/index.js` が存在し、未使用の `.openai/drizzle` が生成されないことも確認した。SolレビューでP0／P1はなかった。最終検証後に上記の再生成可能物だけを削除し、PWA JSON監査成果物と他のローカル証拠が残ることを再確認した。
