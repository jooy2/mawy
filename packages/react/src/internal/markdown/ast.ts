/**
 * The document model.
 *
 * Mawy parses Markdown to this tree and renders the tree, rather than parsing
 * Markdown to a string of HTML. That is the decision the viewer's safety story
 * rests on: a node cannot become an element the renderer did not decide to
 * draw, so the parser has no path to the page that the renderer does not own.
 *
 * The shapes below are close to `mdast` on purpose. Where a name could go
 * either way it is mdast's, so that anyone who has read a Markdown AST before
 * has read this one — but nothing here is imported from it, and the tree is
 * ours to change.
 */

/**
 * Where a node came from: the half-open range of the source it was read out of,
 * in the offsets of the string handed to `parseMarkdown`.
 *
 * Every node has one, and a child's range always sits inside its parent's — so
 * the tree can be searched for the node covering a position, and a node can be
 * pointed back at the characters that made it. That is what a preview scrolling
 * in step with the source needs, and what editing the rendered document and
 * writing the edit back to the Markdown will need.
 *
 * A range spans everything between its two ends, which inside a container means
 * the container's own prefixes as well: the second paragraph line of a
 * blockquote is reached across a `\n> `, and the range covers it. What a range
 * does *not* promise is that its inside lines up character for character. A
 * `text` node written with a character reference or a backslash escape is
 * shorter than the source it came from, and the only thing that can be said
 * about a position in the middle of it is that it lies between the two ends.
 */
export interface MdRange {
  /** Where the node's first character sits. */
  start: number;
  /** Where its last character ends. */
  end: number;
}

/** Where a table column's content sits. `null` is "the column said nothing". */
export type MdAlign = 'left' | 'center' | 'right' | null;

export interface MdRoot {
  type: 'root';
  range: MdRange;
  children: MdBlock[];
}

export interface MdHeading {
  type: 'heading';
  range: MdRange;
  /** 1 through 6. */
  depth: number;
  children: MdInline[];
  /**
   * The slug the renderer gives the element as its `id`, and the outline links
   * to. Assigned after parsing, because uniqueness is a property of the whole
   * document rather than of one heading.
   */
  slug: string;
}

export interface MdParagraph {
  type: 'paragraph';
  range: MdRange;
  children: MdInline[];
}

export interface MdCode {
  type: 'code';
  range: MdRange;
  /**
   * Where the code itself sits — inside the fences, or past the four spaces of
   * an indented block. Empty and equal to each other for a block with nothing
   * in it, which is still a place a caret can be and so still needs an answer.
   */
  content: MdRange;
  /** The first word of the info string — `ts` in ```` ```ts twoslash ````. */
  lang: string | null;
  /** Everything after it, untouched. Nothing reads this yet. */
  meta: string | null;
  value: string;
}

export interface MdBlockquote {
  type: 'blockquote';
  range: MdRange;
  children: MdBlock[];
  /**
   * A GitHub alert's kind — `> [!NOTE]` and its four siblings — lowercased.
   * `null` for an ordinary quotation.
   */
  alert: MdAlertKind | null;
}

export type MdAlertKind = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export interface MdList {
  type: 'list';
  range: MdRange;
  ordered: boolean;
  /** The first number of an ordered list. `1` for a bullet list. */
  start: number;
  /**
   * Whether the items are separated by blank lines. A loose list wraps each
   * item's content in paragraphs and spaces them; a tight one does not.
   */
  loose: boolean;
  children: MdListItem[];
}

export interface MdListItem {
  type: 'listItem';
  range: MdRange;
  /** `null` unless the item opened with `[ ]` or `[x]`. */
  checked: boolean | null;
  children: MdBlock[];
}

export interface MdTable {
  type: 'table';
  range: MdRange;
  /** One entry per column, from the delimiter row. */
  align: MdAlign[];
  children: MdTableRow[];
}

export interface MdTableRow {
  type: 'tableRow';
  range: MdRange;
  header: boolean;
  children: MdTableCell[];
}

export interface MdTableCell {
  type: 'tableCell';
  range: MdRange;
  children: MdInline[];
}

export interface MdThematicBreak {
  type: 'thematicBreak';
  range: MdRange;
}

export interface MdHtmlBlock {
  type: 'html';
  range: MdRange;
  value: string;
}

export type MdBlock =
  | MdHeading
  | MdParagraph
  | MdCode
  | MdBlockquote
  | MdList
  | MdTable
  | MdThematicBreak
  | MdHtmlBlock;

export interface MdText {
  type: 'text';
  range: MdRange;
  value: string;
}

export interface MdEmphasis {
  type: 'emphasis';
  range: MdRange;
  children: MdInline[];
}

export interface MdStrong {
  type: 'strong';
  range: MdRange;
  children: MdInline[];
}

export interface MdDelete {
  type: 'delete';
  range: MdRange;
  children: MdInline[];
}

export interface MdInlineCode {
  type: 'inlineCode';
  range: MdRange;
  value: string;
}

export interface MdLink {
  type: 'link';
  range: MdRange;
  url: string;
  title: string | null;
  children: MdInline[];
}

export interface MdImage {
  type: 'image';
  range: MdRange;
  url: string;
  title: string | null;
  alt: string;
}

/** A hard line break — two trailing spaces, or a trailing backslash. */
export interface MdBreak {
  type: 'break';
  range: MdRange;
}

export interface MdInlineHtml {
  type: 'inlineHtml';
  range: MdRange;
  value: string;
}

export type MdInline =
  | MdText
  | MdEmphasis
  | MdStrong
  | MdDelete
  | MdInlineCode
  | MdLink
  | MdImage
  | MdBreak
  | MdInlineHtml;

export type MdNode = MdRoot | MdBlock | MdListItem | MdTableRow | MdTableCell | MdInline;

/** A link reference definition, keyed by its normalised label. */
export interface MdDefinition {
  url: string;
  title: string | null;
}

/**
 * A heading as the outline sees it: the slug to jump to and the text to show.
 *
 * Built while parsing rather than walked for afterwards, because the renderer
 * and the outline have to agree on the slug exactly — an outline that links to
 * an `id` the renderer spelled differently is a table of contents where every
 * row does nothing.
 */
export interface MdOutlineEntry {
  depth: number;
  slug: string;
  text: string;
  /** The heading's own range, so the outline can point at the source too. */
  range: MdRange;
}

export interface MdDocument {
  root: MdRoot;
  outline: MdOutlineEntry[];
}
