/// The document model.
///
/// Mawy parses Markdown to this tree and draws the tree, rather than parsing
/// Markdown to a string of HTML and handing that to something else. That is the
/// decision the whole package rests on: a node cannot become a widget the
/// renderer did not decide to build, so the parser has no path to the screen
/// that the renderer does not own.
///
/// This is the React package's `internal/markdown/ast.ts`, in Dart. The shapes
/// are the same shapes on purpose — the two packages are one library shipped
/// twice, and a document that means one thing in a browser has to mean the same
/// thing in an app. Where a name could go either way it is the React one, so
/// that a change to either is a change anyone can find in the other.
library;

/// Where a node came from: the half-open range of the source it was read out
/// of, in the offsets of the string handed to `parseMarkdown`.
///
/// Every node has one, and a child's range always sits inside its parent's — so
/// the tree can be searched for the node covering a position, and a node can be
/// pointed back at the characters that made it.
///
/// A range spans everything between its two ends, which inside a container
/// means the container's own prefixes as well: the second paragraph line of a
/// quotation is reached across a `\n> `, and the range covers it. What a range
/// does *not* promise is that its inside lines up character for character. A
/// [MdText] written with a character reference or a backslash escape is shorter
/// than the source it came from, and the only thing that can be said about a
/// position in the middle of it is that it lies between the two ends.
class MdRange {
  /// A range from [start] up to but not including [end].
  const MdRange(this.start, this.end);

  /// Where the node's first character sits.
  final int start;

  /// Where its last character ends.
  final int end;

  @override
  bool operator ==(Object other) => other is MdRange && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);

  @override
  String toString() => 'MdRange($start, $end)';
}

/// Anything in the tree: a block, an inline, or one of the pieces in between.
abstract class MdNode {
  /// Creates a node covering [range].
  MdNode(this.range);

  /// Where in the document this node was read from.
  ///
  /// Not final, and for two reasons that are both about the parse rather than
  /// about the tree a reader gets. Pairing off emphasis moves the ends of the
  /// text nodes the delimiters lived in, and a document with a byte order mark
  /// or Windows line endings has every offset read back through the tidying
  /// that removed them. By the time the parser returns, nothing moves.
  MdRange range;
}

/// A block: something that stands on its own down the page.
abstract class MdBlock extends MdNode {
  /// Creates a block covering [range].
  MdBlock(super.range);
}

/// A run of text inside a block.
abstract class MdInline extends MdNode {
  /// Creates an inline node covering [range].
  MdInline(super.range);
}

/// Where a table column's content sits. `null` is "the column said nothing".
enum MdAlign {
  /// Against the start edge.
  left,

  /// In the middle.
  center,

  /// Against the end edge.
  right,
}

/// The five kinds of GitHub alert a quotation can open with.
enum MdAlertKind {
  /// `> [!NOTE]`
  note,

  /// `> [!TIP]`
  tip,

  /// `> [!IMPORTANT]`
  important,

  /// `> [!WARNING]`
  warning,

  /// `> [!CAUTION]`
  caution,
}

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

/// The document itself, and everything in it.
class MdRoot extends MdNode {
  /// Creates the root of a parsed document.
  MdRoot(super.range, this.children);

  /// The blocks the document is made of.
  final List<MdBlock> children;
}

/// A heading, written with hashes or with an underline.
class MdHeading extends MdBlock {
  /// Creates a heading of [depth], covering [range].
  MdHeading(super.range, {required this.depth, required this.children});

  /// 1 through 6.
  final int depth;

  /// What the heading says.
  final List<MdInline> children;

  /// The `id` the renderer gives it, and the outline links to.
  ///
  /// Assigned after parsing, because uniqueness is a property of the whole
  /// document rather than of one heading.
  String slug = '';
}

/// A paragraph.
class MdParagraph extends MdBlock {
  /// Creates a paragraph covering [range].
  MdParagraph(super.range, this.children);

  /// What the paragraph says.
  final List<MdInline> children;
}

