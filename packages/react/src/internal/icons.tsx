/**
 * Every glyph the library draws, named once.
 *
 * The drawings are [Lucide](https://lucide.dev)'s, under the ISC licence, and
 * they arrive through `lucide-react` — the one runtime dependency this package
 * has. It is here rather than spread across the components for the reason any
 * shared module exists: two copies of "which icon means line height" drift, and
 * an editor whose toolbar and whose menu disagree about a glyph is an editor
 * with two vocabularies.
 *
 * Nothing in this file is re-exported from `src/index.ts`. An application that
 * wants Lucide has Lucide; what it gets from Mawy is a viewer, and the shape of
 * the icon on a toolbar button is not part of that contract.
 */

export {
  ALargeSmall as FontSizeIcon,
  Bold as BoldIcon,
  Braces as CodeBlockIcon,
  Code as CodeIcon,
  Columns2 as SplitIcon,
  Eye as PreviewIcon,
  Heading1 as Heading1Icon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List as BulletListIcon,
  ListChecks as TaskListIcon,
  ListOrdered as OrderedListIcon,
  Minus as RuleIcon,
  PencilLine as SourceIcon,
  Pilcrow as ParagraphIcon,
  SquarePen as WysiwygIcon,
  Strikethrough as StrikethroughIcon,
  TextQuote as QuoteIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  CircleAlert as ImportantIcon,
  Copy as CopyIcon,
  FileText as DocumentIcon,
  FolderOpen as OpenFileIcon,
  Info as NoteIcon,
  Lightbulb as TipIcon,
  ListTree as OutlineIcon,
  Moon as DarkIcon,
  OctagonAlert as CautionIcon,
  StretchHorizontal as MeasureIcon,
  Sun as LightIcon,
  SunMoon as SystemThemeIcon,
  TriangleAlert as WarningIcon,
  Type as FontFamilyIcon,
  UnfoldHorizontal as LetterSpacingIcon,
  UnfoldVertical as LineHeightIcon,
  Upload as UploadIcon,
  X as CloseIcon
} from 'lucide-react';
