# PWA・オフライン監査

更新日: 2026-08-24

## 対象と方針

β候補へ、Web App Manifest、192／512 px PNGアイコン、Service WorkerによるPWA基盤を追加した。実際のインストール操作は未確認であり、「インストール可能」の実測完了とは扱わない。`public/` 全体は約92.4 MBであるため、インストール時に全教材を一括取得しない。初回はHTML、ビルドで生成したentry JavaScript／CSS、manifest、faviconだけをアプリシェルとして保存する。同一origin・同一scope内の成功した静的GETは、その教材をオンラインで利用した時点で保存する。

したがって「主要機能を必ず完全オフラインで利用できる」とは表現しない。一度開いた経路とそこで取得済みの教材は再利用できるが、未訪問の教材、外部リンク、ブラウザまたはOSが保存領域を削除した場合は通信が必要である。

## 実装上の境界

- 通常配信 `/` とGitHub Pages `/brain-practical-navi/` の両方で、worker自身のscopeを基準に相対URLを解決する。
- navigationとmanifestはnetwork-firstとし、navigation失敗時は保存済みindexへ戻してhash routeを復元する。
- hash付きbundleはcache-first、その他の同一サイト内静的資産は初回利用時にrelease単位のdata cacheへ保存する。
- 外部origin、`/cdn-cgi/`、GET以外、Range要求、不透明応答、非2xx応答は保存しない。
- Cache APIの容量不足や`cache.put`失敗は握りつぶし、オンライン応答を利用者へ返す。
- `skipWaiting`は使わない。新workerは既存画面を作業中に強制切替せず、activate時に旧release cacheだけを削除する。
- 開発ビルドでは登録せず、本番ビルドだけで登録する。Service Worker非対応・登録失敗でも通常画面を壊さない。
- 画面がオフラインになると上部に「オフライン」と表示する。

## 自動検証

`tests/pwa.test.mjs` はmanifestの相対scope、production限定登録、強制更新の不使用、同一origin／成功応答／GET／Range除外、navigation fallback、全量precache不使用を検査する。

`scripts/audit_pwa_build.mjs` は本番`dist/`を対象に、manifest・worker・shell対象の存在、shell 1,000,000 bytes未満、大容量教材がshellへ混入していないこと、主要なworker不変条件を検査する。通常buildとPages buildの両方で実行する。

## 実ブラウザ受入項目

- [x] 通常baseでmanifest URL、active Service Worker、controller、worker URL、scopeを確認する。
- [ ] ブラウザまたはOSのホーム画面追加を実際に完了し、追加後の起動を確認する。
- [x] Homeに明示操作の端末追加案内を置き、非対応環境と限定的なオフライン範囲を過剰表現なく案内する。
- [x] 初回install要求にatlas／mesh／volumeなど大容量教材が含まれないことを確認する（v10後の最終Pages buildはshell 5件・633,760 bytes、最終通常buildはshell 5件・633,527 bytes）。
- [x] Homeと代表的な教材経路をオンラインで一度開いた後、runnerが所有するローカル静的サーバーを停止し、保存済み経路の直接表示・再読込・基本操作を確認する（Chrome 151／Windows／Node 24、通常base・Pages base）。
- [x] 未訪問教材では黒画面にせず、既存の読込失敗・再試行表示を確認する。これはサーバー停止中の既存UI確認であり、`navigator.onLine`や「オフライン」バッジを合格条件にしない。
- [x] 同じhost／portへ再listenした後、再試行で未訪問教材のGET成功とCache Storageへの保存を確認する。
- [x] Pages baseでmanifest URL、worker URL、scopeを確認する。
- [x] Pages baseで通信失敗時のnavigation fallbackを確認する（保存済みhash routeのdirect／reload／`about:blank`からの復帰）。
- [x] 既存の全経路オンライン監査に回帰がないことを確認する（通常build、26経路×3幅×direct/reload＝156/156）。

上記のチェックは実測後だけ更新する。ローカル確認を公開URL、物理端末、Safari・別ブラウザの確認として扱わない。

2026-08-23、Chrome 151のローカルPages build `http://127.0.0.1:4219/brain-practical-navi/` で、manifest、active Service Worker、controller、scope、shell 5件を確認した。脳表・左外側面をオンラインで開いた後はCanvas 1、loader／alert 0、data cache 5件だった。通信遮断後の再読込が内蔵ブラウザのURL安全ポリシーに拒否された記録はv10以前の履歴であり、下記のrunner所有サーバー停止監査とは分けて扱う。

