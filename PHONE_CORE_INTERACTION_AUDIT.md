# coarse-touch phone中心操作監査

更新日: 2026-08-24

## 目的と境界

β候補のスマートフォン専用UIについて、下部dock、脳表、断面、復習、ブロック標本ガイドの中心操作が、coarse-touch条件で実際のタッチイベント列により状態遷移することを確認する。表示の画素品質、メッシュやラベルの解剖学的妥当性、専門家レビュー、公開可否は判定しない。スマートフォンUI全体のβ完了判定にも用いない。

対象はWindows 11 Home、Node 24.19.0、Chrome 151.0.7922.170、通常production preview `http://127.0.0.1:4329/`。Chrome DevTools Protocolで幅390×高さ768、DPR1、`mobile:true`、`touch:true`、最大同時タッチ5、`portraitPrimary`を設定し、`hover:none`、`pointer:coarse`とphone判定が一致することを確認した。これはローカル実ブラウザ上のcoarse-touch emulationであり、物理端末の測定ではない。

## 保存結果

最終の権威ある結果は `work/browser-audit/phone-core-interactions-v17-block-guided-2026-08-24.json`（ローカル作業用・配布対象外）である。`allPassed: true`、5 journey、`validation.passed: true`、validation failure 0だった。各操作対象について、44 px以上、画面内、hit-test可能、対象の意味キー、touch geometry、`primaryTouchId`、target／touch ID対応、タッチイベント列を記録した。tapはtouchPoints 1→0、dragは1→1→0であり、初期・最終probeはclient／inner／screenの390×768、DPR1、最大同時タッチ5、phone能力、Canvas、loader、UI／console／request error、横overflow、WebGL fallbackを記録する。v12／v13は検証失敗のため、本記録の成果根拠に含めない。

## 操作契約と確認結果

- **dock**: Home、脳表、断面、ブロック標本、復習の5導線をタッチで選択し、期待hash、active状態、Canvas数を確認した。
- **surface-lateral**: 初期の内側面から設定sheetの左外側面ボタンを実タッチで選択し、hashとviewが変わることを確認して閉じた。その後、target key `precentral`をタッチ選択し、`selectedKeys`とafterProbeの選択状態が連続することを確認した。`learningModelStage`へのタッチドラッグで回転し、入力差分から期待値を再計算した後、向きのリセット後も選択状態が維持されることを確認した。
- **sections-horizontal**: 初期の矢状断から設定sheetの水平断ボタンを実タッチで選択し、hashとplaneが変わることを確認して閉じた。断面位置を52から53へ進め、表示値と一致しページスクロールが維持されることを確認した。`3Dのみ`と`断面のみ`を切り替え、最終状態を記録した。
- **quiz**: 設定sheetで5問を選び、問題signatureが変わる新しい5問queueを開始した。誤答optionのfeedbackを確認し、question target `aca`がwrong-answerからreview-linkへ連続すること、回答対象から独立に導出した復習先（脳表・主要動脈）と実際のリンク遷移が一致することを確認した。
- **blocks**: 下部dockから側脳室ブロック標本を開き、試作introを閉じてCanvas 0→1を確認した。部品確認ガイドを開始すると既存4 layerのうち`ventricular-cavity`だけが選択され、次へ進むと`caudate`だけへ変化した。終了後は開始前の4 layer選択へ復元された。これはUI上の確認順と状態復元だけの検証であり、解剖学的順序・摘出順・実習手順の妥当性は判定しない。

全journeyでready後のloader、UI／console／request error、横overflow、WebGL fallbackは0件だった。これは導線と意味的状態遷移の確認であり、実際のスマートフォン性能、画素品質、3D操作全体、教材の解剖学的妥当性を保証しない。

## 独立検証の範囲

保存reportのvalidatorは、固定5 journey、schema／tool／loopback URL、Windows／Node24／Chrome151、viewportとemulation、summary／probeの対応、surface target keyと選択状態の連続性、wrong-answerからreview-linkまでのquestion target連続性、対象・タッチ証拠のgeometry・`primaryTouchId`・target／touch ID・sequence・touchPoints 1→0／1→1→0、dockのhashとCanvas、脳表の実設定遷移・回転式・reset、断面の実設定遷移・位置・表示値・layout、クイズのqueue・signature・誤答・復習先、ブロック標本のintro・specimen key・guide step・単独layer・終了後の手動layer復元を再計算する。自己申告の`allPassed`だけでは合格にならない。

## 未確認事項

- 物理スマートフォン、実機タッチ、実機のDPR・safe-area・画面キーボード・性能差は未確認。
- Safari、Firefox、Edgeなどの別ブラウザ、別GPU、公開URL・公開回線は未確認。
- インストール済みPWA、ホーム画面追加後の起動、OS／物理ネットワーク断は未確認。
- 画素単位の可読性、3Dの見え方、構造境界・名称・位置の解剖学的妥当性、専門家レビューは別途確認が必要。
