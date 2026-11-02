/// The same document, read once.
///
/// The editor asks about the document from all over: which toolbar buttons are
/// lit, whether the caret is in a table or a fence, what the key just pressed
/// should do. Every one of those questions starts from the text, and each used
/// to read all of it, which came to five parses for a key and four for a caret
/// that moved, of a text that had not changed since the last one.
///
/// So the last few readings are kept. Four, because a key is the text before it
/// and the text after it, and each of those may be asked for with the options an
/// application gave and with none. A tree that comes out of here is shared with
/// everything else that asked, so nothing may change one, which is why this is
/// not what [parseMarkdown] does: that one is exported, and a tree handed to an
/// application is the application's.
///
/// What it costs is the kept trees staying in memory after the editor is gone,
/// until something else is read.
library;

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/parse.dart';

const int _kept = 4;

class _Reading {
  const _Reading(this.source, this.options, this.document);

  final String source;
  final MawyParseOptions options;
  final MdDocument document;
}

/// The readings kept, the latest first.
final List<_Reading> _readings = <_Reading>[];

/// [parseMarkdown], for a caller that will only read what comes back.
MdDocument documentOf(String source, [MawyParseOptions options = const MawyParseOptions()]) {
  final int at = _readings.indexWhere(
    (_Reading entry) => entry.options == options && entry.source == source,
  );

  if (at != -1) {
    final _Reading entry = _readings.removeAt(at);

    _readings.insert(0, entry);

    return entry.document;
  }

  final MdDocument document = parseMarkdown(source, options);

  _readings.insert(0, _Reading(source, options, document));

  if (_readings.length > _kept) {
    _readings.removeLast();
  }

  return document;
}
