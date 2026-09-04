/**
 * The parser, and the tree it produces.
 *
 * Its own entry point, because an application that only wants to *read* a
 * document — its outline for a table of contents, its footnotes, the anchor a
 * heading was given — should not be made to pull in a component to get at
 * them. Nothing here draws anything and nothing here is a React component, so
 * this reaches a build script and a server as readily as it reaches a page.
 *
 *     import { parseMarkdown } from 'mawy-react/markdown';
 *
 *     const { outline } = parseMarkdown(document);
 *
 * The Flutter package has exported the same three things since it had a
 * parser, for the same reason and under the same names. This is the half of
 * "one library shipped twice" that was only true of the drawing.
 *
 * The tree is what the parser produces and what the renderer reads, so it is
 * a real interface and it moves under semantic versioning like everything else
 * exported here.
 */

export { parseMarkdown, slugify, type MarkdownOptions } from './internal/markdown/parse.js';
export type {
  MdAlertKind,
  MdAlign,
  MdBlock,
  MdBlockquote,
  MdBreak,
  MdCode,
  MdContainerDirective,
  MdDefinition,
  MdDefinitionDescription,
  MdDefinitionList,
  MdDefinitionTerm,
  MdDelete,
  MdDocument,
  MdEmphasis,
  MdFootnoteDefinition,
  MdFootnoteReference,
  MdHeading,
  MdHtmlBlock,
  MdImage,
  MdInline,
  MdInlineCode,
  MdLeafDirective,
  MdLink,
  MdList,
  MdListItem,
  MdOutlineEntry,
  MdParagraph,
  MdRange,
  MdRoot,
  MdStrong,
  MdTable,
  MdTableCell,
  MdTableRow,
  MdText,
  MdTextDirective,
  MdThematicBreak
} from './internal/markdown/ast.js';
