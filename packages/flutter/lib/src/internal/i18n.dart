/// The words the library says on its own behalf.
///
/// Nothing here is about the document. These are the toolbar's labels, the
/// outline's empty state and the sentences a screen reader is given — the
/// library's own interface, which is written in whatever language the
/// application around it is written in, and has nothing to do with what the
/// author wrote.
///
/// The same strings as the React package's `internal/i18n.ts`, under the same
/// names, minus the ones for what only the React package has.
library;

import 'package:mawy/src/types.dart';

/// Every word the interface says, by name.
///
/// What `strings` on `MawyEditor` and `MawyViewer` takes. It is for an
/// application whose translations live in a catalogue of its own, which is a
/// better answer than this library carrying every language that catalogue has.
/// Start from a locale's words and change the ones that differ:
///
/// ```dart
/// MawyEditor(
///   strings: MawyStrings.of(MawyLocale.en).copyWith(bold: t.bold, statusPosition: t.position),
/// )
/// ```
///
/// There is no public constructor, and nothing outside this package can extend
/// the class or implement it. Both are what let a word be added in a minor
/// version: an application that had built a set from nothing would otherwise
/// have to be changed every time the interface gained a label.
///
/// A few strings carry a value, marked with `%` and one capital letter:
/// [statusPosition] has `%L` for the line and `%C` for the column,
/// [statusSelected] has `%N` for how many characters, and [findMatches] has
/// `%N` for the match the caret is on and `%T` for how many there are. Every
/// place one is written is filled, so a language that wants a value twice can
/// have it twice.
final class MawyStrings {
  const MawyStrings._({
    required this.toolbar,
    required this.fontFamily,
    required this.fontFamilySans,
    required this.fontFamilySerif,
    required this.fontFamilyMono,
    required this.fontSize,
    required this.lineHeight,
    required this.letterSpacing,
    required this.measure,
    required this.measureNarrow,
    required this.measureNormal,
    required this.measureWide,
    required this.measureFull,
    required this.colorScheme,
    required this.colorSchemeLight,
    required this.colorSchemeDark,
    required this.colorSchemeSystem,
    required this.divider,
    required this.outline,
    required this.outlineEmpty,
    required this.copy,
    required this.copied,
    required this.copyFailed,
    required this.copyCode,
    required this.close,
    required this.document,
    required this.reset,
    required this.footnotes,
    required this.footnoteBack,
    required this.editor,
    required this.undo,
    required this.redo,
    required this.source,
    required this.sourceEscape,
    required this.mode,
    required this.modePlain,
    required this.modePreview,
    required this.modeSplit,
    required this.bold,
    required this.italic,
    required this.strikethrough,
    required this.codeSpan,
    required this.link,
    required this.image,
    required this.heading,
    required this.heading1,
    required this.heading2,
    required this.heading3,
    required this.heading4,
    required this.heading5,
    required this.heading6,
    required this.paragraph,
    required this.quote,
    required this.bulletList,
    required this.orderedList,
    required this.taskList,
    required this.codeBlock,
    required this.table,
    required this.tableInsert,
    required this.tableSize,
    required this.tableInsertSized,
    required this.tableRowBelow,
    required this.tableRowAbove,
    required this.tableColumnAfter,
    required this.tableColumnBefore,
    required this.tableRowRemove,
    required this.tableColumnRemove,
    required this.tableRowsAbove,
    required this.tableRowsBelow,
    required this.tableColumnsBefore,
    required this.tableColumnsAfter,
    required this.tableRowsRemove,
    required this.tableColumnsRemove,
    required this.tableCellsClear,
    required this.tableAlignLeft,
    required this.tableAlignCenter,
    required this.tableAlignRight,
    required this.tableRemove,
    required this.thematicBreak,
    required this.footnote,
    required this.status,
    required this.statusPosition,
    required this.statusSelected,
    required this.statusLines,
    required this.statusWords,
    required this.statusCharacters,
    required this.editorPlaceholder,
    required this.oneSpace,
    required this.oneBreak,
    required this.openFile,
    required this.emptyTitle,
    required this.emptyHint,
    required this.emptyAction,
    required this.find,
    required this.replace,
    required this.findMatchCase,
    required this.findPrevious,
    required this.findNext,
    required this.findClose,
    required this.findMatches,
    required this.findNoMatches,
    required this.replaceOne,
    required this.replaceAll,
    required this.alertNote,
    required this.alertTip,
    required this.alertImportant,
    required this.alertWarning,
    required this.alertCaution,
  });

