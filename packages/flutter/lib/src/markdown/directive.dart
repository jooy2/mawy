/// The head of a directive: its name, its label and its attributes.
///
/// All three forms — `:::container`, `::leaf` and `:text` — are written the same
/// way after the colons, so they are read the same way here and the three
/// callers differ only in what they do with what comes back. Which is also what
/// keeps them from drifting: there is one answer to "is `{kind=warning}` well
/// formed", not three.
///
/// Nothing in here knows what a directive means. It reads a shape and hands it
/// over; see [MdContainerDirective] for why that is the whole point.
///
/// This is the React package's `internal/markdown/directive.ts`, line for line
/// wherever Dart lets it be.
library;

final RegExp _nameStart = RegExp(r'[A-Za-z]');
final RegExp _nameRest = RegExp(r'[A-Za-z0-9_-]');
final RegExp _keyStart = RegExp(r'[A-Za-z_]');
final RegExp _keyRest = RegExp(r'[A-Za-z0-9_.:-]');

/// Where a value with no quotes around it stops.
final RegExp _bareEnd = RegExp(r'''[\s"'`=<>{}]''');
final RegExp _separator = RegExp(r'[ \t]');

/// Where a `[label]`'s content sits, not counting the brackets.
class DirectiveLabel {
  /// Creates a span for a label's content.
  const DirectiveLabel(this.start, this.end);

  /// Where the first character of the content sits.
  final int start;

  /// Where the last one ends.
  final int end;
}

/// A directive's name, its label and its attributes, and where it stops.
class DirectiveHead {
  /// Creates a head.
  const DirectiveHead({
    required this.name,
    required this.label,
    required this.attributes,
    required this.end,
  });

  /// The name the document wrote after the colons.
  final String name;

  /// `null` when the document wrote no label, which is not the same as an empty
  /// one: `:a[]` said a label and meant nothing to be in it.
  final DirectiveLabel? label;

  /// `{key=value}`, in the order they were written. Empty when there was none.
  final Map<String, String> attributes;

  /// Just past the last character of the head.
  final int end;
}

String? _characterAt(String source, int at) => at >= 0 && at < source.length ? source[at] : null;

/// The `[label]` at [at], if there is a closed one.
///
/// Brackets nest and a backslash escapes one, so `[a [b] c]` is one label and
/// `[a \] b]` is another. An unclosed `[` is not a label at all and is left
/// where it is — for a block directive that leaves trailing text on the line,
/// which means the line was never a directive; for a text one it means the
/// bracket is a bracket.
DirectiveLabel? _readLabel(String source, int at) {
  if (_characterAt(source, at) != '[') {
    return null;
  }

  int depth = 0;
  int index = at;

  while (index < source.length) {
    final String character = source[index];

    if (character == r'\') {
      index += 2;
      continue;
    }

    if (character == '\n') {
      return null;
    }

    if (character == '[') {
      depth += 1;
    } else if (character == ']') {
      depth -= 1;

      if (depth == 0) {
        return DirectiveLabel(at + 1, index);
      }
    }

    index += 1;
  }

  return null;
}

class _Value {
  const _Value(this.value, this.end);

  final String value;
  final int end;
}

/// A value, quoted or not. `null` when there is nothing readable at [at].
_Value? _readValue(String source, int at) {
  final String? quote = _characterAt(source, at);

  if (quote == '"' || quote == "'") {
    final StringBuffer value = StringBuffer();
    int index = at + 1;

    while (index < source.length) {
      final String character = source[index];

      if (character == r'\') {
        // A backslash takes the next character literally, which is the only way
        // to write the quote that is holding the value open.
        final String? next = _characterAt(source, index + 1);

        if (next == null || next == '\n') {
          return null;
        }

        value.write(next);
        index += 2;
        continue;
      }

      if (character == '\n') {
        return null;
      }

      if (character == quote) {
        return _Value(value.toString(), index + 1);
      }

      value.write(character);
      index += 1;
    }

    return null;
  }

  int index = at;

  while (index < source.length && !_bareEnd.hasMatch(source[index])) {
    index += 1;
  }

  return index == at ? null : _Value(source.substring(at, index), index);
}

class _Attributes {
  const _Attributes(this.attributes, this.end);

  final Map<String, String> attributes;
  final int end;
}

/// The `{…}` at [at].
///
/// `null` for anything that is not a well-formed set of attributes, and the
/// caller treats that as "not a directive" rather than as "a directive with no
/// attributes" — `::a{` is a line somebody wrote, not a video with a brace
/// after it.
_Attributes? _readAttributes(String source, int at) {
  if (_characterAt(source, at) != '{') {
    return null;
  }

  final Map<String, String> attributes = <String, String>{};
  int index = at + 1;

  void put(String key, String value) {
    // Classes are the one thing that accumulates: `.a .b` is two of them, the
    // way it is everywhere else this syntax is written. Everything else is the
    // last one written, keeping the place the first one had.
    final String? held = attributes['class'];

    attributes[key] = key == 'class' && held != null && held.isNotEmpty ? '$held $value' : value;
  }

  while (index < source.length) {
    while (_separator.hasMatch(_characterAt(source, index) ?? '')) {
      index += 1;
    }

    if (_characterAt(source, index) == '}') {
      return _Attributes(attributes, index + 1);
    }

    final String? here = _characterAt(source, index);
    final String? shorthand = here == '#'
        ? 'id'
        : here == '.'
        ? 'class'
        : null;

    if (shorthand != null) {
      final _Value? value = _readValue(source, index + 1);

      if (value == null) {
        return null;
      }

      put(shorthand, value.value);
      index = value.end;
      continue;
    }

    if (!_keyStart.hasMatch(here ?? '')) {
      return null;
    }

    int end = index + 1;

    while (end < source.length && _keyRest.hasMatch(source[end])) {
      end += 1;
    }

    final String key = source.substring(index, end);

    if (_characterAt(source, end) != '=') {
      // A name on its own is a name with nothing after it, which is what
      // `{open}` says and what an application reads as a flag.
      put(key, '');
      index = end;
      continue;
    }

    final _Value? value = _readValue(source, end + 1);

    if (value == null) {
      return null;
    }

    put(key, value.value);
    index = value.end;
  }

  return null;
}

/// A directive's head, starting at the first character of its name.
///
/// [at] is just past the colons; `null` means there is no name there, which is
/// every `:` in every sentence that was only ever a colon.
DirectiveHead? readDirectiveHead(String source, int at) {
  if (!_nameStart.hasMatch(_characterAt(source, at) ?? '')) {
    return null;
  }

  int end = at + 1;

  while (end < source.length && _nameRest.hasMatch(source[end])) {
    end += 1;
  }

  final String name = source.substring(at, end);
  final DirectiveLabel? label = _readLabel(source, end);

  if (label != null) {
    end = label.end + 1;
  }

  final _Attributes? attributes = _readAttributes(source, end);

  if (attributes != null) {
    end = attributes.end;
  }

  return DirectiveHead(
    name: name,
    label: label,
    attributes: attributes?.attributes ?? <String, String>{},
    end: end,
  );
}
