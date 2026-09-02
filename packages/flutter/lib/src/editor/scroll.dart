/// Keeping the two panes of `split` on the same part of the document.
///
/// This is `src/internal/scroll.ts` in Dart, and the reasoning is that file's:
/// scrolling one pane by the same fraction as the other is the obvious answer
/// and it is wrong in a way that is easy to feel. A fenced code block is twenty
/// lines of source and twenty lines of page, a paragraph of prose is one long
/// line of source and six of page, and an image is a line of source and half a
/// screen of page. The fraction through the file is not the fraction down the
/// page, and the further apart those two get the further the preview is from
/// whatever is being typed.
///
/// So the panes are lined up at the places they can agree on instead. Every
/// block the renderer draws says which characters of the source it came from,
/// and every line of the source has a position in the field — pair those up and
/// there is a list of positions that mean the same thing in both panes, with a
/// straight line between each pair and the next.
///
/// Everything here is arithmetic on numbers somebody else measured, which is
/// what makes it the same code in both packages. The measuring is not: a
/// browser reads a bounding box and this reads a viewport, and neither of those
/// is a thing the other has.
library;

/// A place both panes agree on, in each one's own pixels.
class MawyScrollAnchor {
  /// Creates a pair.
  const MawyScrollAnchor({required this.from, required this.to});

  /// Where it is in the source pane.
  final double from;

  /// Where it is in the preview.
  final double to;
}

/// Where each line of a document begins.
List<int> lineStarts(String text) {
  final List<int> starts = <int>[0];

  for (int at = text.indexOf('\n'); at != -1; at = text.indexOf('\n', at + 1)) {
    starts.add(at + 1);
  }

  return starts;
}

/// Which of those lines an offset is on.
int lineAt(List<int> starts, int offset) {
  int low = 0;
  int high = starts.length - 1;
  int found = 0;

  while (low <= high) {
    final int middle = (low + high) >> 1;

    if (starts[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/// Where the preview belongs, for a source scrolled to [at].
double previewScrollFor(List<MawyScrollAnchor> anchors, double at) {
  int low = 0;
  int high = anchors.length - 1;
  int found = 0;

  while (low <= high) {
    final int middle = (low + high) >> 1;

    if (anchors[middle].from <= at) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  final MawyScrollAnchor start = anchors[found];
  final MawyScrollAnchor? next = found + 1 < anchors.length ? anchors[found + 1] : null;

  if (next == null) {
    return start.to;
  }

  final double span = next.from - start.from;

  return span > 0 ? start.to + ((at - start.from) / span) * (next.to - start.to) : start.to;
}