  /// The words a locale has, which are where an application's own start from.
  static MawyStrings of(MawyLocale locale) => stringsFor(locale);

  /// The toolbar's own name.
  final String toolbar;

  /// The typeface menu.
  final String fontFamily;

  /// The sans-serif role.
  final String fontFamilySans;

  /// The serif role.
  final String fontFamilySerif;

  /// The monospace role.
  final String fontFamilyMono;

  /// The text-size control.
  final String fontSize;

  /// The line-height control.
  final String lineHeight;

  /// The letter-spacing control.
  final String letterSpacing;

  /// The column-width control.
  final String measure;

  /// The narrow column.
  final String measureNarrow;

  /// The default column.
  final String measureNormal;

  /// The wide column.
  final String measureWide;

  /// No column at all.
  final String measureFull;

  /// The theme control.
  final String colorScheme;

  /// The light theme.
  final String colorSchemeLight;

  /// The dark theme.
  final String colorSchemeDark;

  /// Whatever the platform says.
  final String colorSchemeSystem;

  /// The bar between the two panes of `split`, which can be dragged.
  final String divider;

  /// The outline panel.
  final String outline;

  /// What the outline says about a document with no headings.
  final String outlineEmpty;

  /// The copy button.
  final String copy;

  /// What it says once it has.
  final String copied;

  /// What the copy button says when the platform would not take it.
  final String copyFailed;

  /// A code block's own copy button.
  final String copyCode;

  /// Closing a panel.
  final String close;

  /// What the document is called to a screen reader.
  final String document;

  /// Putting the typography back where it started.
  final String reset;

  /// The heading over the notes at the bottom.
  final String footnotes;

  /// The link from a note back to the sentence that mentioned it.
  final String footnoteBack;

  /// The editor: Document.
  final String editor;

  /// The editor: Undo.
  final String undo;

  /// The editor: Redo.
  final String redo;

  /// The editor: Markdown source.
  final String source;

  /// How to leave the source surface, for a screen reader. `Tab` indents there.
  final String sourceEscape;

  /// The editor: View.
  final String mode;

  /// The editor: Source.
  final String modePlain;

  /// The editor: Preview.
  final String modePreview;

  /// The editor: Side by side.
  final String modeSplit;

  /// The editor: Bold.
  final String bold;

  /// The editor: Italic.
  final String italic;

  /// The editor: Strikethrough.
  final String strikethrough;

  /// The editor: Code.
  final String codeSpan;

  /// The editor: Link.
  final String link;

  /// The editor: Image.
  final String image;

  /// The editor: Heading.
  final String heading;

  /// The editor: Heading 1.
  final String heading1;

  /// The editor: Heading 2.
  final String heading2;

  /// The editor: Heading 3.
  final String heading3;

  /// The editor: Heading 4.
  final String heading4;

  /// The editor: Heading 5.
  final String heading5;

  /// The editor: Heading 6.
  final String heading6;

  /// The editor: Body text.
  final String paragraph;

  /// The editor: Quotation.
  final String quote;

  /// The editor: Bulleted list.
  final String bulletList;

  /// The editor: Numbered list.
  final String orderedList;

  /// The editor: Task list.
  final String taskList;

  /// The editor: Code block.
  final String codeBlock;

  /// The editor: Table.
  final String table;

  /// The editor: Insert a table.
  final String tableInsert;

  /// The editor: how large a table the grid has lit. `%C` is how many columns
  /// and `%R` how many rows, the header among them.
  final String tableSize;

  /// The editor: the same, said to a screen reader for each size the grid
  /// offers. `%C` and `%R`.
  final String tableInsertSized;

  /// The editor: Add a row below.
  final String tableRowBelow;

  /// The editor: Add a row above.
  final String tableRowAbove;

  /// The editor: Add a column after.
  final String tableColumnAfter;

  /// The editor: Add a column before.
  final String tableColumnBefore;

  /// The editor: Delete this row.
  final String tableRowRemove;

  /// The editor: Delete this column.
  final String tableColumnRemove;

  /// The editor: Add rows above, `%N` of them.
  final String tableRowsAbove;

  /// The editor: Add rows below, `%N` of them.
  final String tableRowsBelow;

  /// The editor: Add columns before, `%N` of them.
  final String tableColumnsBefore;

  /// The editor: Add columns after, `%N` of them.
  final String tableColumnsAfter;

