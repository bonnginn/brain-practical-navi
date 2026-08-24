/**
 * 既存Google Formを変更せず、feedback-form-contract.jsonとの主要な差分だけを報告します。
 * 出力にはフォーム／シートID、URL、回答内容を含めません。
 */
var FEEDBACK_PREFLIGHT_CONTRACT_SHA256 = 'b8a0a401634f34e3e8caf2429af979770dc3874ce75ef966a4f0a7d8e940054a';

var FEEDBACK_PREFLIGHT_EXPECTED = {
  title: '脳実習ナビ｜修正提案・共同制作フォーム',
  pageTitles: ['修正提案・不具合・使いにくさ', '共同制作への参加希望'],
  itemTitles: [
    '今回の連絡に最も近いものを選んでください',
    '提案・報告の種類', '対象画面（複数選択可）', '対象を再現する情報',
    '問題点・提案内容', '望ましい修正案', '根拠となる資料', '重要度',
    '返信先（任意）', '修正履歴への掲載可否', '送信前の確認',
    '協力できる分野（複数選択可）', 'GitHubユーザー名',
    '参加方法・準備状況（複数選択可）', '経験・参加したい内容',
    '氏名または表示名（任意）', '所属（任意）', '連絡先（任意）',
    '採用時のクレジット希望', '共同制作に関する確認'
  ],
  itemTypes: [
    'MULTIPLE_CHOICE', 'MULTIPLE_CHOICE', 'CHECKBOX', 'TEXT', 'PARAGRAPH_TEXT',
    'PARAGRAPH_TEXT', 'PARAGRAPH_TEXT', 'MULTIPLE_CHOICE', 'TEXT',
    'MULTIPLE_CHOICE', 'CHECKBOX', 'CHECKBOX', 'TEXT', 'CHECKBOX',
    'PARAGRAPH_TEXT', 'TEXT', 'TEXT', 'TEXT', 'MULTIPLE_CHOICE', 'CHECKBOX'
  ],
  required: [true, true, false, false, true, false, false, true, false, true, true, true, true, true, true, false, false, false, true, true],
  operationsLabels: ['項目', 'フォーム編集URL', '回答者URL', '公開前確認', '個人情報', '標本写真', '推奨ステータス', 'アプリ設定'],
  trackingHeaders: ['管理ID', '受信日', '種類', '確認状況', '担当', 'GitHub Issue', 'メモ']
};

function preflightBrainPracticalFeedbackForm() {
  var properties = PropertiesService.getScriptProperties();
  var formId = properties.getProperty('BRAIN_PRACTICAL_FORM_ID');
  var sheetId = properties.getProperty('BRAIN_PRACTICAL_SHEET_ID');
  var mismatchCodes = [];
  if (!formId || !sheetId) {
    mismatchCodes.push('STORED_TARGET_MISSING');
    return logFeedbackPreflightReport_(mismatchCodes, {formItems: 0, pageBreaks: 0, sheetRowsChecked: 0});
  }

  var form = FormApp.openById(formId);
  var spreadsheet = SpreadsheetApp.openById(sheetId);
  compareFeedbackFormSettings_(form, mismatchCodes);
  compareFeedbackFormItems_(form.getItems(), mismatchCodes);
  compareFeedbackSheet_(spreadsheet, mismatchCodes);
  return logFeedbackPreflightReport_(mismatchCodes, {
    formItems: form.getItems().length,
    pageBreaks: form.getItems(FormApp.ItemType.PAGE_BREAK).length,
    sheetRowsChecked: 9
  });
}

