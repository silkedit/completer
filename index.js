const silkedit = require('silkedit');
const TextCursor = silkedit.TextCursor;
const Completer = silkedit.Completer;

var inCompletion = false;

const model = new silkedit.StringListModel;
const completer = new Completer;
completer.setCompletionMode(Completer.CompletionMode.PopupCompletion);
completer.setModel(model);
completer.setModelSorting(Completer.ModelSorting.CaseInsensitivelySortedModel);
completer.setCaseSensitivity(silkedit.CaseSensitivity.CaseInsensitive);
completer.setWrapAround(true);
completer.on('activated', (text) => {
  const textEdit = silkedit.App.activeTextEditView();
  if (textEdit != null) {
    insertCompletion(textEdit, text, false);
  }
});

const inCompletionCond = {
  keyValue: () => inCompletion
}

const popupVisibleCond = {
  keyValue: () => completer.popup().isVisible()
}

function insertCompletion(textEdit, completion, singleWord) {
  const cursor = textEdit.textCursor();
  const numberOfCharsToComplete = completion.length - completer.completionPrefix.length;
  const insertionPosition = cursor.position();
  cursor.insertText(completion.substr(completion.length - numberOfCharsToComplete, numberOfCharsToComplete));
  if (singleWord) {
    cursor.setPosition(insertionPosition);
    cursor.movePosition(TextCursor.MoveOperation.EndOfWord, TextCursor.MoveMode.KeepAnchor);
    inCompletion = true;
  }

  textEdit.setTextCursor(cursor);
}

function getStringList(text, completionPrefix) {
  var strings = text.split(/\W+/);
  // remove completionPrefix in strings
  strings = strings.filter((value) => value !== completionPrefix);
  // remove duplicates
  strings = Array.from(new Set(strings));
  strings.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return strings;
}

function performCompletion(textEdit, completionPrefix) {
  const strings = getStringList(textEdit.text, completionPrefix);
  model.setStringList(strings);
  if (completionPrefix != completer.completionPrefix) {
    completer.setCompletionPrefix(completionPrefix);
  }

  if (completer.completionCount() == 1) {
    insertCompletion(textEdit, completer.currentCompletion(), true);
  } else {
    const rect = textEdit.cursorRect();
    rect.setWidth(completer.popup().sizeHintForColumn(0) +
                  completer.popup().verticalScrollBar().sizeHint().width());

    completer.popup().setCurrentIndex(completer.completionModel().index(0, 0));
    completer.complete(rect);
    inCompletion = true;
  }
}

module.exports = {
  activate: function() {
    silkedit.Condition.add("completer.in_completion", inCompletionCond);
    silkedit.Condition.add("completer.popup_visible", popupVisibleCond);
  },

  deactivate: function() {
    silkedit.Condition.remove("completer.in_completion");
    silkedit.Condition.remove("completer.popup_visible");
  },

  commands: {
    "show_completions": () => {
      const textEdit = silkedit.App.activeTextEditView();
			if (textEdit != null) {
        completer.setWidget(textEdit);
  		  const cursor = textEdit.textCursor();
        cursor.movePosition(TextCursor.MoveOperation.PreviousWord, TextCursor.MoveMode.KeepAnchor);
        const completionPrefix = cursor.selectedText();
        if (completionPrefix.length > 0) {
          performCompletion(textEdit, completionPrefix);
        }
			}
    },
    "clear_selection": () => {
      inCompletion = false;
      const textEdit = silkedit.App.activeTextEditView();
			if (textEdit != null) {
			  const cursor = textEdit.textCursor()
			  cursor.clearSelection();
			  textEdit.setTextCursor(cursor);
			}
    },
    "cancel_completion": () => {
      inCompletion = false;
      const textEdit = silkedit.App.activeTextEditView();
			if (textEdit != null) {
			  const cursor = textEdit.textCursor()
			  cursor.removeSelectedText();
			  textEdit.setTextCursor(cursor);
			  
			  if (completer.popup().isVisible()) {
          completer.popup().hide();
			  }
			}
    },
    "select_next_completion": () => {
      const keyPressEv = new silkedit.KeyEvent( silkedit.Event.Type.KeyPress, silkedit.Key.Key_Down, silkedit.KeyboardModifier.NoModifier, "", false, 1);
      silkedit.App.postEvent(completer.popup(), keyPressEv);
      const keyReleaseEv = new silkedit.KeyEvent( silkedit.Event.Type.KeyRelease, silkedit.Key.Key_Down, silkedit.KeyboardModifier.NoModifier);
      silkedit.App.postEvent(completer.popup(), keyReleaseEv);
    },
    "select_previous_completion": () => {
      const keyPressEv = new silkedit.KeyEvent( silkedit.Event.Type.KeyPress, silkedit.Key.Key_Up, silkedit.KeyboardModifier.NoModifier);
      silkedit.App.postEvent(completer.popup(), keyPressEv);
      const keyReleaseEv = new silkedit.KeyEvent( silkedit.Event.Type.KeyRelease, silkedit.Key.Key_Up, silkedit.KeyboardModifier.NoModifier);
      silkedit.App.postEvent(completer.popup(), keyReleaseEv);
    }
  }
}