  /// The editor: Delete the `%N` rows the selection covers.
  final String tableRowsRemove;

  /// The editor: Delete the `%N` columns the selection covers.
  final String tableColumnsRemove;

  /// The editor: Clear the selected cells.
  final String tableCellsClear;

  /// The editor: Align the columns the selection covers left.
  final String tableAlignLeft;

  /// The editor: Align the columns the selection covers in the middle.
  final String tableAlignCenter;

  /// The editor: Align the columns the selection covers right.
  final String tableAlignRight;

  /// The editor: Delete the table the caret is in.
  final String tableRemove;

  /// The editor: Divider.
  final String thematicBreak;

  /// The editor: Footnote.
  final String footnote;

  /// The editor: Document statistics.
  final String status;

  /// The editor: Ln %L, Col %C.
  final String statusPosition;

  /// The editor: %N selected.
  final String statusSelected;

  /// The editor: lines.
  final String statusLines;

  /// The editor: words.
  final String statusWords;

  /// The editor: characters.
  final String statusCharacters;

  /// What the source surface says when it is empty.
  final String editorPlaceholder;

  /// Said beside the caret when a second space in a row is refused.
  ///
  /// Markdown draws a run of spaces as one, so a document holding two said one
  /// thing where it was drawn and another where it was written. The keystroke
  /// is refused rather than the extra character drawn, and this says so.
  final String oneSpace;

  /// Said beside the caret when a second blank line in a row is refused.
  final String oneBreak;

  /// The control that opens a document.
  final String openFile;

  /// What an editor with no document at all says.
  final String emptyTitle;

  /// The line under it, which says the two ways of answering.
  final String emptyHint;

  /// The button under that.
  final String emptyAction;

  /// The find bar's own name, and the field in it.
  final String find;

  /// The other field.
  final String replace;

  /// Whether `Foo` finds `foo`.
  final String findMatchCase;

  /// Backwards.
  final String findPrevious;

  /// Forwards.
  final String findNext;

  /// Shut the bar.
  final String findClose;

  /// Which match, out of how many. `%N` and `%T`.
  final String findMatches;

  /// When there are none.
  final String findNoMatches;

  /// Replace the one the caret is on.
  final String replaceOne;

  /// Replace every one of them.
  final String replaceAll;

  /// `> [!NOTE]`.
  final String alertNote;

  /// `> [!TIP]`.
  final String alertTip;

  /// `> [!IMPORTANT]`.
  final String alertImportant;

  /// `> [!WARNING]`.
  final String alertWarning;

  /// `> [!CAUTION]`.
  final String alertCaution;

