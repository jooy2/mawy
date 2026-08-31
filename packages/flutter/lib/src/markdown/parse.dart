/// Markdown in, document out.
///
/// Two passes, and the order is the point. Blocks first, because a link written
/// as `[see][ref]` cannot be resolved until the `[ref]:` line at the bottom of
/// the file has been read — so the block pass sets every paragraph's text aside
/// and collects definitions as it goes, and only then is any of that text read
/// as inline content.
library;

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/block.dart';
import 'package:mawy/src/markdown/inline.dart';
import 'package:mawy/src/markdown/source.dart';

/// How the Markdown itself is read.
class MawyParseOptions {
  /// Creates a set of parse options.
  const MawyParseOptions({this.gfm = true, this.breaks = false, this.definitionLists = true});

  /// GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~`, alerts,
  /// footnotes and bare URLs becoming links.
  final bool gfm;

  /// Whether a single newline inside a paragraph is a line break.
  ///
  /// Off by default, because that is what Markdown says and because a document
  /// written elsewhere would reflow differently here. On, it matches the way
  /// chat clients and issue trackers behave, which is what a reader who has
  /// never written Markdown expects.
  final bool breaks;

  /// Whether a line opening with `: ` under a line of text is a definition
  /// list.
  ///
  /// On, and it is the one thing Mawy reads that GitHub does not — the syntax
  /// is PHP Markdown Extra's and it is the one everybody who writes these uses.
  /// Turn it off for a document that has to mean exactly what it would mean
  /// there.
  final bool definitionLists;

  @override
  bool operator ==(Object other) =>
      other is MawyParseOptions &&
      other.gfm == gfm &&
      other.breaks == breaks &&
      other.definitionLists == definitionLists;

  @override
  int get hashCode => Object.hash(gfm, breaks, definitionLists);
}

/* -------------------------------------------------------------------------
 * Reading the document into lines
 * ---------------------------------------------------------------------- */

/// The document as the scanner reads it, and the way back to the one that was
/// handed in.
///
/// Three things are tidied before a rule is applied to a line: a byte order
/// mark is not a character in the document, a `\r\n` is one line ending rather
/// than two characters, and a tab at the front of a line is four columns of
/// indentation to every rule that measures one. Each is far easier to remove
/// once than to allow for in twenty places.
///
/// All three also move every offset after them, and the offsets are the point
/// of the exercise — so each place the two texts stop lining up is written
/// down, and [_documentOffset] reads a position back through them. A file with
/// Unix line endings and no leading tabs has none of them, which is the usual
/// case and costs nothing.
class _Reading {
  _Reading(this.lines, this.length, this.breaks, this.origins);

  final List<Line> lines;

  /// How long the tidied text is.
  final int length;

  /// Offsets in the tidied text where it stops lining up, ascending.
  final List<int> breaks;

  /// The offset in the original each of those sits at.
  final List<int> origins;
}

_Reading _read(String source) {
  final List<Line> lines = <Line>[];
  final List<int> breaks = <int>[];
  final List<int> origins = <int>[];
  int at = source.startsWith('\u{feff}') ? 1 : 0;
  int out = 0;

  void mark() {
    breaks.add(out);
    origins.add(at);
  }

  if (at > 0) {
    mark();
  }

  while (at <= source.length) {
    final int start = out;
    final StringBuffer text = StringBuffer();

    while (at < source.length && source[at] == '\t') {
      text.write('    ');
      at += 1;
      out += 4;
      mark();
    }

    while (at < source.length && source[at] != '\n' && source[at] != '\r') {
      text.write(source[at]);
      at += 1;
      out += 1;
    }

    lines.add(Line(text.toString(), start));

    if (at >= source.length) {
      break;
    }

    final bool carriage = source[at] == '\r' && at + 1 < source.length && source[at + 1] == '\n';

    at += carriage ? 2 : 1;
    out += 1;

    if (carriage) {
      mark();
    }
  }

  return _Reading(lines, out, breaks, origins);
}

