# PWA端末追加導線監査

更新日: 2026-08-24

## 対象と表現境界

ホームへ「端末に追加」カードを追加した。対応するChromium系ブラウザが `beforeinstallprompt` を提供した場合だけ、利用者の明示クリックで「アプリとして追加」を呼び出す。自動prompt、繰返し勧誘、状態の永続保存、分析送信、個人・端末識別は行わない。standalone表示または `appinstalled` を受けた画面では「アプリとして起動中」と表示する。

promptを提供しない環境は失敗扱いにせず、共有メニューやブラウザメニューから追加できる場合があると案内する。acceptedは「追加操作を受け付けた」とだけ表示し、実際のインストール完了を断定しない。dismissedとerrorも区別する。

同じカードで、オンラインで一度開いた同一サイト内教材を利用時に保存すること、約92 MBを一括保存しないこと、未訪問教材や保存削除後には通信が必要なことを明示する。既存Service Workerのcache allowlist、更新方針、全量precache禁止は変更していない。

## 実装と自動検証

- `src/pwaInstallAffordance.mjs` がprompt捕捉、明示要求、単一使用、同時要求の集約、installed／standalone、cleanup、非対応／SSR安全性を分離して扱う。
- `scripts/audit_pwa_install_affordance.mjs` がUI、44 px操作、base-path対応apple-touch-icon、過剰表現、privacy、既存PWA／cache契約を独立監査する。
- `tests/pwa-install-affordance.test.mjs` がaccepted／dismissed／appinstalled、二重prompt防止、cleanup、非対応環境と監査mutationを検査する。
- 型検査、通常build、Pages build、PWA停止・復帰監査を再実行した。

## ローカル実ブラウザ結果

Chrome 151／Windowsの通常production previewで、1366×768と390×768相当についてaccepted、dismissed、appinstalledの3状態、計6/6件を確認した。合成 `beforeinstallprompt` はUI状態契約だけの証拠であり、実インストールではない。明示クリック前prompt 0、クリック後prompt 1、44 px以上、installed時のbutton 0、loader／UI error／横overflow 0だった。

通常／Pages buildのserver-unavailability監査も各10 action、合計20/20、blocker 0、独立validator passを維持した。通常版のcanonical 27経路×3幅×direct／reloadは162/162件、cold初期payloadは27/27件が合格し、新しいネットワーク資産は追加していない。

## 未確認

- ブラウザまたはOSによる実際のホーム画面追加と、追加後の起動
- 公開URL・公開回線でのinstallability
- 物理スマートフォン、実機タッチ、OS保存領域の削除・回収
- Safari・別ブラウザ、別GPU、installed PWAとしての更新・復帰

したがって、PWAのGo／No-Go項目は未完了のままとする。
