/// Mawy — a Markdown viewer that also does the parsing.
///
/// The document becomes widgets rather than a string of HTML, which is what
/// makes the safe default free: there is no markup on the path from Markdown to
/// the screen, so there is nothing to escape and nowhere for an injection to
/// arrive.
///
/// The parser is this package's own, and it is the React package's own parser
/// in Dart — the same file names, the same functions, the same rules. A
/// document that means one thing in a browser means the same thing here, and
/// `tool/parity.dart` is what keeps that true rather than hoped for.
///
/// Nothing here imports `package:flutter/material.dart` or
/// `package:flutter/cupertino.dart`. Every widget is built on
/// `package:flutter/widgets.dart` alone, which is what lets a document sit
/// inside a Material app, a Cupertino app or a bare [WidgetsApp] without
/// dragging a second design system in behind it.
///
/// ```dart
/// import 'package:mawy/mawy.dart';
///
/// MawyViewer(value: '# Hello\n\nSome **Markdown**.')
/// ```
library;

export 'src/code.dart';
export 'src/editor/commands.dart'
    show EditState, MawyCommand, commandActive, continueList, indent, runCommand;
export 'src/editor/mawy_editor.dart'
    show
        MawyEditor,
        MawyEditorMode,
        MawyEditorStatusItem,
        MawyEditorToolbarItem,
        kMawyEditorModes,
        kMawyEditorStatus,
        kMawyEditorToolbar;
export 'src/highlight.dart' show kMawyHighlightLanguages, mawyHighlighter;
export 'src/markdown/ast.dart';
export 'src/markdown/parse.dart' show MawyParseOptions, parseMarkdown, slugify;
export 'src/theme/tokens.dart';
export 'src/types.dart';
export 'src/viewer/mawy_viewer.dart' show MawyViewer, kMawyViewerToolbar;