  /// The same words, with whichever are named here changed.
  MawyStrings copyWith({
    String? toolbar,
    String? fontFamily,
    String? fontFamilySans,
    String? fontFamilySerif,
    String? fontFamilyMono,
    String? fontSize,
    String? lineHeight,
    String? letterSpacing,
    String? measure,
    String? measureNarrow,
    String? measureNormal,
    String? measureWide,
    String? measureFull,
    String? colorScheme,
    String? colorSchemeLight,
    String? colorSchemeDark,
    String? colorSchemeSystem,
    String? divider,
    String? outline,
    String? outlineEmpty,
    String? copy,
    String? copied,
    String? copyFailed,
    String? copyCode,
    String? close,
    String? document,
    String? reset,
    String? footnotes,
    String? footnoteBack,
    String? editor,
    String? undo,
    String? redo,
    String? source,
    String? sourceEscape,
    String? mode,
    String? modePlain,
    String? modePreview,
    String? modeSplit,
    String? bold,
    String? italic,
    String? strikethrough,
    String? codeSpan,
    String? link,
    String? image,
    String? heading,
    String? heading1,
    String? heading2,
    String? heading3,
    String? heading4,
    String? heading5,
    String? heading6,
    String? paragraph,
    String? quote,
    String? bulletList,
    String? orderedList,
    String? taskList,
    String? codeBlock,
    String? table,
    String? tableInsert,
    String? tableSize,
    String? tableInsertSized,
    String? tableRowBelow,
    String? tableRowAbove,
    String? tableColumnAfter,
    String? tableColumnBefore,
    String? tableRowRemove,
    String? tableColumnRemove,
    String? tableRowsAbove,
    String? tableRowsBelow,
    String? tableColumnsBefore,
    String? tableColumnsAfter,
    String? tableRowsRemove,
    String? tableColumnsRemove,
    String? tableCellsClear,
    String? tableAlignLeft,
    String? tableAlignCenter,
    String? tableAlignRight,
    String? tableRemove,
    String? thematicBreak,
    String? footnote,
    String? status,
    String? statusPosition,
    String? statusSelected,
    String? statusLines,
    String? statusWords,
    String? statusCharacters,
    String? editorPlaceholder,
    String? oneSpace,
    String? oneBreak,
    String? openFile,
    String? emptyTitle,
    String? emptyHint,
    String? emptyAction,
    String? find,
    String? replace,
    String? findMatchCase,
    String? findPrevious,
    String? findNext,
    String? findClose,
    String? findMatches,
    String? findNoMatches,
    String? replaceOne,
    String? replaceAll,
    String? alertNote,
    String? alertTip,
    String? alertImportant,
    String? alertWarning,
    String? alertCaution,
  }) {
    return MawyStrings._(
      toolbar: toolbar ?? this.toolbar,
      fontFamily: fontFamily ?? this.fontFamily,
      fontFamilySans: fontFamilySans ?? this.fontFamilySans,
      fontFamilySerif: fontFamilySerif ?? this.fontFamilySerif,
      fontFamilyMono: fontFamilyMono ?? this.fontFamilyMono,
      fontSize: fontSize ?? this.fontSize,
      lineHeight: lineHeight ?? this.lineHeight,
      letterSpacing: letterSpacing ?? this.letterSpacing,
      measure: measure ?? this.measure,
      measureNarrow: measureNarrow ?? this.measureNarrow,
      measureNormal: measureNormal ?? this.measureNormal,
      measureWide: measureWide ?? this.measureWide,
      measureFull: measureFull ?? this.measureFull,
      colorScheme: colorScheme ?? this.colorScheme,
      colorSchemeLight: colorSchemeLight ?? this.colorSchemeLight,
      colorSchemeDark: colorSchemeDark ?? this.colorSchemeDark,
      colorSchemeSystem: colorSchemeSystem ?? this.colorSchemeSystem,
      divider: divider ?? this.divider,
      outline: outline ?? this.outline,
      outlineEmpty: outlineEmpty ?? this.outlineEmpty,
      copy: copy ?? this.copy,
      copied: copied ?? this.copied,
      copyFailed: copyFailed ?? this.copyFailed,
      copyCode: copyCode ?? this.copyCode,
      close: close ?? this.close,
      document: document ?? this.document,
      reset: reset ?? this.reset,
      footnotes: footnotes ?? this.footnotes,
      footnoteBack: footnoteBack ?? this.footnoteBack,
      editor: editor ?? this.editor,
      undo: undo ?? this.undo,
      redo: redo ?? this.redo,
      source: source ?? this.source,
      sourceEscape: sourceEscape ?? this.sourceEscape,
      mode: mode ?? this.mode,
      modePlain: modePlain ?? this.modePlain,
      modePreview: modePreview ?? this.modePreview,
      modeSplit: modeSplit ?? this.modeSplit,
      bold: bold ?? this.bold,
      italic: italic ?? this.italic,
      strikethrough: strikethrough ?? this.strikethrough,
      codeSpan: codeSpan ?? this.codeSpan,
      link: link ?? this.link,
      image: image ?? this.image,
      heading: heading ?? this.heading,
      heading1: heading1 ?? this.heading1,
      heading2: heading2 ?? this.heading2,
      heading3: heading3 ?? this.heading3,
      heading4: heading4 ?? this.heading4,
      heading5: heading5 ?? this.heading5,
      heading6: heading6 ?? this.heading6,
      paragraph: paragraph ?? this.paragraph,
      quote: quote ?? this.quote,
      bulletList: bulletList ?? this.bulletList,
      orderedList: orderedList ?? this.orderedList,
      taskList: taskList ?? this.taskList,
      codeBlock: codeBlock ?? this.codeBlock,
      table: table ?? this.table,
      tableInsert: tableInsert ?? this.tableInsert,
      tableSize: tableSize ?? this.tableSize,
      tableInsertSized: tableInsertSized ?? this.tableInsertSized,
      tableRowBelow: tableRowBelow ?? this.tableRowBelow,
      tableRowAbove: tableRowAbove ?? this.tableRowAbove,
      tableColumnAfter: tableColumnAfter ?? this.tableColumnAfter,
      tableColumnBefore: tableColumnBefore ?? this.tableColumnBefore,
      tableRowRemove: tableRowRemove ?? this.tableRowRemove,
      tableColumnRemove: tableColumnRemove ?? this.tableColumnRemove,
      tableRowsAbove: tableRowsAbove ?? this.tableRowsAbove,
      tableRowsBelow: tableRowsBelow ?? this.tableRowsBelow,
      tableColumnsBefore: tableColumnsBefore ?? this.tableColumnsBefore,
      tableColumnsAfter: tableColumnsAfter ?? this.tableColumnsAfter,
      tableRowsRemove: tableRowsRemove ?? this.tableRowsRemove,
      tableColumnsRemove: tableColumnsRemove ?? this.tableColumnsRemove,
      tableCellsClear: tableCellsClear ?? this.tableCellsClear,
      tableAlignLeft: tableAlignLeft ?? this.tableAlignLeft,
      tableAlignCenter: tableAlignCenter ?? this.tableAlignCenter,
      tableAlignRight: tableAlignRight ?? this.tableAlignRight,
      tableRemove: tableRemove ?? this.tableRemove,
      thematicBreak: thematicBreak ?? this.thematicBreak,
      footnote: footnote ?? this.footnote,
      status: status ?? this.status,
      statusPosition: statusPosition ?? this.statusPosition,
      statusSelected: statusSelected ?? this.statusSelected,
      statusLines: statusLines ?? this.statusLines,
      statusWords: statusWords ?? this.statusWords,
      statusCharacters: statusCharacters ?? this.statusCharacters,
      editorPlaceholder: editorPlaceholder ?? this.editorPlaceholder,
      oneSpace: oneSpace ?? this.oneSpace,
      oneBreak: oneBreak ?? this.oneBreak,
      openFile: openFile ?? this.openFile,
      emptyTitle: emptyTitle ?? this.emptyTitle,
      emptyHint: emptyHint ?? this.emptyHint,
      emptyAction: emptyAction ?? this.emptyAction,
      find: find ?? this.find,
      replace: replace ?? this.replace,
      findMatchCase: findMatchCase ?? this.findMatchCase,
      findPrevious: findPrevious ?? this.findPrevious,
      findNext: findNext ?? this.findNext,
      findClose: findClose ?? this.findClose,
      findMatches: findMatches ?? this.findMatches,
      findNoMatches: findNoMatches ?? this.findNoMatches,
      replaceOne: replaceOne ?? this.replaceOne,
      replaceAll: replaceAll ?? this.replaceAll,
      alertNote: alertNote ?? this.alertNote,
      alertTip: alertTip ?? this.alertTip,
      alertImportant: alertImportant ?? this.alertImportant,
      alertWarning: alertWarning ?? this.alertWarning,
      alertCaution: alertCaution ?? this.alertCaution,
    );
  }