同日、Chrome 151のローカル通常build `http://127.0.0.1:4224/` で、manifest URL `http://127.0.0.1:4224/manifest.webmanifest`、activeかつactivated状態のworker／controller `http://127.0.0.1:4224/service-worker.js`、scope `http://127.0.0.1:4224/`、release別shell cache 1個・5件を確認した。生成物監査のshell合計は631,941 bytesで、実ブラウザのcache entryもHTML、favicon、manifest、entry CSS／JavaScriptの5件に一致した。Chromeのmanifest parse errorとinstallability errorはいずれも0件だったが、実際のホーム画面追加や追加後起動を行っていないため、インストール完了とは扱わない。内蔵ブラウザで通信遮断を行っていないという記録はv10以前の履歴として残し、v10のローカルserver-unavailability結果を現在の受入証拠とする。

最終通常build `http://127.0.0.1:4221/` は `work/browser-audit/beta-route-audit-pwa-final-2026-08-23.json` で26経路×3幅×direct/reload＝156/156件が合格した。

## 2026-08-23 v10 ローカルserver-unavailability受入監査

権威ある結果は `work/browser-audit/pwa-offline-recovery-v10-2026-08-23.json` とする。`scripts/audit_pwa_offline_browser.mjs` が通常buildとPages buildの静的サーバーを自ら起動・停止し、同じloopback host／portへ再listenした。Windows 11／Chrome 151／Node 24で、通常base・Pages baseの各10 action（合計20/20）が独立validatorで再計算され、blocker 0だった。各baseでlistener停止、追跡socket 6件の破棄、TCP `ECONNREFUSED`、通常HTTP cacheのclear＋disable ACK（Cache Storageは保持）を記録した。

オンラインで訪問済みの脳表経路は、サーバー停止中もService Workerからdirect／reload／`about:blank`→hash routeで復帰し、Canvas 1、loader／UI error／横overflow／WebGL fallback 0を確認した。未訪問のBigBrain assetは停止前にCache Storageへ存在せず、停止中は既存の読込失敗・再試行UIを確認した。再listen後の同じportで、対象GET `200`・11,904,805 bytes、Cache Storage entry +1、Canvas 3を確認した。

これはrunner所有のローカルHTTP listener停止による回復性監査である。`navigator.onLine`はtrueのままで、オフラインバッジは合格条件にしていない。物理的なネットワーク／OSオフライン、公開URL、物理端末、Safari・別ブラウザ、インストール済みPWA、ホーム画面追加と起動は確認していない。したがってホーム画面追加を含むPWA全体の完了チェックは未完了のまま維持する。再現手順とテスト契約は `scripts/audit_pwa_offline_browser.mjs` と `tests/pwa-offline-browser-audit.test.mjs` に記録した。

## 2026-08-24 端末追加導線後の再監査

Homeへ明示クリック式の端末追加カードを追加した後、通常／Pages buildでserver-unavailability監査を再実行し、各10 action、合計20/20、blocker 0、独立validator passを維持した。合成 `beforeinstallprompt` によるPC／390 px相当のUI状態監査は6/6件、canonical routeは162/162件、cold初期payloadは27/27件だった。実インストールを行った結果ではない。詳細は [PWA_INSTALL_AFFORDANCE_AUDIT.md](PWA_INSTALL_AFFORDANCE_AUDIT.md) を参照する。

## 2026-08-24 コミット63e6974再監査

Google Formの読み取り専用preflight追加後のコミット `63e6974` から、通常／Pagesの本番生成物を別rootへ作り、`scripts/audit_pwa_offline_browser.mjs` をポート4330／4331で再実行した。権威あるローカル成果物は `work/browser-audit/pwa-offline-recovery-current-head-63e6974-2026-08-24.json` である。Windows 11 Home／Node 24.19.0／Headless Chrome 151.0.7922.170で、各base 10 action、合計20/20、blocker 0、独立validator passだった。

両baseでlistener停止時に追跡socket 6件を破棄し、同じhost／portへのTCP接続が `ECONNREFUSED` になることを確認した。通常HTTP cacheはclear＋disable ACK、Cache Storageは保持した。訪問済み脳表経路は停止中もService Workerからdirect／reload／`about:blank`復帰し、未訪問の `bigbrain-icbm500.bin.gz` は停止中に既存error／retry UIを示した。再listen後の再試行はGET 200・11,904,805 bytes、Cache Storage +1、Canvas 3、loader／UI error／横overflow／WebGL fallback 0だった。

これはコミット `63e6974` のローカル生成物に対するrunner所有HTTP server停止の再確認であり、物理／OSネットワーク断、公開URL、物理端末、Safari・別ブラウザ、インストール済みPWA、ホーム画面追加と追加後起動を確認したものではない。PWA全体のチェックとGo／No-Go stateは未完了のまま維持する。
