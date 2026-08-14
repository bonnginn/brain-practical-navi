# Windows Codex への引き継ぎ

この文書は、Macで作成した現在の公開α版候補をWindows側のCodexで再開するための手順です。

## 1. 取得

Git、Node.js 22以降、npmをインストールしたPowerShellで実行します。

```powershell
git clone https://github.com/bonnginn/brain-practical-navi.git
cd brain-practical-navi
git switch codex/alpha-ui-quiz-fixes
npm install
```

通常は環境変数を設定しなくても動作します。意見フォーム等を変更する場合だけ、次のようにローカル設定を作成します。

```powershell
Copy-Item .env.example .env.local
```

`.env.local` はGitへコミットしません。

## 2. 起動

```powershell
npm run dev -- --host 127.0.0.1
```

ブラウザで `http://127.0.0.1:5174/#workspace` を開きます。ポート5174が使用中なら、Viteが表示したURLを使用してください。

## 3. 最初の検証

```powershell
npm test
npm run build
```

Windows再監査後は自動テスト32件が通過しています。必要な実行時データは `public/atlas/` に収録しています。講義PPT、`work/`、`outputs/`、展開前後の作業用データは意図的にリポジトリへ含めていません。

## 4. ブラウザ確認順

次を実画面で一周し、各ページで表示崩れ、クリック、回転、ズーム、着脱を確認してください。

1. トップページ
2. 脳表観察：外側面、上面、下面、内側面、脳底動脈、脳神経、自由観察
3. 断面観察：冠状断、水平断、矢状断、複数構造着色、拡大縮小
4. ブロック標本：各標本の初期角度、回転、部品着脱
5. 復習テスト：出題数、項目、誤答のみ、履歴消去
6. 手動セグメンテーション：描画、Undo/Redo、差分JSON入出力
7. 利用条件・クレジット、意見送信導線

特に、橋・延髄を外したときに錐体・オリーブの補助ポリゴンだけが残らないことを確認してください。

## 5. 現在の品質上の注意

- 神経血管、脳底ランドマーク、溝・裂、深部構造の一部は教育用の模式表示で、正解セグメンテーションではありません。
- セグメンテーションはα版として主要構造を学習できる段階ですが、専門家による位置・範囲の再確認が必要です。
- Windows側ではブラウザ操作を使い、全ページの視覚QAを優先してください。
- Windows側の第二巡では全23経路を通常幅、320 / 390 / 760 / 761 / 1024 px、1366 × 768 pxで確認し、詳細を `PRESENTATION_AUDIT.md` に記録しています。
- 権利条件とデータ出典は `DATA_AND_LICENSES.md`、公開判断は `ALPHA_RELEASE_AUDIT.md` を参照してください。

## 6. 作業の進め方

現在の開発ブランチは `codex/alpha-ui-quiz-fixes` です。Windows側で追加修正を始める際は、このブランチから新しい `codex/` ブランチを作成すると、Mac側までの状態を保ったまま比較できます。