  /// Compared by the words, so an application that builds a new set on every
  /// build with the same words in it redraws nothing for it.
  @override
  bool operator ==(Object other) =>
      other is MawyStrings &&
      other.toolbar == toolbar &&
      other.fontFamily == fontFamily &&
      other.fontFamilySans == fontFamilySans &&
      other.fontFamilySerif == fontFamilySerif &&
      other.fontFamilyMono == fontFamilyMono &&
      other.fontSize == fontSize &&
      other.lineHeight == lineHeight &&
      other.letterSpacing == letterSpacing &&
      other.measure == measure &&
      other.measureNarrow == measureNarrow &&
      other.measureNormal == measureNormal &&
      other.measureWide == measureWide &&
      other.measureFull == measureFull &&
      other.colorScheme == colorScheme &&
      other.colorSchemeLight == colorSchemeLight &&
      other.colorSchemeDark == colorSchemeDark &&
      other.colorSchemeSystem == colorSchemeSystem &&
      other.divider == divider &&
      other.outline == outline &&
      other.outlineEmpty == outlineEmpty &&
      other.copy == copy &&
      other.copied == copied &&
      other.copyFailed == copyFailed &&
      other.copyCode == copyCode &&
      other.close == close &&
      other.document == document &&
      other.reset == reset &&
      other.footnotes == footnotes &&
      other.footnoteBack == footnoteBack &&
      other.editor == editor &&
      other.undo == undo &&
      other.redo == redo &&
      other.source == source &&
      other.sourceEscape == sourceEscape &&
      other.mode == mode &&
      other.modePlain == modePlain &&
      other.modePreview == modePreview &&
      other.modeSplit == modeSplit &&
      other.bold == bold &&
      other.italic == italic &&
      other.strikethrough == strikethrough &&
      other.codeSpan == codeSpan &&
      other.link == link &&
      other.image == image &&
      other.heading == heading &&
      other.heading1 == heading1 &&
      other.heading2 == heading2 &&
      other.heading3 == heading3 &&
      other.heading4 == heading4 &&
      other.heading5 == heading5 &&
      other.heading6 == heading6 &&
      other.paragraph == paragraph &&
      other.quote == quote &&
      other.bulletList == bulletList &&
      other.orderedList == orderedList &&
      other.taskList == taskList &&
      other.codeBlock == codeBlock &&
      other.table == table &&
      other.tableInsert == tableInsert &&
      other.tableSize == tableSize &&
      other.tableInsertSized == tableInsertSized &&
      other.tableRowBelow == tableRowBelow &&
      other.tableRowAbove == tableRowAbove &&
      other.tableColumnAfter == tableColumnAfter &&
      other.tableColumnBefore == tableColumnBefore &&
      other.tableRowRemove == tableRowRemove &&
      other.tableColumnRemove == tableColumnRemove &&
      other.tableRowsAbove == tableRowsAbove &&
      other.tableRowsBelow == tableRowsBelow &&
      other.tableColumnsBefore == tableColumnsBefore &&
      other.tableColumnsAfter == tableColumnsAfter &&
      other.tableRowsRemove == tableRowsRemove &&
      other.tableColumnsRemove == tableColumnsRemove &&
      other.tableCellsClear == tableCellsClear &&
      other.tableAlignLeft == tableAlignLeft &&
      other.tableAlignCenter == tableAlignCenter &&
      other.tableAlignRight == tableAlignRight &&
      other.tableRemove == tableRemove &&
      other.thematicBreak == thematicBreak &&
      other.footnote == footnote &&
      other.status == status &&
      other.statusPosition == statusPosition &&
      other.statusSelected == statusSelected &&
      other.statusLines == statusLines &&
      other.statusWords == statusWords &&
      other.statusCharacters == statusCharacters &&
      other.editorPlaceholder == editorPlaceholder &&
      other.oneSpace == oneSpace &&
      other.oneBreak == oneBreak &&
      other.openFile == openFile &&
      other.emptyTitle == emptyTitle &&
      other.emptyHint == emptyHint &&
      other.emptyAction == emptyAction &&
      other.find == find &&
      other.replace == replace &&
      other.findMatchCase == findMatchCase &&
      other.findPrevious == findPrevious &&
      other.findNext == findNext &&
      other.findClose == findClose &&
      other.findMatches == findMatches &&
      other.findNoMatches == findNoMatches &&
      other.replaceOne == replaceOne &&
      other.replaceAll == replaceAll &&
      other.alertNote == alertNote &&
      other.alertTip == alertTip &&
      other.alertImportant == alertImportant &&
      other.alertWarning == alertWarning &&
      other.alertCaution == alertCaution;

