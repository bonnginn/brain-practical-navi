# 脳梁・帯状回側の修正を公開βへ反映 — 2026-09-30

ユーザーの公開指示を受け、脳梁ID30の広域誤収録を除外した開発版をPR [#44](https://github.com/bonnginn/brain-practical-navi/pull/44) で `main` に統合した。マージコミットは `4084daa9f8477e6f68ef2a16381643ef0d71ed55`。対象は[脳梁境界の個別記録](CALLOSUM_CINGULATE_BROAD_REPAIR_2026-09-30.md)とその可逆差分、断面・ブロック表示同期、履歴検査の後継関係である。ユーザー側の未コミット `CONTRIBUTING.md` は含めていない。

PR CIは通常build・権利表示監査・Node全667件・Python全試験、およびPages形式build・権利表示監査に成功した。GitHub Pagesの[配信実行](https://github.com/bonnginn/brain-practical-navi/actions/runs/36610152612)もbuild・deployに成功した。公開URLから取得した圧縮分節ラベルSHA-256は `71f012431e3bd605deabc8d19b9cdaf1d35dff076f54e7a9f84a32e3a4eb5866`、公開validationのID30は97,034点で、開発版と一致した。公開矢状断で脳梁の選択と白質帯の表示を確認した。既存PWAタブには旧シェルの更新案内が残る場合があるため、古い表示と新しい配信資産を混同しない。

これは教材用の近似的な分節修正であり、専門家監修済みではない。公開βの区分と利用上の注意は維持する。
