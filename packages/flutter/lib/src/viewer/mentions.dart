/// Where a footnote was first mentioned, as a block.
///
/// The arrow at the end of a note goes back to the sentence that pointed at it,
/// and in a browser that is a link to the element the mention is. A mention
/// here is a span, and a span has no place of its own — so what a viewer can
/// bring into view is the block the mention is in, which is the same answer
/// `find.dart` arrives at for a match and for the same reason.
///
/// Only the first mention counts. A footnote pointed at three times is read
/// from the first of them, which is what the parser numbers them by and what
/// the React package's arrow points at.
library;

import 'package:mawy/src/markdown/ast.dart';

/// Which top-level block of [blocks] holds the first mention of [label], or
/// `null` where nothing mentions it.
int? blockMentioning(List<MdBlock> blocks, String label) {
  for (int index = 0; index < blocks.length; index += 1) {
    if (_mentionedIn(<MdBlock>[blocks[index]], label)) {
      return index;
    }
  }

  return null;
}

/// Whether any of [blocks] holds a mention of [label], at any depth.
bool _mentionedIn(List<MdBlock> blocks, String label) {
  for (final MdBlock block in blocks) {
    final bool found = switch (block) {
      MdHeading() => _mentionedInline(block.children, label),
      MdParagraph() => _mentionedInline(block.children, label),
      MdLeafDirective() => _mentionedInline(block.children, label),
      MdBlockquote() => _mentionedIn(block.children, label),
      MdContainerDirective() => _mentionedIn(block.children, label),
      MdList() => block.children.any((MdListItem item) => _mentionedIn(item.children, label)),
      MdTable() => block.children.any(
        (MdTableRow row) =>
            row.children.any((MdTableCell cell) => _mentionedInline(cell.children, label)),
      ),
      MdDefinitionList() => block.children.any(
        (MdNode entry) => switch (entry) {
          MdDefinitionTerm() => _mentionedInline(entry.children, label),
          MdDefinitionDescription() => _mentionedIn(entry.children, label),
          _ => false,
        },
      ),
      // A code block, a rule, a raw HTML block: nothing in any of them is a
      // mention, and the notes themselves are not part of the block flow.
      _ => false,
    };

    if (found) {
      return true;
    }
  }

  return false;
}

/// Whether any of [nodes] is a mention of [label], at any depth.
bool _mentionedInline(List<MdInline> nodes, String label) {
  for (final MdInline node in nodes) {
    final bool found = switch (node) {
      MdFootnoteReference() => node.label == label,
      MdEmphasis() => _mentionedInline(node.children, label),
      MdStrong() => _mentionedInline(node.children, label),
      MdDelete() => _mentionedInline(node.children, label),
      MdLink() => _mentionedInline(node.children, label),
      MdTextDirective() => _mentionedInline(node.children, label),
      _ => false,
    };

    if (found) {
      return true;
    }
  }

  return false;
}