  @override
  int get hashCode => Object.hashAll(<Object>[
    toolbar,
    fontFamily,
    fontFamilySans,
    fontFamilySerif,
    fontFamilyMono,
    fontSize,
    lineHeight,
    letterSpacing,
    measure,
    measureNarrow,
    measureNormal,
    measureWide,
    measureFull,
    colorScheme,
    colorSchemeLight,
    colorSchemeDark,
    colorSchemeSystem,
    divider,
    outline,
    outlineEmpty,
    copy,
    copied,
    copyFailed,
    copyCode,
    close,
    document,
    reset,
    footnotes,
    footnoteBack,
    editor,
    undo,
    redo,
    source,
    sourceEscape,
    mode,
    modePlain,
    modePreview,
    modeSplit,
    bold,
    italic,
    strikethrough,
    codeSpan,
    link,
    image,
    heading,
    heading1,
    heading2,
    heading3,
    heading4,
    heading5,
    heading6,
    paragraph,
    quote,
    bulletList,
    orderedList,
    taskList,
    codeBlock,
    table,
    tableInsert,
    tableSize,
    tableInsertSized,
    tableRowBelow,
    tableRowAbove,
    tableColumnAfter,
    tableColumnBefore,
    tableRowRemove,
    tableColumnRemove,
    tableRowsAbove,
    tableRowsBelow,
    tableColumnsBefore,
    tableColumnsAfter,
    tableRowsRemove,
    tableColumnsRemove,
    tableCellsClear,
    tableAlignLeft,
    tableAlignCenter,
    tableAlignRight,
    tableRemove,
    thematicBreak,
    footnote,
    status,
    statusPosition,
    statusSelected,
    statusLines,
    statusWords,
    statusCharacters,
    editorPlaceholder,
    oneSpace,
    oneBreak,
    openFile,
    emptyTitle,
    emptyHint,
    emptyAction,
    find,
    replace,
    findMatchCase,
    findPrevious,
    findNext,
    findClose,
    findMatches,
    findNoMatches,
    replaceOne,
    replaceAll,
    alertNote,
    alertTip,
    alertImportant,
    alertWarning,
    alertCaution,
  ]);
}

