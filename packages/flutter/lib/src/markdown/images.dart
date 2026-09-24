/// The pictures a document points at.
///
/// An application that stores the pictures it writes into a document is left
/// holding files a document stopped pointing at, and the editor does not say
/// when that happens, because a picture leaving the document is not a file
/// being given up: an undo puts it back, a cut picture is pasted somewhere
/// else, and the same address copied into a second document is the same file
/// in two places. What can be said for certain is which pictures one document
/// points at, and that is what this answers, so the files nothing points at are
/// found by comparing it with what was stored, across every saved document, at
/// the application's own moment for it.
///
/// Generous on purpose. A file kept that nothing needs costs its bytes, and one
/// given up that something still points at is a picture missing from a page.
/// So an `<img>` in raw HTML is read, although this package draws none of it and
/// the React package draws it only under some of its policies, and one inside
/// an HTML comment is read too.
///
/// The React package says all of this in `internal/markdown/images.ts`, in the
/// same shape, and `tool/parity.dart` diffs the two over every document in the
/// corpus.
library;

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/entities.dart';

/// An `<img>` with every attribute it was written with, by the same rule for an
/// attribute the inline parser holds a tag to. Its name in any case, and
/// `<image>` as well, which a browser reads as the same element.
final RegExp _img = RegExp(
  r'''<im(?:g|age)(?=[\s/>])((?:\s+[A-Za-z_:][A-Za-z\d_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*/?>''',
  caseSensitive: false,
);

/// One attribute of those, and its value in whichever of the three ways it was
/// quoted.
final RegExp _attribute = RegExp(
  r'''\s+([A-Za-z_:][A-Za-z\d_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?''',
);

/// The `src` of every `<img>` in a piece of raw HTML.
///
/// The first `src` on a tag is the one a browser keeps, and its references are
/// read the way a Markdown destination's are. Where HTML would also read a
/// reference with no semicolon, the address is listed as it was written.
void _sourcesIn(String html, Set<String> into) {
  for (final RegExpMatch tag in _img.allMatches(html)) {
    for (final RegExpMatch attribute in _attribute.allMatches(tag.group(1)!)) {
      if (attribute.group(1)!.toLowerCase() != 'src') {
        continue;
      }

      final String url = decodeEntities(
        attribute.group(2) ?? attribute.group(3) ?? attribute.group(4) ?? '',
      );

      if (url.isNotEmpty) {
        into.add(url);
      }

      break;
    }
  }
}

/// What a node holds, in the order it holds it.
///
/// A container's label is a run of inlines beside its blocks rather than one of
/// them, and a picture can be written there as well as anywhere.
List<MdNode> _childrenOf(MdNode node) {
  if (node is MdHeading) {
    return node.children;
  } else if (node is MdParagraph) {
    return node.children;
  } else if (node is MdBlockquote) {
    return node.children;
  } else if (node is MdList) {
    return node.children;
  } else if (node is MdListItem) {
    return node.children;
  } else if (node is MdTable) {
    return node.children;
  } else if (node is MdTableRow) {
    return node.children;
  } else if (node is MdTableCell) {
    return node.children;
  } else if (node is MdDefinitionList) {
    return node.children;
  } else if (node is MdDefinitionTerm) {
    return node.children;
  } else if (node is MdDefinitionDescription) {
    return node.children;
  } else if (node is MdFootnoteDefinition) {
    return node.children;
  } else if (node is MdContainerDirective) {
    return <MdNode>[...node.label, ...node.children];
  } else if (node is MdLeafDirective) {
    return node.children;
  } else if (node is MdTextDirective) {
    return node.children;
  } else if (node is MdEmphasis) {
    return node.children;
  } else if (node is MdStrong) {
    return node.children;
  } else if (node is MdDelete) {
    return node.children;
  } else if (node is MdLink) {
    return node.children;
  }

  return const <MdNode>[];
}

void _collect(List<MdNode> nodes, Set<String> into) {
  for (final MdNode node in nodes) {
    if (node is MdImage) {
      if (node.url.isNotEmpty) {
        into.add(node.url);
      }
    } else if (node is MdHtmlBlock) {
      _sourcesIn(node.value, into);
    } else if (node is MdInlineHtml) {
      _sourcesIn(node.value, into);
    } else {
      _collect(_childrenOf(node), into);
    }
  }
}

/// Every address [document] draws a picture from, each once, in the order the
/// document first gives it.
///
/// The address as it is written, with its escapes and references read, and
/// before `resolveUrl`: which is the URL the application wrote into the
/// document, since the parser reads it back out unchanged. A picture in a
/// footnote nothing refers to is not drawn and is not listed, and neither is a
/// `srcset`.
///
/// ```dart
/// final Set<String> kept = imageUrls(parseMarkdown(saved)).toSet();
/// final List<String> unused = uploaded.where((String url) => !kept.contains(url)).toList();
/// ```
List<String> imageUrls(MdDocument document) {
  final Set<String> found = <String>{};

  _collect(document.root.children, found);
  _collect(document.footnotes, found);

  return found.toList();
}
