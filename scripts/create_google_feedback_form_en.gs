/**
 * Brain Practical Navigator: English private feedback form generator.
 *
 * This is intentionally separate from the Japanese feedback/collaboration form.
 * It collects error reports and suggestions only; it does not recruit collaborators.
 * Run createBrainPracticalEnglishFeedbackForm once in Google Apps Script, then set
 * only the logged RESPONDER_URL as VITE_FEEDBACK_FORM_URL_EN.
 */

var ENGLISH_FEEDBACK_CONFIG = {
  FORM_TITLE: 'Brain Practical Navigator | Private feedback and error report',
  RESPONSE_SHEET_TITLE: 'Brain Practical Navigator | English feedback responses',
  FORM_DESCRIPTION: [
    'Brain Practical Navigator is a nonprofit educational prototype for learning neuroanatomy.',
    'Use this form to report anatomical errors, display or segmentation problems, usability or accessibility issues, and problems in quizzes or explanations.',
    '',
    'Do not submit information that could identify a patient, student, donor, or other person. Do not submit specimen photographs or lecture, textbook, or atlas figures that you are not authorised to share.',
    'You may submit anonymously. Reply contact details are optional and should be entered only if you would like a reply.',
    'Responses are used only to improve the educational material and check rights or attribution. Contact details will not be published without your consent and will be deleted when no longer needed.',
    'Public issue tracker: https://github.com/bonnginn/brain-practical-navi/issues',
  ].join('\n'),
};

function createBrainPracticalEnglishFeedbackForm() {
  var properties = PropertiesService.getScriptProperties();
  var savedFormId = properties.getProperty('BRAIN_PRACTICAL_EN_FORM_ID');
  var savedSheetId = properties.getProperty('BRAIN_PRACTICAL_EN_SHEET_ID');

  if (!!savedFormId !== !!savedSheetId) {
    throw new Error('STORED_TARGET_PARTIAL: only one stored English form target exists. Inspect Script Properties before continuing.');
  }
  if (savedFormId && savedSheetId) {
    logEnglishFeedbackResult_(FormApp.openById(savedFormId), SpreadsheetApp.openById(savedSheetId), true);
    return;
  }

  var form = FormApp.create(ENGLISH_FEEDBACK_CONFIG.FORM_TITLE, true);
  form
    .setDescription(ENGLISH_FEEDBACK_CONFIG.FORM_DESCRIPTION)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setShowLinkToRespondAgain(true)
    .setConfirmationMessage('Thank you. Your report will be reviewed for possible improvements to the educational material.')
    .setAcceptingResponses(true)
    .setPublished(true);

  form.addMultipleChoiceItem()
    .setTitle('Type of report')
    .setChoiceValues([
      'Anatomical correction',
      'Segmentation or display-position problem',
      'Usability or accessibility problem',
      'Quiz or explanation correction',
      'Feature suggestion',
      'Rights, credit, or data-disclosure issue',
      'Other',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Affected area')
    .setHelpText('Select all that apply.')
    .setChoiceValues([
      'Sections',
      'Brain Surface',
      'Block Specimens',
      'Major arteries or cranial nerves',
      'Review Quiz',
      'Terms, credits, or data disclosure',
      'Entire app',
      'Other',
    ]);

  form.addParagraphTextItem()
    .setTitle('How to find or reproduce the issue (optional)')
    .setHelpText('Include the page, view, slice position, selected structure, image source, or device when relevant.');

  form.addParagraphTextItem()
    .setTitle('Describe the issue or suggestion')
    .setHelpText('Explain what you observed and why it may need correction.')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Suggested correction (optional)')
    .setHelpText('If possible, describe wording, classification, behaviour, or a boundary that should be reviewed.');

  form.addParagraphTextItem()
    .setTitle('Supporting source (optional)')
    .setHelpText('Provide a public URL, DOI, citation, or your own explanation. Do not upload or paste copyrighted figures.');

  form.addMultipleChoiceItem()
    .setTitle('Priority')
    .setChoiceValues([
      'Could cause a learning error',
      'Prevents or seriously hinders use',
      'Improvement suggestion',
      'Not sure',
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Reply contact (optional)')
    .setHelpText('Email or another contact method. Leave blank to submit anonymously.');

  form.addMultipleChoiceItem()
    .setTitle('May this report be cited in project records?')
    .setChoiceValues([
      'Yes, anonymously',
      'Yes, using the name I provide in my reply contact',
      'No, do not publish or cite this report',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Before submitting')
    .setChoiceValues([
      'I have not included identifying information, specimen photographs, or figures that I am not authorised to share.',
    ])
    .setRequired(true);

  var spreadsheet = SpreadsheetApp.create(ENGLISH_FEEDBACK_CONFIG.RESPONSE_SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  prepareEnglishFeedbackOperationsSheet_(spreadsheet, form);
  properties.setProperties({
    BRAIN_PRACTICAL_EN_FORM_ID: form.getId(),
    BRAIN_PRACTICAL_EN_SHEET_ID: spreadsheet.getId(),
  });
  logEnglishFeedbackResult_(form, spreadsheet, false);
}

function prepareEnglishFeedbackOperationsSheet_(spreadsheet, form) {
  var operations = spreadsheet.getSheets()[0];
  operations.setName('Operations');
  operations.getRange('A1:B8').setValues([
    ['Item', 'Value'],
    ['Form editor URL', form.getEditUrl()],
    ['Responder URL', form.getPublishedUrl()],
    ['Access check', 'Confirm that anyone with the link can respond without signing in.'],
    ['Privacy', 'Delete optional contact details when they are no longer needed.'],
    ['Prohibited content', 'Do not accept identifying information, specimen photographs, or unauthorised figures.'],
    ['Suggested status', 'Unreviewed / Reviewing / Accepted / Declined'],
    ['App setting', 'Set only the responder URL as VITE_FEEDBACK_FORM_URL_EN.'],
  ]);
  operations.getRange('A10:G11').setValues([
    ['Record ID', 'Received', 'Type', 'Status', 'Owner', 'GitHub issue', 'Notes'],
    ['', '', '', 'Unreviewed', '', '', ''],
  ]);
  operations.setFrozenRows(1);
  operations.autoResizeColumns(1, 7);
}

function logEnglishFeedbackResult_(form, spreadsheet, reused) {
  console.log(reused ? 'Reusing the stored English feedback form.' : 'Created the English feedback form.');
  console.log('EDIT_URL=' + form.getEditUrl());
  console.log('RESPONDER_URL=' + form.getPublishedUrl());
  console.log('SHEET_URL=' + spreadsheet.getUrl());
}

function resetStoredEnglishFeedbackFormIds() {
  var properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('BRAIN_PRACTICAL_EN_FORM_ID');
  properties.deleteProperty('BRAIN_PRACTICAL_EN_SHEET_ID');
  console.log('Cleared stored English form IDs. The existing form and response sheet were not deleted.');
}