/// A fenced or indented code block.
class MdCode extends MdBlock {
  /// Creates a code block covering [range].
  MdCode(
    super.range, {
    required this.content,
    required this.lines,
    required this.lang,
    required this.meta,
    required this.value,
  });

  /// Where the code itself sits — inside the fences, or past the four spaces of
  /// an indented block. Empty and equal to each other for a block with nothing
  /// in it, which is still a place and so still needs an answer.
  final MdRange content;

  /// Where each line of [value] starts in the document, so a piece of the code
  /// can be pointed back at the characters it came from.
  final List<int> lines;

  /// The first word of the info string — `ts` in ` ```ts twoslash `.
  final String? lang;

  /// Everything after it, untouched. Nothing reads this yet.
  final String? meta;

  /// The code, exactly as it was written.
  final String value;
}

/// A quotation, and the five GitHub alerts that are written as one.
class MdBlockquote extends MdBlock {
  /// Creates a quotation covering [range].
  MdBlockquote(super.range, {required this.children, required this.alert});

  /// What is quoted.
  final List<MdBlock> children;

  /// A GitHub alert's kind — `> [!NOTE]` and its four siblings. `null` for an
  /// ordinary quotation.
  final MdAlertKind? alert;
}

/// A bullet or ordered list.
class MdList extends MdBlock {
  /// Creates a list covering [range].
  MdList(
    super.range, {
    required this.ordered,
    required this.start,
    required this.loose,
    required this.children,
  });

  /// Whether the items are numbered.
  final bool ordered;

  /// The first number of an ordered list. `1` for a bullet list.
  final int start;

  /// Whether the items are separated by blank lines. A loose list wraps each
  /// item's content in paragraphs and spaces them; a tight one does not.
  final bool loose;

  /// The items.
  final List<MdListItem> children;
}

/// One item of a list.
class MdListItem extends MdNode {
  /// Creates a list item covering [range].
  MdListItem(super.range, {required this.checked, required this.children});

  /// `null` unless the item opened with `[ ]` or `[x]`.
  final bool? checked;

  /// What the item holds.
  final List<MdBlock> children;
}

/// A GitHub table.
class MdTable extends MdBlock {
  /// Creates a table covering [range].
  MdTable(super.range, {required this.align, required this.children});

  /// One entry per column, from the delimiter row.
  final List<MdAlign?> align;

  /// The rows, header first.
  final List<MdTableRow> children;
}

/// One row of a table.
class MdTableRow extends MdNode {
  /// Creates a row covering [range].
  MdTableRow(super.range, {required this.header, required this.children});

  /// Whether this is the row above the delimiter.
  final bool header;

  /// The cells.
  final List<MdTableCell> children;
}

/// One cell of a table row.
class MdTableCell extends MdNode {
  /// Creates a cell covering [range].
  MdTableCell(super.range, this.children);

  /// What the cell says.
  final List<MdInline> children;
}

/// A term and what it means, which Markdown proper has no way of writing.
///
/// PHP Markdown Extra's syntax, and the one everybody who writes these uses: a
/// line of text, then a line opening with a colon.
class MdDefinitionList extends MdBlock {
  /// Creates a definition list covering [range].
  MdDefinitionList(super.range, {required this.loose, required this.children});

  /// Whether the terms and their meanings are separated by blank lines, the
  /// same distinction a bullet list makes and for the same reason.
  final bool loose;

  /// The terms and the meanings, in the order they were written.
  final List<MdNode> children;
}

/// The word being defined. One line, and inline content like a heading's.
class MdDefinitionTerm extends MdNode {
  /// Creates a term covering [range].
  MdDefinitionTerm(super.range, this.children);

  /// What the term says.
  final List<MdInline> children;
}

/// What a term means. Blocks, because a definition can be a whole paragraph.
class MdDefinitionDescription extends MdNode {
  /// Creates a description covering [range].
  MdDefinitionDescription(super.range, this.children);

  /// What the description holds.
  final List<MdBlock> children;
}

