/**
 * 既存Google Formを変更せず、feedback-form-contract.jsonとの完全な構造差分を報告します。
 * 出力にはフォーム／シートID、URL、回答内容を含めません。
 */
// feedback-contract-generated:start
var FEEDBACK_PREFLIGHT_CONTRACT_SHA256 = 'e9571bbf5fb94d1d33f7645fe1c4e2065fb9306b19e322dbf4fe9bc5756f8734';
var FEEDBACK_PREFLIGHT_EXPECTED = {
  "title": "脳実習ナビ｜修正提案・共同制作フォーム",
  "description": "脳実習ナビは、脳解剖実習の予習・復習を補助する非営利の教育用試作教材です。\n神経解剖学的な誤り、構造表示のずれ、操作性の問題、共同制作の提案を募集しています。\n\n患者情報、献体者・学生を特定できる情報、実習標本の写真、公開許諾のない講義・教科書・アトラス図版は送信しないでください。\n修正提案は匿名で送信できます。氏名・所属・連絡先は、共同制作または返信を希望する場合だけ任意で入力してください。\n回答は教材改善、権利確認、希望者への共同制作の連絡にのみ使用し、本人の確認なく所属や連絡先を公開しません。\n保存期間：教材改善と共同制作の連絡に必要な期間。不要になった連絡先は削除します。\n不具合・修正提案：https://github.com/bonnginn/brain-practical-navi/issues",
  "settings": {
    "isQuiz": false,
    "collectEmail": false,
    "limitOneResponsePerUser": false,
    "progressBar": true,
    "shuffleQuestions": false,
    "respondAgainLink": true,
    "acceptingResponses": true,
    "published": true
  },
  "confirmationMessage": "送信ありがとうございました。内容を確認し、教材改善の参考にします。共同制作を希望された場合も、すべての方へ返信または採用を保証するものではありません。",
  "pageBreaks": [
    {
      "key": "feedback",
      "title": "修正提案・不具合・使いにくさ",
      "helpText": "匿名で送信できます。分かる範囲だけ具体的に記載してください。",
      "precedingDefaultNavigation": "CONTINUE"
    },
    {
      "key": "collaboration",
      "title": "共同制作への参加希望",
      "helpText": "原則としてGitHubで変更・レビューを管理できる方を対象とします。",
      "precedingDefaultNavigation": "SUBMIT"
    }
  ],
  "items": [
    {
      "key": "route.kind",
      "page": "route",
      "type": "MULTIPLE_CHOICE",
      "title": "今回の連絡に最も近いものを選んでください",
      "helpText": "回答内容に応じて、次に表示する質問を切り替えます。",
      "required": true,
      "showOtherOption": false,
      "choices": [
        {
          "value": "修正提案・不具合・使いにくさを送る",
          "goToPage": "feedback"
        },
        {
          "value": "共同制作者として参加したい",
          "goToPage": "collaboration"
        },
        {
          "value": "継続的な意見提供について相談したい",
          "goToPage": "collaboration"
        }
      ]
    },
    {
      "key": "feedback.kind",
      "page": "feedback",
      "type": "MULTIPLE_CHOICE",
      "title": "提案・報告の種類",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "解剖学的な修正",
        "セグメンテーション／表示位置の修正",
        "操作性・アクセシビリティ",
        "クイズ・解説の修正",
        "機能提案",
        "権利・クレジット・データ表示",
        "その他"
      ]
    },
    {
      "key": "feedback.screen",
      "page": "feedback",
      "type": "CHECKBOX",
      "title": "対象画面（複数選択可）",
      "helpText": "",
      "required": false,
      "showOtherOption": true,
      "choices": [
        "断面実習",
        "脳表観察",
        "ブロック標本",
        "脳底動脈・脳神経標本",
        "復習クイズ",
        "セグメンテーション編集ツール",
        "CC・権利・データ表示",
        "アプリ全体"
      ]
    },
    {
      "key": "feedback.reproduction",
      "page": "feedback",
      "type": "TEXT",
      "title": "対象を再現する情報",
      "helpText": "例：水平断 52、単一標本0.5、被殻を選択、ブロック標本「側脳室の全景」",
      "required": false
    },
    {
      "key": "feedback.problem",
      "page": "feedback",
      "type": "PARAGRAPH_TEXT",
      "title": "問題点・提案内容",
      "helpText": "どこが、どのように見える／動くかを記載してください。",
      "required": true
    },
    {
      "key": "feedback.proposedFix",
      "page": "feedback",
      "type": "PARAGRAPH_TEXT",
      "title": "望ましい修正案",
      "helpText": "正しい構造名、位置、表示方法、操作方法など。分からない場合は空欄で構いません。",
      "required": false
    },
    {
      "key": "feedback.evidence",
      "page": "feedback",
      "type": "PARAGRAPH_TEXT",
      "title": "根拠となる資料",
      "helpText": "公開URL、DOI、書誌情報、自作の説明など。教科書・講義図版そのものは転載しないでください。",
      "required": false
    },
    {
      "key": "feedback.severity",
      "page": "feedback",
      "type": "MULTIPLE_CHOICE",
      "title": "重要度",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "学習上の誤りにつながるため優先修正が必要",
        "操作を妨げる不具合",
        "改善すると分かりやすくなる",
        "将来の追加候補",
        "判断できない"
      ]
    },
    {
      "key": "feedback.replyTo",
      "page": "feedback",
      "type": "TEXT",
      "title": "返信先（任意）",
      "helpText": "返信が必要な場合のみ、メールアドレスまたはGitHubユーザー名を記載してください。",
      "required": false
    },
    {
      "key": "feedback.publication",
      "page": "feedback",
      "type": "MULTIPLE_CHOICE",
      "title": "修正履歴への掲載可否",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "匿名で内容を掲載してよい",
        "希望する表示名を含めて掲載してよい",
        "掲載しないでほしい"
      ]
    },
    {
      "key": "feedback.confirmation",
      "page": "feedback",
      "type": "CHECKBOX",
      "title": "送信前の確認",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "患者情報、献体者・学生を特定できる情報、実習標本の写真、第三者の図版を含めていません。"
      ]
    },
    {
      "key": "collaboration.fields",
      "page": "collaboration",
      "type": "CHECKBOX",
      "title": "協力できる分野（複数選択可）",
      "helpText": "",
      "required": true,
      "showOtherOption": true,
      "choices": [
        "神経解剖学監修",
        "脳実習・教材設計",
        "医用画像・手動セグメンテーション",
        "3Dモデリング",
        "Web開発",
        "UI・アクセシビリティ",
        "クイズ・解説作成",
        "翻訳・用語整理"
      ]
    },
    {
      "key": "collaboration.github",
      "page": "collaboration",
      "type": "TEXT",
      "title": "GitHubユーザー名",
      "helpText": "共同制作はGitHub Issue・Pull Request・レビューを基本とします。",
      "required": true
    },
    {
      "key": "collaboration.readiness",
      "page": "collaboration",
      "type": "CHECKBOX",
      "title": "参加方法・準備状況（複数選択可）",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "Git、Issue、Pull Request、レビューを自分で管理できる",
        "本人がコーディングする",
        "Codex、Claude Code等を利用してコーディングする",
        "手動セグメンテーションを行える",
        "神経解剖学的なレビューを行える",
        "知見・意見を中心に参加したい（役割は要相談）"
      ]
    },
    {
      "key": "collaboration.experience",
      "page": "collaboration",
      "type": "PARAGRAPH_TEXT",
      "title": "経験・参加したい内容",
      "helpText": "関連経験、修正したい領域、使える環境、無理なく担当できる範囲など。",
      "required": true
    },
    {
      "key": "collaboration.name",
      "page": "collaboration",
      "type": "TEXT",
      "title": "氏名または表示名（任意）",
      "helpText": "",
      "required": false
    },
    {
      "key": "collaboration.affiliation",
      "page": "collaboration",
      "type": "TEXT",
      "title": "所属（任意）",
      "helpText": "本人の希望なく所属を公開しません。",
      "required": false
    },
    {
      "key": "collaboration.contact",
      "page": "collaboration",
      "type": "TEXT",
      "title": "連絡先（任意）",
      "helpText": "メールアドレス等。GitHubだけで連絡可能な場合は空欄で構いません。",
      "required": false
    },
    {
      "key": "collaboration.credit",
      "page": "collaboration",
      "type": "MULTIPLE_CHOICE",
      "title": "採用時のクレジット希望",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "表示名と貢献内容を掲載してよい",
        "匿名で貢献内容のみ掲載してよい",
        "掲載を希望しない",
        "相談して決めたい"
      ]
    },
    {
      "key": "collaboration.acknowledgements",
      "page": "collaboration",
      "type": "CHECKBOX",
      "title": "共同制作に関する確認",
      "helpText": "",
      "required": true,
      "showOtherOption": false,
      "choices": [
        "教育用試作教材への参加希望であり、報酬・採用・継続参加は個別の合意がない限り保証されないことを理解しました。",
        "公式版への採用・編集・見送りの最終判断は、当面プロジェクト管理者が行うことを理解しました。",
        "コード・教材・セグメンテーション等を提出する場合は、自分に提出権限があり、指定ライセンスとDCOを確認します。",
        "患者情報、実習標本の写真、第三者の講義・教科書図版を提出しません。"
      ]
    }
  ],
  "operationsSheet": {
    "spreadsheetTitle": "脳実習ナビ｜フォーム回答・運用管理",
    "sheetName": "運用メモ",
    "metadataRange": "A1:B8",
    "metadataLabels": [
      "項目",
      "フォーム編集URL",
      "回答者URL",
      "公開前確認",
      "個人情報",
      "標本写真",
      "推奨ステータス",
      "アプリ設定"
    ],
    "trackingRange": "A10:G11",
    "trackingHeaders": [
      "管理ID",
      "受信日",
      "種類",
      "確認状況",
      "担当",
      "GitHub Issue",
      "メモ"
    ]
  }
};
// feedback-contract-generated:end

