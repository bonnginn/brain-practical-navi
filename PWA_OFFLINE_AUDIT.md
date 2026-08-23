# PWA・オフライン監査

更新日: 2026-08-23

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
- [x] 初回install要求にatlas／mesh／volumeなど大容量教材が含まれないことを確認する（最終Pages buildはshell 5件・632,174 bytes、最終通常buildはshell 5件・631,941 bytes）。
- [ ] Homeと代表的な教材経路をオンラインで一度開いた後、Network offlineで直接表示・再読込・基本操作を確認する。
- [ ] 未訪問教材では黒画面にせず、既存の読込失敗・再試行表示とオフライン表示を確認する。
- [ ] オンライン復帰後に再試行できることを確認する。
- [x] Pages baseでmanifest URL、worker URL、scopeを確認する。
- [ ] Pages baseで通信失敗時のnavigation fallbackを確認する。
- [x] 既存の全経路オンライン監査に回帰がないことを確認する（通常build、26経路×3幅×direct/reload＝156/156）。

上記のチェックは実測後だけ更新する。ローカル確認を公開URL、物理端末、Safari・別ブラウザの確認として扱わない。

2026-08-23、Chrome 151のローカルPages build `http://127.0.0.1:4219/brain-practical-navi/` で、manifest、active Service Worker、controller、scope、shell 5件を確認した。脳表・左外側面をオンラインで開いた後はCanvas 1、loader／alert 0、data cache 5件だった。通信遮断後の再読込はCodex内蔵ブラウザのURL安全ポリシーに拒否されたため、別経路で迂回せず、offline direct/reload以下は未確認のまま残した。

同日、Chrome 151のローカル通常build `http://127.0.0.1:4224/` で、manifest URL `http://127.0.0.1:4224/manifest.webmanifest`、activeかつactivated状態のworker／controller `http://127.0.0.1:4224/service-worker.js`、scope `http://127.0.0.1:4224/`、release別shell cache 1個・5件を確認した。生成物監査のshell合計は631,941 bytesで、実ブラウザのcache entryもHTML、favicon、manifest、entry CSS／JavaScriptの5件に一致した。Chromeのmanifest parse errorとinstallability errorはいずれも0件だったが、実際のホーム画面追加や追加後起動を行っていないため、インストール完了とは扱わない。内蔵ブラウザでも同じmanifest URL、画面エラー0、横あふれなし、利用条件の更新日 `2026-08-23` を確認した。通信遮断、オフライン再読込、未訪問教材、復帰後再試行は実施していない。

最終通常build `http://127.0.0.1:4221/` は `work/browser-audit/beta-route-audit-pwa-final-2026-08-23.json` で26経路×3幅×direct/reload＝156/156件が合格した。