/// A footnote, where it was written.
///
/// These do not stay in the block flow. Like a link reference definition, a
/// footnote is written wherever it suits the author and read wherever it is
/// referred to — so the parser lifts them out and [MdDocument.footnotes] holds
/// the ones something actually pointed at, in the order they were first pointed
/// at, which is the order they are numbered in.
class MdFootnoteDefinition extends MdNode {
  /// Creates a footnote covering [range].
  MdFootnoteDefinition(super.range, {required this.label, required this.children});

  /// The normalised label, which is what a reference is matched against.
  final String label;

  /// What the note says.
  final List<MdBlock> children;

  /// What the reference and the note are given as anchors.
  String slug = '';

  /// Which footnote this is, counting from one, in reference order.
  int number = 0;
}

/// A horizontal rule.
class MdThematicBreak extends MdBlock {
  /// Creates a thematic break covering [range].
  MdThematicBreak(super.range);
}

/// A run of raw HTML written as a block.
///
/// Flutter has no HTML to draw it as, so it is shown as the characters it was
/// written with. That is not a policy this package chooses between — there is
/// nothing else it could be, and the React package's `html: 'sanitize'` has no
/// meaning here.
class MdHtmlBlock extends MdBlock {
  /// Creates an HTML block covering [range].
  MdHtmlBlock(super.range, this.value);

  /// The markup, as written.
  final String value;
}

/// A construct the parser reads and does not understand.
///
/// The point of a directive is that this package has no opinion about what one
/// means. It reads the shape — a name, an optional `[label]`, optional
/// `{key=value}` attributes, and for a container the blocks inside it — and
/// hands that to whatever is drawing the document. Which is what lets a document
/// carry a video, a formula or a house callout without any of the three being
/// something the parser had to be taught.
///
/// Three forms, and the number of colons is which:
///
///     :::note[Careful]{kind=warning}
///     Blocks, parsed as blocks.
///     :::
///
///     ::video{src=/a.mp4}
///
///     Press :kbd[Ctrl] to go.
///
/// The syntax is the generic directives proposal's, which is what
/// `remark-directive` reads, so a document written for one is read by the other.
/// Two rules here are narrower than that extension's, and both are about not
/// changing what an existing document means: the opening colons must be followed
/// immediately by the name, so `::: tip` with a space is a paragraph the way it
/// always was; and a text directive must carry a label or attributes, so a `:`
/// in the middle of a sentence stays a colon.
class MdContainerDirective extends MdBlock {
  /// Creates a container directive covering [range].
  MdContainerDirective(
    super.range, {
    required this.name,
    required this.attributes,
    required this.label,
    required this.children,
  });

  /// The name the document wrote after the colons.
  final String name;

  /// `{key=value}`, in the order they were written.
  final Map<String, String> attributes;

  /// The `[label]` on the opening line. Empty when the document wrote none.
  final List<MdInline> label;

  /// The blocks between the opening line and the closing colons.
  final List<MdBlock> children;
}

/// `::name[label]{attrs}` on a line of its own.
class MdLeafDirective extends MdBlock {
  /// Creates a leaf directive covering [range].
  MdLeafDirective(
    super.range, {
    required this.name,
    required this.attributes,
    required this.children,
  });

  /// The name the document wrote after the colons.
  final String name;

  /// `{key=value}`, in the order they were written.
  final Map<String, String> attributes;

  /// The `[label]`. Empty when the document wrote none.
  final List<MdInline> children;
}

/* -------------------------------------------------------------------------
 * Inline
 * ---------------------------------------------------------------------- */

/// A run of plain text.
class MdText extends MdInline {
  /// Creates a text node covering [range].
  MdText(super.range, this.value);

  /// The characters, with escapes and character references already decoded.
  ///
  /// Not final for the same reason [range] is not: an unpaired run of asterisks
  /// is text, and how much of it is left over is only known once the whole line
  /// has been read.
  String value;
}

/// `*emphasis*`.
class MdEmphasis extends MdInline {
  /// Creates an emphasis node covering [range].
  MdEmphasis(super.range, this.children);

  /// What is emphasised.
  final List<MdInline> children;
}

