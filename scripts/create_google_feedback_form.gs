/**
 * 脳実習ナビ：フィードバック／共同制作フォーム生成スクリプト
 *
 * 使い方:
 * 1. https://script.google.com/ で「新しいプロジェクト」を作る。
 * 2. Code.gs の内容をすべて削除し、このファイルを貼り付ける。
 * 3. CONFIG.CONTACT_TEXT と CONFIG.RETENTION_TEXT を確認する。
 * 4. createBrainPracticalFeedbackForm を実行し、Googleの権限確認を許可する。
 * 5. 実行ログに出た EDIT_URL、RESPONDER_URL、SHEET_URL を開く。
 *
 * 同じスクリプトプロジェクトで再実行しても、フォームを重複作成せず
 * 既存URLを再表示します。新規に作り直す場合だけ resetStoredFormIds を実行します。
 */

var CONFIG = {
  FORM_TITLE: '脳実習ナビ｜修正提案・共同制作フォーム',
  RESPONSE_SHEET_TITLE: '脳実習ナビ｜フォーム回答・運用管理',
  PROJECT_NAME: '脳実習ナビ',
  CONTACT_TEXT: '不具合・修正提案：https://github.com/bonnginn/brain-practical-navi/issues',
  RETENTION_TEXT: '保存期間：教材改善と共同制作の連絡に必要な期間。不要になった連絡先は削除します。',
};

