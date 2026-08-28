# Home端末別QR監査

更新日: 2026-08-28

Homeの案内欄に、次の2つの公開アプリ用QRを配置します。外部の短縮URL、リダイレクト、アクセス追跡サービスは使用しません。いずれも教材内容は同一で、query parameterは表示するUI構成だけを選択します。

| 表示 | URL | PNG | 寸法 | SHA-256 |
| --- | --- | --- | --- | --- |
| PC・タブレット用 | `https://bonnginn.github.io/brain-practical-navi/?ui=desktop#workspace/home` | `public/access-pc-tablet.png` | 342×342 px | `3a3b6a19627a61b8a6f8097f70f622a320952c210d145e9262a5169fd1fe839b` |
| スマートフォン用 | `https://bonnginn.github.io/brain-practical-navi/?ui=phone#workspace/home` | `public/access-smartphone.png` | 342×342 px | `dd885305d565f82873baed47a9de47701e6569bea25a58259d5b3ea0b7bd2200` |

QRはModel 2、誤り訂正H、quiet zone 4 modules、1 module 6 px、前景 `#173d38`、背景白でプロジェクト内生成しました。PC幅では2列、小画面では1列にし、3Dモデル・Canvas・操作UIへ重ねません。各QRは通常のリンクとしても機能し、代替テキストに端末区分を明記します。

QR画像には解剖画像、ご献体・患者情報、個人情報、第三者の図版を含みません。通常URLには端末UIの強制指定を付けず、既存の画面幅・hover・pointer能力判定を維持します。