/// A position in the tidied text, read back in the document it came from.
int _documentOffset(_Reading reading, int offset) {
  final List<int> breaks = reading.breaks;
  final List<int> origins = reading.origins;
  int low = 0;
  int high = breaks.length - 1;
  int found = -1;

  while (low <= high) {
    final int middle = (low + high) >> 1;

    if (breaks[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  final int base = found == -1 ? offset : origins[found] + (offset - breaks[found]);

  if (found + 1 >= origins.length) {
    return base;
  }

  // A tab became four characters, so several positions inside it answer to one
  // in the document. Holding them at the next known point keeps the answer
  // inside the tab rather than running past it into the text.
  final int next = origins[found + 1];

  return base < next ? base : next;
}

/// Everything a node holds, whatever kind of node it is.
List<MdNode> _childrenOf(MdNode node) {
  if (node is MdRoot) {
    return node.children;
  }
  if (node is MdHeading) {
    return node.children;
  }
  if (node is MdParagraph) {
    return node.children;
  }
  if (node is MdBlockquote) {
    return node.children;
  }
  if (node is MdList) {
    return node.children;
  }
  if (node is MdListItem) {
    return node.children;
  }
  if (node is MdTable) {
    return node.children;
  }
  if (node is MdTableRow) {
    return node.children;
  }
  if (node is MdTableCell) {
    return node.children;
  }
  if (node is MdDefinitionList) {
    return node.children;
  }
  if (node is MdDefinitionTerm) {
    return node.children;
  }
  if (node is MdDefinitionDescription) {
    return node.children;
  }
  if (node is MdFootnoteDefinition) {
    return node.children;
  }
  if (node is MdEmphasis) {
    return node.children;
  }
  if (node is MdStrong) {
    return node.children;
  }
  if (node is MdDelete) {
    return node.children;
  }
  if (node is MdLink) {
    return node.children;
  }
  if (node is MdContainerDirective) {
    return node.children;
  }
  if (node is MdLeafDirective) {
    return node.children;
  }
  if (node is MdTextDirective) {
    return node.children;
  }

  return const <MdNode>[];
}

/// Every range in the tree, moved back into the document's own offsets.
void _relocate(MdNode node, _Reading reading) {
  node.range = MdRange(
    _documentOffset(reading, node.range.start),
    _documentOffset(reading, node.range.end),
  );

  // A container directive is the one node with two runs of children under it,
  // its `[label]` beside its blocks, and a range that was not moved is a range
  // into a string nobody has any more.
  if (node is MdContainerDirective) {
    for (final MdNode child in node.label) {
      _relocate(child, reading);
    }
  }

  for (final MdNode child in _childrenOf(node)) {
    _relocate(child, reading);
  }
}

/* -------------------------------------------------------------------------
 * Headings and the outline
 * ---------------------------------------------------------------------- */

final RegExp _unslug = RegExp(r'[^\p{L}\p{N}\s_-]', unicode: true);
final RegExp _space = RegExp(r'\s');

/// A heading's anchor, in the spelling GitHub uses.
///
/// Matching GitHub matters more than any particular scheme would: the anchors
/// in a README are written by hand against it, so a document that links to
/// `#getting-started` is linking to whatever GitHub would have called that
/// heading. Letters and numbers in any script survive, everything else goes,
/// and spaces become hyphens.
String slugify(String text) {
  return text
      .trim()
      .toLowerCase()
      .replaceAll(_unslug, '')
      // Each space becomes a hyphen, rather than each *run* of them becoming
      // one. It looks like a bug and it is what GitHub does: `A & B` is `a--b`
      // there, because the ampersand went and the two spaces around it did not.
      .replaceAll(_space, '-');
}

/// Every heading in the tree, given a unique slug and listed for the outline.
void _collectOutline(List<MdBlock> blocks, Map<String, int> taken, List<MdOutlineEntry> into) {
  for (final MdBlock block in blocks) {
    if (block is MdHeading) {
      final String text = toPlainText(block.children);
      final String slugged = slugify(text);
      final String base = slugged.isEmpty ? 'section' : slugged;
      final int seen = taken[base] ?? 0;

      taken[base] = seen + 1;
      block.slug = seen == 0 ? base : '$base-$seen';
      into.add(
        MdOutlineEntry(depth: block.depth, slug: block.slug, text: text, range: block.range),
      );
      continue;
    }

    if (block is MdBlockquote) {
      _collectOutline(block.children, taken, into);
      continue;
    }

    if (block is MdList) {
      for (final MdListItem item in block.children) {
        _collectOutline(item.children, taken, into);
      }

      continue;
    }

    // A heading inside a directive is a heading. The package has no idea what
    // the directive means, but the outline is about the document rather than
    // about what draws it.
    if (block is MdContainerDirective) {
      _collectOutline(block.children, taken, into);
    }
  }
}

/// The footnotes something pointed at, in the order they were first pointed at.
///
/// Reference order rather than the order they were written in, because that is
/// the order they are numbered in and a reader meets `1` before `2`. A footnote
/// nobody referred to is left out entirely, the way a link reference definition
/// nobody used is: it is a note to the author rather than part of what the
/// document says.
void _collectFootnotes(
  List<MdNode> nodes,
  Map<String, MdFootnoteDefinition> defined,
  List<MdFootnoteDefinition> into,
  Map<String, int> taken,
) {
  for (final MdNode node in nodes) {
    if (node is MdFootnoteReference) {
      final MdFootnoteDefinition? footnote = defined[node.label];

      if (footnote == null) {
        continue;
      }

      final int mentions = taken[node.label] ?? 0;

      node.index = mentions;
      taken[node.label] = mentions + 1;

      if (mentions == 0) {
        final String slugged = slugify(node.label);
        final String base = slugged.isEmpty ? 'footnote' : slugged;
        final bool clash = into.any(
          (MdFootnoteDefinition each) => each.slug == base || each.slug.startsWith('$base-'),
        );

        footnote.number = into.length + 1;
        // Two labels can slug to the same word, and two anchors with the same
        // name is a link that lands on whichever came first.
        footnote.slug = clash ? '$base-${footnote.number}' : base;
        into.add(footnote);
        // The footnote's own text may point at another one, and that one is
        // numbered here rather than after whatever mentions it further down.
        _collectFootnotes(footnote.children, defined, into, taken);
      }

      continue;
    }

    if (node is MdContainerDirective) {
      _collectFootnotes(node.label, defined, into, taken);
    }

    _collectFootnotes(_childrenOf(node), defined, into, taken);
  }
}

/// Reads [source] as Markdown.
MdDocument parseMarkdown(String source, [MawyParseOptions options = const MawyParseOptions()]) {
  final Map<String, MdDefinition> definitions = <String, MdDefinition>{};
  final Map<String, MdFootnoteDefinition> footnotes = <String, MdFootnoteDefinition>{};
  final List<PendingInline> pending = <PendingInline>[];
  final _Reading reading = _read(source);

  final List<MdBlock> children = parseBlocks(
    reading.lines,
    BlockContext(
      gfm: options.gfm,
      definitionLists: options.definitionLists,
      definitions: definitions,
      footnotes: footnotes,
      pending: pending,
    ),
  );

  final Set<String> labels = footnotes.keys.toSet();
  final InlineOptions inline = InlineOptions(
    gfm: options.gfm,
    breaks: options.breaks,
    definitions: definitions,
    footnotes: labels,
  );

  for (final PendingInline each in pending) {
    each.target.addAll(parseInline(each.raw, inline));
  }

  final MdRoot root = MdRoot(MdRange(0, reading.length), children);
  final List<MdFootnoteDefinition> used = <MdFootnoteDefinition>[];

  _collectFootnotes(children, footnotes, used, <String, int>{});

  if (reading.breaks.isNotEmpty) {
    _relocate(root, reading);

    for (final MdFootnoteDefinition footnote in used) {
      _relocate(footnote, reading);
    }
  }

  final List<MdOutlineEntry> outline = <MdOutlineEntry>[];

  _collectOutline(children, <String, int>{}, outline);

  return MdDocument(root: root, outline: outline, footnotes: used);
}
