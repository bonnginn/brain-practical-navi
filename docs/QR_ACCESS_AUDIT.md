# Home端末別QR監査

更新日: 2026-08-28

Homeの案内欄に、次の2つの公開アプリ用QRを配置します。外部の短縮URL、リダイレクト、アクセス追跡サービスは使用しません。いずれも教材内容は同一で、query parameterは表示するUI構成だけを選択します。

| 表示 | URL | PNG | 寸法 | SHA-256 |
| --- | --- | --- | --- | --- |
| PC・タブレット用 | `https://bonnginn.github.io/brain-practical-navi/?ui=desktop#workspace/home` | `public/access-pc-tablet.png` | 342×342 px | `3a3b6a19627a61b8a6f8097f70f622a320952c210d145e9262a5169fd1fe839b` |
| スマートフォン用 | `https://bonnginn.github.io/brain-practical-navi/?ui=phone#workspace/home` | `public/access-smartphone.png` | 342×342 px | `dd885305d565f82873baed47a9de47701e6569bea25a58259d5b3ea0b7bd2200` |

QRはModel 2、誤り訂正H、quiet zone 4 modules、1 module 6 px、前景 `#173d38`、背景白でプロジェクト内生成しました。PC幅では2列、小画面では1列にし、3Dモデル・Canvas・操作UIへ重ねません。各QRは通常のリンクとしても機能し、代替テキストに端末区分を明記します。

QR画像には解剖画像、ご献体・患者情報、個人情報、第三者の図版を含みません。通常URLには端末UIの強制指定を付けず、既存の画面幅・hover・pointer能力判定を維持します。

## 2026-09-26 公開候補の再確認

教育目的の入口を分離した9月22日の変更に合わせ、両QRの行先は `#workspace/entrance` へ変更済み。上記は旧版の記録として残す。公開候補のPNGをZXingで復号し、下記URLと一致することを確認した（外部転送・追跡URLなし）。現行画像は270×270 px、QR Model 2 / version 5 / 誤り訂正M。

| PNG | 復号URL | SHA-256 |
| --- | --- | --- |
| `access-pc-tablet.png` | `https://bonnginn.github.io/brain-practical-navi/?ui=desktop#workspace/entrance` | `aa0d084c2697cf91e72420315edbfc5799c361d6951825c6f01e88cee59ad24c` |
| `access-smartphone.png` | `https://bonnginn.github.io/brain-practical-navi/?ui=phone#workspace/entrance` | `20653adbe795fb545e40d23fcb2ca16dd94b7f71e5dfdc9657dafbef7d1b8791` |