const MawyStrings _en = MawyStrings._(
  toolbar: 'Document settings',
  fontFamily: 'Typeface',
  fontFamilySans: 'Sans serif',
  fontFamilySerif: 'Serif',
  fontFamilyMono: 'Monospace',
  fontSize: 'Text size',
  lineHeight: 'Line height',
  letterSpacing: 'Letter spacing',
  measure: 'Content width',
  measureNarrow: 'Narrow',
  measureNormal: 'Normal',
  measureWide: 'Wide',
  measureFull: 'Full width',
  colorScheme: 'Theme',
  colorSchemeLight: 'Light',
  colorSchemeDark: 'Dark',
  colorSchemeSystem: 'Match the system',
  divider: 'Resize the panes',
  outline: 'Contents',
  outlineEmpty: 'This document has no headings.',
  copy: 'Copy the Markdown',
  copied: 'Copied',
  copyFailed: 'Could not copy',
  copyCode: 'Copy this code',
  close: 'Close',
  document: 'Document',
  reset: 'Back to the defaults',
  footnotes: 'Footnotes',
  footnoteBack: 'Back to where this was mentioned',
  editor: 'Document',
  undo: 'Undo',
  redo: 'Redo',
  source: 'Markdown source',
  sourceEscape: 'Tab indents. Press Escape and then Tab to move on.',
  mode: 'View',
  modePlain: 'Source',
  modePreview: 'Preview',
  modeSplit: 'Side by side',
  bold: 'Bold',
  italic: 'Italic',
  strikethrough: 'Strikethrough',
  codeSpan: 'Code',
  link: 'Link',
  image: 'Image',
  heading: 'Heading',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  heading5: 'Heading 5',
  heading6: 'Heading 6',
  paragraph: 'Body text',
  quote: 'Quotation',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  codeBlock: 'Code block',
  table: 'Table',
  tableInsert: 'Insert a table',
  tableSize: '%C × %R',
  tableInsertSized: 'Insert a table %C columns wide and %R rows tall',
  tableRowBelow: 'Add a row below',
  tableRowAbove: 'Add a row above',
  tableColumnAfter: 'Add a column after',
  tableColumnBefore: 'Add a column before',
  tableRowRemove: 'Delete this row',
  tableColumnRemove: 'Delete this column',
  tableRowsAbove: 'Add %N rows above',
  tableRowsBelow: 'Add %N rows below',
  tableColumnsBefore: 'Add %N columns before',
  tableColumnsAfter: 'Add %N columns after',
  tableRowsRemove: 'Delete these %N rows',
  tableColumnsRemove: 'Delete these %N columns',
  tableCellsClear: 'Clear the selected cells',
  tableAlignLeft: 'Align left',
  tableAlignCenter: 'Align center',
  tableAlignRight: 'Align right',
  tableRemove: 'Delete the table',
  thematicBreak: 'Divider',
  footnote: 'Footnote',
  status: 'Document statistics',
  statusPosition: 'Ln %L, Col %C',
  statusSelected: '%N selected',
  statusLines: 'lines',
  statusWords: 'words',
  statusCharacters: 'characters',
  editorPlaceholder: 'Write here…',
  oneSpace: 'Only one space in a row.',
  oneBreak: 'Only one blank line in a row.',
  openFile: 'Open a file',
  emptyTitle: 'Open a Markdown file',
  emptyHint: 'Drop a .md file here, or choose one to open.',
  emptyAction: 'Choose a file',
  find: 'Find',
  replace: 'Replace',
  findMatchCase: 'Match case',
  findPrevious: 'Previous match',
  findNext: 'Next match',
  findClose: 'Close find',
  findMatches: '%N of %T',
  findNoMatches: 'No matches',
  replaceOne: 'Replace',
  replaceAll: 'Replace all',
  alertNote: 'Note',
  alertTip: 'Tip',
  alertImportant: 'Important',
  alertWarning: 'Warning',
  alertCaution: 'Caution',
);