function compareFeedbackFormSettings_(form, mismatchCodes) {
  checkFeedbackValue_(form.getTitle(), FEEDBACK_PREFLIGHT_EXPECTED.title, 'FORM_TITLE', mismatchCodes);
  var description = form.getDescription();
  ['教育用試作教材', '患者情報', '保存期間', '不具合・修正提案'].forEach(function(token) {
    if (description.indexOf(token) < 0) mismatchCodes.push('FORM_DESCRIPTION_' + token.length);
  });
  checkFeedbackValue_(form.isQuiz(), false, 'SETTING_QUIZ', mismatchCodes);
  checkFeedbackValue_(form.collectsEmail(), false, 'SETTING_COLLECT_EMAIL', mismatchCodes);
  checkFeedbackValue_(form.hasLimitOneResponsePerUser(), false, 'SETTING_LIMIT_ONE', mismatchCodes);
  checkFeedbackValue_(form.hasProgressBar(), true, 'SETTING_PROGRESS', mismatchCodes);
  checkFeedbackValue_(form.getShuffleQuestions(), false, 'SETTING_SHUFFLE', mismatchCodes);
  checkFeedbackValue_(form.hasRespondAgainLink(), true, 'SETTING_RESPOND_AGAIN', mismatchCodes);
  checkFeedbackValue_(form.isAcceptingResponses(), true, 'SETTING_ACCEPTING', mismatchCodes);
  checkFeedbackValue_(form.isPublished(), true, 'SETTING_PUBLISHED', mismatchCodes);
  if (!form.getConfirmationMessage()) mismatchCodes.push('CONFIRMATION_EMPTY');
}

function compareFeedbackFormItems_(items, mismatchCodes) {
  var questions = [];
  var pages = [];
  items.forEach(function(item) {
    if (item.getType() === FormApp.ItemType.PAGE_BREAK) pages.push(item.asPageBreakItem());
    else questions.push(item);
  });
  checkFeedbackValue_(questions.length, 20, 'QUESTION_COUNT', mismatchCodes);
  checkFeedbackValue_(pages.length, 2, 'PAGE_COUNT', mismatchCodes);
  pages.forEach(function(page, index) {
    checkFeedbackValue_(page.getTitle(), FEEDBACK_PREFLIGHT_EXPECTED.pageTitles[index], 'PAGE_TITLE_' + index, mismatchCodes);
    var navigation = page.getPageNavigationType();
    if (index === 1) checkFeedbackValue_(String(navigation), 'SUBMIT', 'FEEDBACK_PAGE_NAVIGATION', mismatchCodes);
    page.getGoToPage();
  });
  questions.forEach(function(item, index) {
    checkFeedbackValue_(item.getTitle(), FEEDBACK_PREFLIGHT_EXPECTED.itemTitles[index], 'ITEM_TITLE_' + index, mismatchCodes);
    checkFeedbackValue_(String(item.getType()), FEEDBACK_PREFLIGHT_EXPECTED.itemTypes[index], 'ITEM_TYPE_' + index, mismatchCodes);
    checkFeedbackValue_(feedbackItemRequired_(item), FEEDBACK_PREFLIGHT_EXPECTED.required[index], 'ITEM_REQUIRED_' + index, mismatchCodes);
  });
  if (questions.length > 0 && questions[0].getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
    var routeChoices = questions[0].asMultipleChoiceItem().getChoices();
    var expectedPages = ['修正提案・不具合・使いにくさ', '共同制作への参加希望', '共同制作への参加希望'];
    checkFeedbackValue_(routeChoices.length, 3, 'ROUTE_CHOICE_COUNT', mismatchCodes);
    routeChoices.forEach(function(choice, index) {
      choice.getPageNavigationType();
      var destination = choice.getGotoPage();
      checkFeedbackValue_(destination ? destination.getTitle() : '', expectedPages[index], 'ROUTE_DESTINATION_' + index, mismatchCodes);
    });
  }
}

function feedbackItemRequired_(item) {
  var type = item.getType();
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) return item.asMultipleChoiceItem().isRequired();
  if (type === FormApp.ItemType.CHECKBOX) return item.asCheckboxItem().isRequired();
  if (type === FormApp.ItemType.TEXT) return item.asTextItem().isRequired();
  if (type === FormApp.ItemType.PARAGRAPH_TEXT) return item.asParagraphTextItem().isRequired();
  return null;
}

function compareFeedbackSheet_(spreadsheet, mismatchCodes) {
  var sheet = spreadsheet.getSheetByName('運用メモ');
  if (!sheet) {
    mismatchCodes.push('OPERATIONS_SHEET_MISSING');
    return;
  }
  var labels = sheet.getRange('A1:A8').getValues().map(function(row) { return row[0]; });
  var headers = sheet.getRange('A10:G10').getValues()[0];
  FEEDBACK_PREFLIGHT_EXPECTED.operationsLabels.forEach(function(value, index) {
    checkFeedbackValue_(labels[index], value, 'OPERATIONS_LABEL_' + index, mismatchCodes);
  });
  FEEDBACK_PREFLIGHT_EXPECTED.trackingHeaders.forEach(function(value, index) {
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