function preflightBrainPracticalFeedbackForm() {
  var properties = PropertiesService.getScriptProperties();
  var formId = properties.getProperty('BRAIN_PRACTICAL_FORM_ID');
  var sheetId = properties.getProperty('BRAIN_PRACTICAL_SHEET_ID');
  var mismatchCodes = [];
  if (!formId || !sheetId) {
    mismatchCodes.push('STORED_TARGET_MISSING');
    return logFeedbackPreflightReport_(mismatchCodes, {formItems: 0, pageBreaks: 0, sheetRowsChecked: 0});
  }

  var form;
  var spreadsheet;
  try {
    form = FormApp.openById(formId);
    spreadsheet = SpreadsheetApp.openById(sheetId);
  } catch (error) {
    mismatchCodes.push('STORED_TARGET_UNAVAILABLE');
    return logFeedbackPreflightReport_(mismatchCodes, {formItems: 0, pageBreaks: 0, sheetRowsChecked: 0});
  }
  var items;
  try {
    items = form.getItems();
    compareFeedbackFormSettings_(form, mismatchCodes);
    compareFeedbackFormItems_(items, mismatchCodes);
    compareFeedbackSheet_(spreadsheet, mismatchCodes);
  } catch (error) {
    mismatchCodes.push('PREFLIGHT_READ_FAILED');
    return logFeedbackPreflightReport_(mismatchCodes, {formItems: 0, pageBreaks: 0, sheetRowsChecked: 0});
  }
  return logFeedbackPreflightReport_(mismatchCodes, {
    formItems: items.length,
    pageBreaks: items.filter(function(item) { return item.getType() === FormApp.ItemType.PAGE_BREAK; }).length,
    sheetRowsChecked: 9
  });
}