const MawyStrings _ko = MawyStrings._(
  toolbar: '문서 설정',
  fontFamily: '글꼴',
  fontFamilySans: '고딕',
  fontFamilySerif: '명조',
  fontFamilyMono: '고정폭',
  fontSize: '글자 크기',
  lineHeight: '줄 간격',
  letterSpacing: '자간',
  measure: '본문 폭',
  measureNarrow: '좁게',
  measureNormal: '보통',
  measureWide: '넓게',
  measureFull: '전체 폭',
  colorScheme: '테마',
  colorSchemeLight: '라이트',
  colorSchemeDark: '다크',
  colorSchemeSystem: '시스템 설정 따르기',
  divider: '창 크기 조절',
  outline: '목차',
  outlineEmpty: '제목이 없는 문서입니다.',
  copy: '마크다운 원문 복사',
  copied: '복사했습니다',
  copyFailed: '복사하지 못했습니다',
  copyCode: '이 코드 복사',
  close: '닫기',
  document: '문서',
  reset: '기본값으로',
  footnotes: '각주',
  footnoteBack: '언급된 자리로 돌아가기',
  editor: '문서',
  undo: '실행 취소',
  redo: '다시 실행',
  source: '마크다운 원문',
  sourceEscape: 'Tab은 들여쓰기입니다. 빠져나가려면 Escape를 누른 다음 Tab을 누르세요.',
  mode: '보기',
  modePlain: '원문',
  modePreview: '미리보기',
  modeSplit: '나란히',
  bold: '굵게',
  italic: '기울임',
  strikethrough: '취소선',
  codeSpan: '코드',
  link: '링크',
  image: '이미지',
  heading: '제목',
  heading1: '제목 1',
  heading2: '제목 2',
  heading3: '제목 3',
  heading4: '제목 4',
  heading5: '제목 5',
  heading6: '제목 6',
  paragraph: '본문',
  quote: '인용',
  bulletList: '순서 없는 목록',
  orderedList: '순서 있는 목록',
  taskList: '체크 목록',
  codeBlock: '코드 블록',
  table: '표',
  tableInsert: '표 넣기',
  tableSize: '%C × %R',
  tableInsertSized: '%C열 %R행 표 넣기',
  tableRowBelow: '아래에 행 추가',
  tableRowAbove: '위에 행 추가',
  tableColumnAfter: '뒤에 열 추가',
  tableColumnBefore: '앞에 열 추가',
  tableRowRemove: '이 행 삭제',
  tableColumnRemove: '이 열 삭제',
  tableRowsAbove: '위에 행 %N개 추가',
  tableRowsBelow: '아래에 행 %N개 추가',
  tableColumnsBefore: '앞에 열 %N개 추가',
  tableColumnsAfter: '뒤에 열 %N개 추가',
  tableRowsRemove: '이 행 %N개 삭제',
  tableColumnsRemove: '이 열 %N개 삭제',
  tableCellsClear: '선택한 셀 비우기',
  tableAlignLeft: '왼쪽 정렬',
  tableAlignCenter: '가운데 정렬',
  tableAlignRight: '오른쪽 정렬',
  tableRemove: '표 삭제',
  thematicBreak: '구분선',
  footnote: '각주',
  status: '문서 통계',
  statusPosition: '%L행 %C열',
  statusSelected: '%N자 선택',
  statusLines: '줄',
  statusWords: '단어',
  statusCharacters: '자',
  editorPlaceholder: '여기에 입력…',
  oneSpace: '공백은 한 번만 입력할 수 있습니다.',
  oneBreak: '개행은 한 번만 입력할 수 있습니다.',
  openFile: '파일 열기',
  emptyTitle: '마크다운 파일 열기',
  emptyHint: '여기에 .md 파일을 놓거나, 열 파일을 고르세요.',
  emptyAction: '파일 선택',
  find: '찾기',
  replace: '바꾸기',
  findMatchCase: '대소문자 구분',
  findPrevious: '이전 결과',
  findNext: '다음 결과',
  findClose: '찾기 닫기',
  findMatches: '%T개 중 %N번째',
  findNoMatches: '결과 없음',
  replaceOne: '바꾸기',
  replaceAll: '모두 바꾸기',
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고',
);

/// The strings for a locale.
MawyStrings stringsFor(MawyLocale locale) => locale == MawyLocale.ko ? _ko : _en;
