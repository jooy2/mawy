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

/** Where a table column's content sits. `null` is "the column said nothing". */
export type MdAlign = 'left' | 'center' | 'right' | null;

export interface MdRoot {
  type: 'root';
  children: MdBlock[];
}

export interface MdHeading {
  type: 'heading';
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
  children: MdInline[];
}

export interface MdCode {
  type: 'code';
  /** The first word of the info string — `ts` in ```` ```ts twoslash ````. */
  lang: string | null;
  /** Everything after it, untouched. Nothing reads this yet. */
  meta: string | null;
  value: string;
}

export interface MdBlockquote {
  type: 'blockquote';
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
  /** `null` unless the item opened with `[ ]` or `[x]`. */
  checked: boolean | null;
  children: MdBlock[];
}

export interface MdTable {
  type: 'table';
  /** One entry per column, from the delimiter row. */
  align: MdAlign[];
  children: MdTableRow[];
}

export interface MdTableRow {
  type: 'tableRow';
  header: boolean;
  children: MdTableCell[];
}

export interface MdTableCell {
  type: 'tableCell';
  children: MdInline[];
}

export interface MdThematicBreak {
  type: 'thematicBreak';
}

export interface MdHtmlBlock {
  type: 'html';
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
  value: string;
}

export interface MdEmphasis {
  type: 'emphasis';
  children: MdInline[];
}

export interface MdStrong {
  type: 'strong';
  children: MdInline[];
}

export interface MdDelete {
  type: 'delete';
  children: MdInline[];
}

export interface MdInlineCode {
  type: 'inlineCode';
  value: string;
}

export interface MdLink {
  type: 'link';
  url: string;
  title: string | null;
  children: MdInline[];
}

export interface MdImage {
  type: 'image';
  url: string;
  title: string | null;
  alt: string;
}

/** A hard line break — two trailing spaces, or a trailing backslash. */
export interface MdBreak {
  type: 'break';
}

export interface MdInlineHtml {
  type: 'inlineHtml';
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
}

export interface MdDocument {
  root: MdRoot;
  outline: MdOutlineEntry[];
}