function compareFeedbackFormSettings_(form, mismatchCodes) {
  checkFeedbackValue_(form.getTitle(), FEEDBACK_PREFLIGHT_EXPECTED.title, 'FORM_TITLE', mismatchCodes);
  checkFeedbackValue_(form.getDescription(), FEEDBACK_PREFLIGHT_EXPECTED.description, 'FORM_DESCRIPTION', mismatchCodes);
  checkFeedbackValue_(form.isQuiz(), FEEDBACK_PREFLIGHT_EXPECTED.settings.isQuiz, 'SETTING_QUIZ', mismatchCodes);
  checkFeedbackValue_(form.collectsEmail(), FEEDBACK_PREFLIGHT_EXPECTED.settings.collectEmail, 'SETTING_COLLECT_EMAIL', mismatchCodes);
  checkFeedbackValue_(form.hasLimitOneResponsePerUser(), FEEDBACK_PREFLIGHT_EXPECTED.settings.limitOneResponsePerUser, 'SETTING_LIMIT_ONE', mismatchCodes);
  checkFeedbackValue_(form.hasProgressBar(), FEEDBACK_PREFLIGHT_EXPECTED.settings.progressBar, 'SETTING_PROGRESS', mismatchCodes);
  checkFeedbackValue_(form.getShuffleQuestions(), FEEDBACK_PREFLIGHT_EXPECTED.settings.shuffleQuestions, 'SETTING_SHUFFLE', mismatchCodes);
  checkFeedbackValue_(form.hasRespondAgainLink(), FEEDBACK_PREFLIGHT_EXPECTED.settings.respondAgainLink, 'SETTING_RESPOND_AGAIN', mismatchCodes);
  checkFeedbackValue_(form.isAcceptingResponses(), FEEDBACK_PREFLIGHT_EXPECTED.settings.acceptingResponses, 'SETTING_ACCEPTING', mismatchCodes);
  checkFeedbackValue_(form.isPublished(), FEEDBACK_PREFLIGHT_EXPECTED.settings.published, 'SETTING_PUBLISHED', mismatchCodes);
  checkFeedbackValue_(form.getConfirmationMessage(), FEEDBACK_PREFLIGHT_EXPECTED.confirmationMessage, 'CONFIRMATION_MESSAGE', mismatchCodes);
}