function createBrainPracticalFeedbackForm() {
  var properties = PropertiesService.getScriptProperties();
  var savedFormId = properties.getProperty('BRAIN_PRACTICAL_FORM_ID');
  var savedSheetId = properties.getProperty('BRAIN_PRACTICAL_SHEET_ID');

  if (savedFormId && savedSheetId) {
    var existingForm = FormApp.openById(savedFormId);
    var existingSheet = SpreadsheetApp.openById(savedSheetId);
    refreshExistingForm_(existingForm, existingSheet);
    logResult_(existingForm, existingSheet, true);
    return;
  }

  var form = FormApp.create(CONFIG.FORM_TITLE, true);
  form
    .setDescription(buildDescription_())
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setShowLinkToRespondAgain(true)
    .setConfirmationMessage(
      '送信ありがとうございました。内容を確認し、教材改善の参考にします。' +
      '共同制作を希望された場合も、すべての方へ返信または採用を保証するものではありません。'
    )
    .setAcceptingResponses(true)
    .setPublished(true);

  // 最初の回答で、匿名フィードバックと共同制作希望を分岐させます。
  var routeItem = form.addMultipleChoiceItem()
    .setTitle('今回の連絡に最も近いものを選んでください')
    .setHelpText('回答内容に応じて、次に表示する質問を切り替えます。')
    .setRequired(true);

  var feedbackPage = form.addPageBreakItem()
    .setTitle('修正提案・不具合・使いにくさ')
    .setHelpText('匿名で送信できます。分かる範囲だけ具体的に記載してください。');

  form.addMultipleChoiceItem()
    .setTitle('提案・報告の種類')
    .setChoiceValues([
      '解剖学的な修正',
      'セグメンテーション／表示位置の修正',
      '操作性・アクセシビリティ',
      'クイズ・解説の修正',
      '機能提案',
      '権利・クレジット・データ表示',
      'その他',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('対象画面（複数選択可）')
    .setChoiceValues([
      '断面実習',
      '脳表観察',
      'ブロック標本',
      '脳底動脈・脳神経標本',
      '復習クイズ',
      'セグメンテーション編集ツール',
      'CC・権利・データ表示',
      'アプリ全体',
    ])
    .showOtherOption(true);

  form.addTextItem()
    .setTitle('対象を再現する情報')
    .setHelpText('例：水平断 52、単一標本0.5、被殻を選択、ブロック標本「側脳室の全景」');

  form.addParagraphTextItem()
    .setTitle('問題点・提案内容')
    .setHelpText('どこが、どのように見える／動くかを記載してください。')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('望ましい修正案')
    .setHelpText('正しい構造名、位置、表示方法、操作方法など。分からない場合は空欄で構いません。');

  form.addParagraphTextItem()
    .setTitle('根拠となる資料')
    .setHelpText('公開URL、DOI、書誌情報、自作の説明など。教科書・講義図版そのものは転載しないでください。');

  form.addMultipleChoiceItem()
    .setTitle('重要度')
    .setChoiceValues([
      '学習上の誤りにつながるため優先修正が必要',
      '操作を妨げる不具合',
      '改善すると分かりやすくなる',
      '将来の追加候補',
      '判断できない',
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('返信先（任意）')
    .setHelpText('返信が必要な場合のみ、メールアドレスまたはGitHubユーザー名を記載してください。');

  form.addMultipleChoiceItem()
    .setTitle('修正履歴への掲載可否')
    .setChoiceValues([
      '匿名で内容を掲載してよい',
      '希望する表示名を含めて掲載してよい',
      '掲載しないでほしい',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('送信前の確認')
    .setChoiceValues([
      '患者情報、献体者・学生を特定できる情報、公開許諾のない標本写真、第三者の図版を含めていません。',
    ])
    .setRequired(true);

  // このページブレークに到達する直前（フィードバックページ終了時）に送信します。
  var collaborationPage = form.addPageBreakItem()
    .setTitle('共同制作への参加希望')
    .setHelpText('原則としてGitHubで変更・レビューを管理できる方を対象とします。')
    .setGoToPage(FormApp.PageNavigationType.SUBMIT);

  form.addCheckboxItem()
    .setTitle('協力できる分野（複数選択可）')
    .setChoiceValues([
      '神経解剖学監修',
      '脳実習・教材設計',
      '医用画像・手動セグメンテーション',
      '3Dモデリング',
      'Web開発',
      'UI・アクセシビリティ',
      'クイズ・解説作成',
      '翻訳・用語整理',
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addTextItem()
    .setTitle('GitHubユーザー名')
    .setHelpText('共同制作はGitHub Issue・Pull Request・レビューを基本とします。')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('参加方法・準備状況（複数選択可）')
    .setChoiceValues([
      'Git、Issue、Pull Request、レビューを自分で管理できる',
      '本人がコーディングする',
      'Codex、Claude Code等を利用してコーディングする',
      '手動セグメンテーションを行える',
      '神経解剖学的なレビューを行える',
      '知見・意見を中心に参加したい（役割は要相談）',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('経験・参加したい内容')
    .setHelpText('関連経験、修正したい領域、使える環境、無理なく担当できる範囲など。')
    .setRequired(true);

  form.addTextItem()
    .setTitle('氏名または表示名（任意）');

  form.addTextItem()
    .setTitle('所属（任意）')
    .setHelpText('本人の希望なく所属を公開しません。');

  form.addTextItem()
    .setTitle('連絡先（任意）')
    .setHelpText('メールアドレス等。GitHubだけで連絡可能な場合は空欄で構いません。');

  form.addMultipleChoiceItem()
    .setTitle('採用時のクレジット希望')
    .setChoiceValues([
      '表示名と貢献内容を掲載してよい',
      '匿名で貢献内容のみ掲載してよい',
      '掲載を希望しない',
      '相談して決めたい',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('共同制作に関する確認')
    .setChoiceValues(collaborationAcknowledgements_())
    .setRequired(true);

  routeItem.setChoices([
    routeItem.createChoice('修正提案・不具合・使いにくさを送る', feedbackPage),
    routeItem.createChoice('共同制作者として参加したい', collaborationPage),
    routeItem.createChoice('継続的な意見提供について相談したい', collaborationPage),
  ]);

  var spreadsheet = SpreadsheetApp.create(CONFIG.RESPONSE_SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  prepareOperationsSheet_(spreadsheet, form);

  properties.setProperties({
    BRAIN_PRACTICAL_FORM_ID: form.getId(),
    BRAIN_PRACTICAL_SHEET_ID: spreadsheet.getId(),
  });

  logResult_(form, spreadsheet, false);
}

function collaborationAcknowledgements_() {
  return [
    '教育用試作教材への参加希望であり、報酬・採用・継続参加は個別の合意がない限り保証されないことを理解しました。',
    '公式版への採用・編集・見送りの最終判断は、当面プロジェクト管理者が行うことを理解しました。',
    'コード・教材・セグメンテーション等を提出する場合は、自分に提出権限があり、指定ライセンスとDCOを確認します。',
    '患者情報、公開許諾のない標本写真、第三者の講義・教科書図版を提出しません。',
  ];
}

function refreshExistingForm_(form, spreadsheet) {
  form.setTitle(CONFIG.FORM_TITLE).setDescription(buildDescription_());
  spreadsheet.rename(CONFIG.RESPONSE_SHEET_TITLE);
  form.getItems(FormApp.ItemType.CHECKBOX).forEach(function(item) {
    if (item.getTitle() === '共同制作に関する確認') {
      item.asCheckboxItem().setChoiceValues(collaborationAcknowledgements_());
    }
  });
}

function buildDescription_() {
  return [
    CONFIG.PROJECT_NAME + 'は、脳解剖実習の予習・復習を補助する非営利の教育用試作教材です。',
    '神経解剖学的な誤り、構造表示のずれ、操作性の問題、共同制作の提案を募集しています。',
    '',
    '患者情報、献体者・学生を特定できる情報、実習標本の写真、公開許諾のない講義・教科書・アトラス図版は送信しないでください。',
    '修正提案は匿名で送信できます。氏名・所属・連絡先は、共同制作または返信を希望する場合だけ任意で入力してください。',
    '回答は教材改善、権利確認、希望者への共同制作の連絡にのみ使用し、本人の確認なく所属や連絡先を公開しません。',
    CONFIG.RETENTION_TEXT,
    CONFIG.CONTACT_TEXT,
  ].join('\n');
}

function prepareOperationsSheet_(spreadsheet, form) {
  var operations = spreadsheet.getSheets()[0];
  operations.setName('運用メモ');
  operations.getRange('A1:B8').setValues([
    ['項目', '内容'],
    ['フォーム編集URL', form.getEditUrl()],
    ['回答者URL', form.getPublishedUrl()],
    ['公開前確認', 'フォーム右上の「公開／共有」で回答者を「リンクを知っている全員」に設定'],
    ['個人情報', '不要になった連絡先を削除し、削除依頼の連絡先をフォーム説明へ明記'],
    ['標本写真', '公開許諾のない標本写真・講義図版を受け取らない'],
    ['推奨ステータス', '未確認／確認中／採用／見送り'],
    ['アプリ設定', '回答者URLを VITE_FEEDBACK_FORM_URL に設定'],
  ]);
  operations.getRange('A10:G11').setValues([
    ['管理ID', '受信日', '種類', '確認状況', '担当', 'GitHub Issue', 'メモ'],
    ['', '', '', '未確認', '', '', ''],
  ]);
  operations.setFrozenRows(1);
  operations.autoResizeColumns(1, 7);
}

function logResult_(form, spreadsheet, reused) {
  console.log(reused ? '既存フォームを再利用します。' : 'フォームを作成しました。');
  console.log('EDIT_URL=' + form.getEditUrl());
  console.log('RESPONDER_URL=' + form.getPublishedUrl());
  console.log('SHEET_URL=' + spreadsheet.getUrl());
  console.log('次の作業：フォームの公開範囲を確認し、RESPONDER_URLをVITE_FEEDBACK_FORM_URLへ設定してください。');
}

function resetStoredFormIds() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  console.log('保存したフォームIDを解除しました。既存フォームと回答シートそのものは削除されません。');
}
