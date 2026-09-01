/// What a highlighter says about a code block.
///
/// A file of its own, and Flutter is not imported into it, which is the reason
/// it is not in `types.dart` with the rest of the vocabulary: `tool/parity.dart`
/// runs the highlighter under the plain Dart VM to diff it against the React
/// package's, and a library that reaches `package:flutter/widgets.dart` cannot
/// be compiled by one. `types.dart` re-exports all three, so nothing about the
/// package as an application reads it has moved.
library;

/// What a run of a code block is, as far as a highlighter is willing to say.
///
/// Thirteen names and no more. A highlighter that told the renderer about
/// forty kinds of thing would be a palette with forty colours in it, which is a
/// code block nobody reads — several of these are drawn in the same colour on
/// purpose.
enum MawyCodeTokenKind {
  /// `// like this`.
  comment,

  /// `'like this'`.
  string,

  /// `/like this/`.
  regex,

  /// `42`.
  number,

  /// `true`, `null`, `self`.
  constant,

  /// `return`, `class`.
  keyword,

  /// `String`, `int`.
  type,

  /// A name being called.
  function,

  /// `$name`, `--custom-property`.
  variable,

  /// A key, an attribute name.
  attribute,

  /// `<div`.
  tag,

  /// `+`, `=>`.
  operator,

  /// `{`, `;`.
  punctuation,
}

/// One run of a code block, and what it is.
///
/// Not annotated `@immutable`, for the same reason this file has no imports:
/// the annotation is `package:meta`'s, which arrives with Flutter.
class MawyCodeToken {
  /// Creates a run of code.
  const MawyCodeToken(this.text, [this.kind]);

  /// The characters.
  final String text;

  /// `null` for a run that is nothing in particular.
  final MawyCodeTokenKind? kind;
}

/// Something that can colour a code block.
///
/// Tokens rather than markup, which is the whole shape of it: what a
/// highlighter hands back is text and names, and the renderer decides what each
/// becomes. Nothing reaches the screen as markup of any kind, here as anywhere
/// else in this library, and a highlighter cannot put anything in a document by
/// being wrong.
///
/// The one thing a highlighter has to promise is that its tokens *are* the
/// code: joining every [MawyCodeToken.text] back together has to give back
/// exactly what it was given. What it hands back is checked against that, and a
/// block that fails the check is drawn plain — colour is not worth a document
/// that says something else.
abstract class MawyHighlighter {
  /// Allows subclasses to be const.
  const MawyHighlighter();

  /// Whether it has anything to say about this language.
  bool supports(String language);

  /// The code, taken apart.
  List<MawyCodeToken> highlight(String code, String language);
}