function compareFeedbackFormItems_(items, mismatchCodes) {
  var questionIndex = 0;
  var pageBreakIndex = 0;
  var currentPage = 'route';
  checkFeedbackValue_(items.length, FEEDBACK_PREFLIGHT_EXPECTED.items.length + FEEDBACK_PREFLIGHT_EXPECTED.pageBreaks.length, 'FORM_ITEM_COUNT', mismatchCodes);
  items.forEach(function(item) {
    if (item.getType() === FormApp.ItemType.PAGE_BREAK) {
      var expectedPage = FEEDBACK_PREFLIGHT_EXPECTED.pageBreaks[pageBreakIndex];
      if (!expectedPage) {
        mismatchCodes.push('PAGE_BREAK_EXTRA_' + pageBreakIndex);
        pageBreakIndex += 1;
        return;
      }
      var page = item.asPageBreakItem();
      checkFeedbackValue_(page.getTitle(), expectedPage.title, 'PAGE_TITLE_' + pageBreakIndex, mismatchCodes);
      checkFeedbackValue_(page.getHelpText(), expectedPage.helpText, 'PAGE_HELP_' + pageBreakIndex, mismatchCodes);
      checkFeedbackValue_(String(page.getPageNavigationType()), expectedPage.precedingDefaultNavigation, 'PAGE_NAVIGATION_' + pageBreakIndex, mismatchCodes);
      currentPage = expectedPage.key;
      pageBreakIndex += 1;
      return;
    }
    var expected = FEEDBACK_PREFLIGHT_EXPECTED.items[questionIndex];
    if (!expected) {
      mismatchCodes.push('QUESTION_EXTRA_' + questionIndex);
      questionIndex += 1;
      return;
    }
    checkFeedbackValue_(currentPage, expected.page, 'ITEM_PAGE_' + questionIndex, mismatchCodes);
    var actualType = String(item.getType());
    checkFeedbackValue_(actualType, expected.type, 'ITEM_TYPE_' + questionIndex, mismatchCodes);
    var typed = feedbackTypedItem_(item);
    if (!typed) {
      mismatchCodes.push('ITEM_UNSUPPORTED_' + questionIndex);
      questionIndex += 1;
      return;
    }
    checkFeedbackValue_(typed.getTitle(), expected.title, 'ITEM_TITLE_' + questionIndex, mismatchCodes);
    checkFeedbackValue_(typed.getHelpText(), expected.helpText, 'ITEM_HELP_' + questionIndex, mismatchCodes);
    checkFeedbackValue_(typed.isRequired(), expected.required, 'ITEM_REQUIRED_' + questionIndex, mismatchCodes);
    if (expected.choices && actualType === expected.type) compareFeedbackChoices_(typed, expected, questionIndex, mismatchCodes);
    questionIndex += 1;
  });
  checkFeedbackValue_(questionIndex, FEEDBACK_PREFLIGHT_EXPECTED.items.length, 'QUESTION_COUNT', mismatchCodes);
  checkFeedbackValue_(pageBreakIndex, FEEDBACK_PREFLIGHT_EXPECTED.pageBreaks.length, 'PAGE_COUNT', mismatchCodes);
}