/// `**strong**`.
class MdStrong extends MdInline {
  /// Creates a strong node covering [range].
  MdStrong(super.range, this.children);

  /// What is strong.
  final List<MdInline> children;
}

/// `~~struck through~~`.
class MdDelete extends MdInline {
  /// Creates a strikethrough node covering [range].
  MdDelete(super.range, this.children);

  /// What is struck through.
  final List<MdInline> children;
}

/// `` `code` ``.
class MdInlineCode extends MdInline {
  /// Creates a code span covering [range].
  MdInlineCode(super.range, this.value);

  /// The code, as written.
  final String value;
}

/// A link.
class MdLink extends MdInline {
  /// Creates a link covering [range].
  MdLink(super.range, {required this.url, required this.title, required this.children});

  /// Where it goes, already checked against the scheme allowlist.
  final String url;

  /// The `title`, if one was written.
  final String? title;

  /// What the link says.
  final List<MdInline> children;
}

/// An image.
class MdImage extends MdInline {
  /// Creates an image covering [range].
  MdImage(super.range, {required this.url, required this.title, required this.alt});

  /// Where the picture is, already checked against the scheme allowlist.
  final String url;

  /// The `title`, if one was written.
  final String? title;

  /// What the image is, for a reader who is not seeing it.
  final String alt;
}

/// A `[^label]` in a sentence, pointing at a footnote written elsewhere.
class MdFootnoteReference extends MdInline {
  /// Creates a footnote reference covering [range].
  MdFootnoteReference(super.range, this.label);

  /// The normalised label.
  final String label;

  /// Which mention of this footnote it is, counting from zero. Only the first
  /// is the place the footnote comes back to.
  int index = 0;
}

/// A hard line break.
class MdBreak extends MdInline {
  /// Creates a hard break covering [range].
  MdBreak(super.range);
}

/// `:name[label]{attrs}` inside a sentence. See [MdContainerDirective].
class MdTextDirective extends MdInline {
  /// Creates a text directive covering [range].
  MdTextDirective(
    super.range, {
    required this.name,
    required this.attributes,
    required this.children,
  });

  /// The name the document wrote after the colon.
  final String name;

  /// `{key=value}`, in the order they were written.
  final Map<String, String> attributes;

  /// The `[label]`. Empty when the document wrote none.
  final List<MdInline> children;
}

/// A run of raw HTML written inside a sentence, shown as the text it is.
class MdInlineHtml extends MdInline {
  /// Creates an inline HTML node covering [range].
  MdInlineHtml(super.range, this.value);

  /// The markup, as written.
  final String value;
}

/* -------------------------------------------------------------------------
 * The document
 * ---------------------------------------------------------------------- */

/// A link reference definition, keyed by its normalised label.
class MdDefinition {
  /// Creates a definition pointing at [url].
  const MdDefinition(this.url, this.title);

  /// Where it goes.
  final String url;

  /// The `title`, if one was written.
  final String? title;
}

/// One heading, as the outline lists it.
class MdOutlineEntry {
  /// Creates an outline entry.
  const MdOutlineEntry({
    required this.depth,
    required this.slug,
    required this.text,
    required this.range,
  });

  /// 1 through 6.
  final int depth;

  /// The heading's anchor.
  final String slug;

  /// What it says, with the formatting taken off.
  final String text;

  /// The heading's own range, so the outline can point at the source too.
  final MdRange range;
}

/// A parsed document: the tree, its outline, and the footnotes under it.
class MdDocument {
  /// Creates a parsed document.
  const MdDocument({required this.root, required this.outline, required this.footnotes});

  /// The blocks.
  final MdRoot root;

  /// Every heading, in order, with a unique slug.
  final List<MdOutlineEntry> outline;

  /// The footnotes something in the document pointed at, in the order they were
  /// first pointed at.
  ///
  /// They are not in [root] — a footnote is written wherever it suits the
  /// author and read at the bottom — so whatever draws a document draws these
  /// after it. A footnote nobody referred to is not here, the same way a link
  /// reference definition nobody used is nowhere in the tree either.
  final List<MdFootnoteDefinition> footnotes;
}
