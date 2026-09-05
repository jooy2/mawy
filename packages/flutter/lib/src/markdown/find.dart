/// Finding a run of text in a *drawn* document, as opposed to in its source.
///
/// The editor's find bar searches the Markdown, because the Markdown is what is
/// on the screen there. A viewer's cannot: `**bold**` draws four characters and
/// six were written, and a reader looking for `bold` is looking for what they
/// can see. So what is searched here is the text the document draws — the
/// characters inside every run of prose and every code span — and the markup
/// that decided how they are drawn is not part of it.
///
/// The answer is keyed by the node that draws each run rather than by a
/// position in the whole document, which is what keeps the renderer honest: it
/// looks up the node it is about to draw and marks what it is told, and there
/// is no second traversal that has to agree with the first about where anything
/// is.
///
/// One consequence, and it is the same one the browser's own find has in
/// reverse: a match cannot straddle two runs. `he` and `llo` in `he**llo**` are
/// two runs, and `hello` is not found across them. Splitting a phrase across a
/// bold is rare enough, and a search that quietly reported a match it could not
/// point at would be worse than one that says there is none.
///
/// The React package says all of this in `internal/markdown/find.ts`, in the
/// same shape, and `tool/parity.dart` diffs the two over every document in the
/// corpus. Which nodes draw prose a reader can search is the whole of this
/// file, and two traversals that disagree about it report different numbers of
/// matches for the same page — which is the one part of a find bar a reader can
/// check.
library;

import 'package:mawy/src/editor/search.dart';
import 'package:mawy/src/markdown/ast.dart';

/// A match, and which number it is in the document.
class MawyDocumentMatch {
  /// Creates a numbered match.
  const MawyDocumentMatch(this.start, this.end, this.index);

  /// Where it begins in the run that draws it.
  final int start;

  /// Where it ends.
  final int end;

  /// Which one it is, counting from zero, in reading order.
  final int index;
}

/// What a query found, ready for the renderer to draw.
class MawyFound {
  /// Creates an answer.
  MawyFound(this.at, this.inBlock);

  /// Nothing found, for a document nobody is searching.
  MawyFound.nothing()
    : at = Map<MdInline, List<MawyDocumentMatch>>.identity(),
      inBlock = const <int>[];

  /// Which matches are in the run a given node draws.
  final Map<MdInline, List<MawyDocumentMatch>> at;

  /// Which top-level block each match is in, by the match's own number.
  ///
  /// The React package has no equivalent and does not need one: a mark there is
  /// an element, and scrolling to a match is scrolling to it. A span is not a
  /// widget and has no position of its own, so what a Flutter viewer can bring
  /// into view is the block the match is in.
  final List<int> inBlock;

  /// How many there are, all told.
  int get total => inBlock.length;
}

/// Every match in what [blocks] draw, numbered in reading order.
MawyFound findInDocument(List<MdBlock> blocks, String query, bool matchCase) {
  if (query.isEmpty) {
    return MawyFound.nothing();
  }

  final Map<MdInline, List<MawyDocumentMatch>> at =
      Map<MdInline, List<MawyDocumentMatch>>.identity();
  final List<int> inBlock = <int>[];
  int seen = 0;

  // One block at a time, so that what came out of each of them is known: a
  // match is numbered in reading order either way, and this is the only place
  // that can say which block a number fell in.
  for (int index = 0; index < blocks.length; index += 1) {
    final int before = seen;

    seen = _searchBlocks(<MdBlock>[blocks[index]], query, matchCase, at, seen);

    for (int match = before; match < seen; match += 1) {
      inBlock.add(index);
    }
  }

  return MawyFound(at, inBlock);
}

/// Searches [blocks], and answers how many matches there are once it is done.
int _searchBlocks(
  List<MdBlock> blocks,
  String query,
  bool matchCase,
  Map<MdInline, List<MawyDocumentMatch>> into,
  int seen,
) {
  for (final MdBlock block in blocks) {
    if (block is MdHeading) {
      seen = _searchInline(block.children, query, matchCase, into, seen);
    } else if (block is MdParagraph) {
      seen = _searchInline(block.children, query, matchCase, into, seen);
    } else if (block is MdBlockquote) {
      seen = _searchBlocks(block.children, query, matchCase, into, seen);
    } else if (block is MdContainerDirective) {
      seen = _searchBlocks(block.children, query, matchCase, into, seen);
    } else if (block is MdLeafDirective) {
      seen = _searchInline(block.children, query, matchCase, into, seen);
    } else if (block is MdList) {
      for (final MdListItem item in block.children) {
        seen = _searchBlocks(item.children, query, matchCase, into, seen);
      }
    } else if (block is MdTable) {
      for (final MdTableRow row in block.children) {
        for (final MdTableCell cell in row.children) {
          seen = _searchInline(cell.children, query, matchCase, into, seen);
        }
      }
    } else if (block is MdDefinitionList) {
      for (final MdNode entry in block.children) {
        if (entry is MdDefinitionTerm) {
          seen = _searchInline(entry.children, query, matchCase, into, seen);
        } else if (entry is MdDefinitionDescription) {
          seen = _searchBlocks(entry.children, query, matchCase, into, seen);
        }
      }
    }

    // A code block is left out on purpose: it is drawn by the highlighter as
    // its own spans, and cutting a mark into those would mean cutting every one
    // of them. The rest — a raw HTML block, a rule, a footnote written out at
    // the end of the page — draws nothing this can point at either.
  }

  return seen;
}

int _searchInline(
  List<MdInline> nodes,
  String query,
  bool matchCase,
  Map<MdInline, List<MawyDocumentMatch>> into,
  int seen,
) {
  for (final MdInline node in nodes) {
    final String? value = node is MdText
        ? node.value
        : node is MdInlineCode
        ? node.value
        : null;

    if (value != null) {
      final List<MawyMatch> matches = findMatches(value, query, matchCase);

      if (matches.isNotEmpty) {
        into[node] = <MawyDocumentMatch>[
          for (int at = 0; at < matches.length; at += 1)
            MawyDocumentMatch(matches[at].start, matches[at].end, seen + at),
        ];
        seen += matches.length;
      }

      continue;
    }

    // An image's alt text, a footnote's number, a piece of raw inline HTML:
    // none of them is prose the reader is reading.
    if (node is MdEmphasis) {
      seen = _searchInline(node.children, query, matchCase, into, seen);
    } else if (node is MdStrong) {
      seen = _searchInline(node.children, query, matchCase, into, seen);
    } else if (node is MdDelete) {
      seen = _searchInline(node.children, query, matchCase, into, seen);
    } else if (node is MdLink) {
      seen = _searchInline(node.children, query, matchCase, into, seen);
    } else if (node is MdTextDirective) {
      seen = _searchInline(node.children, query, matchCase, into, seen);
    }
  }

  return seen;
}