function feedbackTypedItem_(item) {
  var type = item.getType();
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) return item.asMultipleChoiceItem();
  if (type === FormApp.ItemType.CHECKBOX) return item.asCheckboxItem();
  if (type === FormApp.ItemType.TEXT) return item.asTextItem();
  if (type === FormApp.ItemType.PARAGRAPH_TEXT) return item.asParagraphTextItem();
  return null;
}

function compareFeedbackChoices_(typed, expected, index, mismatchCodes) {
  var choices = typed.getChoices();
  checkFeedbackValue_(choices.length, expected.choices.length, 'ITEM_CHOICE_COUNT_' + index, mismatchCodes);
  checkFeedbackValue_(typed.hasOtherOption(), expected.showOtherOption, 'ITEM_OTHER_' + index, mismatchCodes);
  choices.forEach(function(choice, choiceIndex) {
    var expectedChoice = expected.choices[choiceIndex];
    if (expectedChoice === undefined) {
      mismatchCodes.push('ITEM_CHOICE_EXTRA_' + index + '_' + choiceIndex);
      return;
    }
    var expectedValue = typeof expectedChoice === 'string' ? expectedChoice : expectedChoice.value;
    checkFeedbackValue_(choice.getValue(), expectedValue, 'ITEM_CHOICE_VALUE_' + index + '_' + choiceIndex, mismatchCodes);
    if (expected.key === 'route.kind') {
      checkFeedbackValue_(String(choice.getPageNavigationType()), 'GO_TO_PAGE', 'ROUTE_NAVIGATION_' + choiceIndex, mismatchCodes);
      var destination = choice.getGotoPage();
      var expectedPage = FEEDBACK_PREFLIGHT_EXPECTED.pageBreaks.filter(function(page) { return page.key === expectedChoice.goToPage; })[0];
      checkFeedbackValue_(destination ? destination.getTitle() : '', expectedPage ? expectedPage.title : '', 'ROUTE_DESTINATION_' + choiceIndex, mismatchCodes);
    } else if (expected.type === 'MULTIPLE_CHOICE') {
      checkFeedbackValue_(choice.getPageNavigationType(), null, 'ITEM_NAVIGATION_' + index + '_' + choiceIndex, mismatchCodes);
      checkFeedbackValue_(choice.getGotoPage(), null, 'ITEM_DESTINATION_' + index + '_' + choiceIndex, mismatchCodes);
    }
  });
}

function compareFeedbackSheet_(spreadsheet, mismatchCodes) {
  checkFeedbackValue_(spreadsheet.getName(), FEEDBACK_PREFLIGHT_EXPECTED.operationsSheet.spreadsheetTitle, 'SPREADSHEET_TITLE', mismatchCodes);
  var sheet = spreadsheet.getSheetByName(FEEDBACK_PREFLIGHT_EXPECTED.operationsSheet.sheetName);
  if (!sheet) {
    mismatchCodes.push('OPERATIONS_SHEET_MISSING');
    return;
  }
  var labels = sheet.getRange('A1:A8').getValues().map(function(row) { return row[0]; });
  var headers = sheet.getRange('A10:G10').getValues()[0];
  FEEDBACK_PREFLIGHT_EXPECTED.operationsSheet.metadataLabels.forEach(function(value, index) {
    checkFeedbackValue_(labels[index], value, 'OPERATIONS_LABEL_' + index, mismatchCodes);
  });
  FEEDBACK_PREFLIGHT_EXPECTED.operationsSheet.trackingHeaders.forEach(function(value, index) {
    checkFeedbackValue_(headers[index], value, 'TRACKING_HEADER_' + index, mismatchCodes);
  });
}

function checkFeedbackValue_(actual, expected, code, mismatchCodes) {
  if (actual !== expected) mismatchCodes.push(code);
}

function logFeedbackPreflightReport_(mismatchCodes, counts) {
  var report = {
    schemaVersion: 1,
    tool: 'scripts/preflight_google_feedback_form.gs',
    contractSha256: FEEDBACK_PREFLIGHT_CONTRACT_SHA256,
    ok: mismatchCodes.length === 0,
    mismatchCount: mismatchCodes.length,
    mismatchCodes: mismatchCodes,
    counts: counts
  };
  console.log(JSON.stringify(report));
  return report;
}
