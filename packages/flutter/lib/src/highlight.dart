/// Mawy's own syntax highlighter, for the languages a document usually shows.
///
/// It is the React package's `highlight.ts`, function for function and rule for
/// rule, so a code block coloured in a browser is coloured the same way in an
/// app. `tool/parity.dart` diffs the two over a corpus of code the way it does
/// for the parser, which is what keeps that a fact rather than an intention.
///
/// It is **approximate**, deliberately and permanently. A correct parser for a
/// dozen languages is not a thing to keep beside a Markdown viewer, and colour
/// is not the kind of answer that has to be right: a template literal with a
/// brace in it, a regular expression that reads as division, a `<` in prose
/// inside an HTML block — each of them comes out slightly wrong and none of them
/// matters. What it will not do is change the code. The renderer checks that the
/// tokens join back into exactly what they were given and draws the block plain
/// if they do not, so being wrong here is a colour that is off rather than a
/// document that says something else.
///
/// For anything more than that, [MawyHighlighter] is a small interface and any
/// grammar behind it is a few lines. This is here so that the common case needs
/// neither.
///
/// Unlike the React package, this is not a separate entry point. It does not
/// need to be: a Dart build drops what nothing references, so an application
/// that never names [mawyHighlighter] never carries the tables below.
library;

import 'package:mawy/src/code.dart';

/* -------------------------------------------------------------------------
 * The machine
 * ---------------------------------------------------------------------- */

/// What a rule says a run of characters is.
///
/// A function rather than a name, because the name sometimes depends on the
/// word: `open` is a function where it is followed by a bracket, a type where it
/// starts with a capital, and nothing in particular otherwise, and that is one
/// rule rather than three.
typedef _Kind = MawyCodeTokenKind? Function(String text, String code, int end);

class _Rule {
  /// A run that is one thing wherever it is found.
  const _Rule(this.match, this.kind) : resolve = null;

  /// A run whose name depends on what is around it.
  const _Rule.named(this.match, this.resolve) : kind = null;

  /// Matched with [RegExp.matchAsPrefix], so it can only match where it is
  /// asked to — which is what the React half writes as a sticky flag.
  final RegExp match;

  /// What it is, where that does not depend on anything.
  final MawyCodeTokenKind? kind;

  /// What it is, where it does.
  final _Kind? resolve;

  MawyCodeTokenKind? nameFor(String text, String code, int end) =>
      resolve == null ? kind : resolve!(text, code, end);
}

/// How much code is worth colouring.
///
/// Every rule is tried at every position a rule did not match, so the work is
/// the length of the block times the size of its grammar. A minified bundle
/// pasted into a document is not something to spend a frame on, and plain text
/// is a perfectly good drawing of it.
const int _limit = 100000;

List<MawyCodeToken> _tokenize(String code, List<_Rule> rules) {
  final List<MawyCodeToken> out = <MawyCodeToken>[];
  final StringBuffer plain = StringBuffer();
  int at = 0;

  void flush() {
    if (plain.isNotEmpty) {
      out.add(MawyCodeToken(plain.toString()));
      plain.clear();
    }
  }

  while (at < code.length) {
    int taken = 0;
    MawyCodeTokenKind? kind;

    for (final _Rule rule in rules) {
      final Match? found = rule.match.matchAsPrefix(code, at);

      if (found != null && found.end > found.start) {
        taken = found.end - found.start;
        kind = rule.nameFor(code.substring(at, at + taken), code, at + taken);
        break;
      }
    }

    if (taken == 0) {
      plain.write(code[at]);
      at += 1;
      continue;
    }

    if (kind != null) {
      flush();
      out.add(MawyCodeToken(code.substring(at, at + taken), kind));
    } else {
      // Matched, but it is nothing in particular — it joins the plain run
      // rather than becoming a span that says nothing.
      plain.write(code.substring(at, at + taken));
    }

    at += taken;
  }

  flush();

  return out;
}

/* -------------------------------------------------------------------------
 * Pieces every grammar is made of
 * ---------------------------------------------------------------------- */

Set<String> _words(String list) => list.split(' ').toSet();

_Rule _lineComment(String open) =>
    _Rule(RegExp('${RegExp.escape(open)}[^\n]*'), MawyCodeTokenKind.comment);

final _Rule _blockComment = _Rule(RegExp(r'/\*[\s\S]*?(?:\*/|$)'), MawyCodeTokenKind.comment);
final _Rule _doubleQuoted = _Rule(RegExp(r'"(?:\\[\s\S]|[^"\\\n])*"?'), MawyCodeTokenKind.string);
final _Rule _singleQuoted = _Rule(RegExp(r"'(?:\\[\s\S]|[^'\\\n])*'?"), MawyCodeTokenKind.string);
final _Rule _backticked = _Rule(RegExp(r'`(?:\\[\s\S]|[^`\\])*`?'), MawyCodeTokenKind.string);
final _Rule _number = _Rule(
  RegExp(
    r'(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*)?\.\d[\d_]*|\d[\d_]*)'
    r'(?:[eE][+-]?\d+)?[a-zA-Z_]*',
  ),
  MawyCodeTokenKind.number,
);
final _Rule _operator = _Rule(RegExp(r'[+\-*/%=<>!&|^~?:]+'), MawyCodeTokenKind.operator);
final _Rule _punctuation = _Rule(RegExp(r'[{}\[\]();,.]'), MawyCodeTokenKind.punctuation);

final RegExp _callAhead = RegExp(r'^[ \t]*[(<]');
final RegExp _capitalised = RegExp('^[A-Z]');

/// An identifier, named by what it turns out to be where it stands.
_Rule _identifier(Set<String> keywords, Set<String> constants, [Set<String>? types]) =>
    _Rule.named(RegExp(r'[A-Za-z_$][\w$]*'), (String text, String code, int end) {
      if (types != null && types.contains(text)) {
        return MawyCodeTokenKind.type;
      }

      if (keywords.contains(text)) {
        return MawyCodeTokenKind.keyword;
      }

      if (constants.contains(text)) {
        return MawyCodeTokenKind.constant;
      }

      // A name with a bracket after it is being called, whatever it is.
      if (_callAhead.hasMatch(_ahead(code, end, 8))) {
        return MawyCodeTokenKind.function;
      }

      return _capitalised.hasMatch(text) ? MawyCodeTokenKind.type : null;
    });

/// The next few characters, however few are left.
String _ahead(String code, int from, int count) =>
    code.substring(from, from + count > code.length ? code.length : from + count);

/// The shape almost every language with braces in it shares.
List<_Rule> _clike({
  required String keywords,
  String constants = 'true false null',
  String? types,
  String comment = '//',
  bool backticks = false,
  bool blockComments = true,
}) {
  return <_Rule>[
    if (blockComments) _blockComment,
    _lineComment(comment),
    _doubleQuoted,
    _singleQuoted,
    if (backticks) _backticked,
    _number,
    _identifier(_words(keywords), _words(constants), types == null ? null : _words(types)),
    _operator,
    _punctuation,
  ];
}

/* -------------------------------------------------------------------------
 * The languages
 * ---------------------------------------------------------------------- */

const String _jsKeywords =
    'as async await break case catch class const continue debugger default delete do else export '
    'extends finally for from function get if import in instanceof let new of return set static '
    'switch throw try typeof var void while with yield';

const String _tsKeywords =
    '$_jsKeywords abstract asserts declare enum implements infer interface is keyof namespace '
    'override private protected public readonly satisfies type unique';

/// The names TypeScript writes a type with, which are not keywords to a reader.
const String _tsTypes =
    'any bigint boolean never number object string symbol undefined unknown void';

const String _jsConstants =
    'true false null undefined NaN Infinity this super globalThis arguments';

final List<_Rule> _javascript = _clike(
  keywords: _jsKeywords,
  constants: _jsConstants,
  backticks: true,
);

final List<_Rule> _typescript = _clike(
  keywords: _tsKeywords,
  constants: _jsConstants,
  types: _tsTypes,
  backticks: true,
);

final RegExp _colonAhead = RegExp(r'^\s*:');

final List<_Rule> _json = <_Rule>[
  // A string with a colon after it is a name rather than a value, which is the
  // only structure JSON has to show.
  _Rule.named(
    RegExp(r'"(?:\\[\s\S]|[^"\\\n])*"'),
    (String text, String code, int end) => _colonAhead.hasMatch(_ahead(code, end, 8))
        ? MawyCodeTokenKind.attribute
        : MawyCodeTokenKind.string,
  ),
  _lineComment('//'),
  _blockComment,
  _number,
  _Rule(RegExp(r'\b(?:true|false|null)\b'), MawyCodeTokenKind.constant),
  _punctuation,
  _Rule(RegExp(':'), MawyCodeTokenKind.operator),
];

final List<_Rule> _markup = <_Rule>[
  _Rule(RegExp(r'<!--[\s\S]*?(?:-->|$)'), MawyCodeTokenKind.comment),
  _Rule(RegExp(r'<!\w[^>]*>?'), MawyCodeTokenKind.keyword),
  _Rule(RegExp(r'</?[A-Za-z][\w:.-]*'), MawyCodeTokenKind.tag),
  _Rule(RegExp(r'/?>'), MawyCodeTokenKind.punctuation),
  _Rule(RegExp(r'[A-Za-z_:][\w:.-]*(?=[ \t]*=)'), MawyCodeTokenKind.attribute),
  _doubleQuoted,
  _singleQuoted,
  _Rule(RegExp(r'&#?\w+;'), MawyCodeTokenKind.constant),
  _Rule(RegExp('='), MawyCodeTokenKind.operator),
];

final List<_Rule> _css = <_Rule>[
  _blockComment,
  _Rule(RegExp(r'@[\w-]+'), MawyCodeTokenKind.keyword),
  _Rule(RegExp(r'#[\da-fA-F]{3,8}\b'), MawyCodeTokenKind.number),
  _doubleQuoted,
  _singleQuoted,
  _Rule(RegExp(r'[-\w]+(?=[ \t]*:)'), MawyCodeTokenKind.attribute),
  _Rule(RegExp(r'--[\w-]+'), MawyCodeTokenKind.variable),
  _Rule(RegExp(r'[.#][-\w]+|::?[-\w]+'), MawyCodeTokenKind.type),
  _Rule(RegExp(r'-?(?:\d*\.)?\d+[\w%]*'), MawyCodeTokenKind.number),
  _Rule(RegExp(r'[A-Za-z-]+(?=\()'), MawyCodeTokenKind.function),
  _punctuation,
  _Rule(RegExp(r'[>+~*=]'), MawyCodeTokenKind.operator),
];

final Set<String> _shellWords = _words(
  'if then else elif fi for while until do done case esac function return in select time '
  'break continue local export declare readonly source alias set unset trap exit',
);

final List<_Rule> _shell = <_Rule>[
  _lineComment('#'),
  _doubleQuoted,
  _singleQuoted,
  _Rule(RegExp(r'\$\{[^}]*\}?|\$[\w@?#*!$-]+'), MawyCodeTokenKind.variable),
  _Rule.named(
    RegExp(r'[A-Za-z_][\w-]*'),
    (String text, String code, int end) =>
        _shellWords.contains(text) ? MawyCodeTokenKind.keyword : null,
  ),
  _number,
  _Rule(RegExp(r'[|&;<>]+'), MawyCodeTokenKind.operator),
  _punctuation,
];

final List<_Rule> _python = <_Rule>[
  _lineComment('#'),
  _Rule(
    RegExp(r'''[rbfu]{0,2}"""[\s\S]*?(?:"""|$)|[rbfu]{0,2}\'\'\'[\s\S]*?(?:\'\'\'|$)'''),
    MawyCodeTokenKind.string,
  ),
  _Rule(RegExp(r'[rbfu]{0,2}"(?:\\[\s\S]|[^"\\\n])*"?'), MawyCodeTokenKind.string),
  _Rule(RegExp(r"[rbfu]{0,2}'(?:\\[\s\S]|[^'\\\n])*'?"), MawyCodeTokenKind.string),
  _Rule(RegExp(r'@[\w.]+'), MawyCodeTokenKind.attribute),
  _number,
  _identifier(
    _words(
      'and as assert async await break class continue def del elif else except finally for from '
      'global if import in is lambda match nonlocal not or pass raise return try while with yield',
    ),
    _words('True False None self cls'),
  ),
  _operator,
  _punctuation,
];

final List<_Rule> _yaml = <_Rule>[
  _lineComment('#'),
  _Rule(
    RegExp(r'''^[ \t]*(?:-[ \t]+)?[\w."'-]+(?=[ \t]*:)''', multiLine: true),
    MawyCodeTokenKind.attribute,
  ),
  _Rule(RegExp(r'^[ \t]*-(?=[ \t]|$)', multiLine: true), MawyCodeTokenKind.punctuation),
  _Rule(RegExp(r'[&*][\w-]+'), MawyCodeTokenKind.variable),
  _doubleQuoted,
  _singleQuoted,
  _Rule(RegExp(r'\b(?:true|false|null|yes|no|on|off|~)\b'), MawyCodeTokenKind.constant),
  _number,
  _Rule(RegExp(r'[|>:]'), MawyCodeTokenKind.operator),
];

final Set<String> _sqlWords = _words(
  'add all alter and as asc between by case cast column constraint create cross database '
  'default delete desc distinct drop else end exists from full group having if in index '
  'inner insert intersect into is join key left like limit not null offset on or order '
  'outer primary references replace right select set table then top truncate union unique '
  'update using values view when where with',
);

final RegExp _parenAhead = RegExp(r'^[ \t]*\(');

final List<_Rule> _sql = <_Rule>[
  _lineComment('--'),
  _blockComment,
  _singleQuoted,
  _doubleQuoted,
  _Rule.named(RegExp(r'[A-Za-z_][\w$]*'), (String text, String code, int end) {
    if (_sqlWords.contains(text.toLowerCase())) {
      return MawyCodeTokenKind.keyword;
    }

    return _parenAhead.hasMatch(_ahead(code, end, 4)) ? MawyCodeTokenKind.function : null;
  }),
  _number,
  _operator,
  _punctuation,
];

/// Dart, which this repository is half written in.
///
/// `_clike` would very nearly do, and the two things it would miss are the two
/// a Dart file has on nearly every page: a string written across three quotes,
/// and an annotation. `void`, `dynamic` and the four number-ish names are types
/// rather than keywords, the way TypeScript's are — and every other type is
/// caught by the capital letter, which Dart's own style guide asks for.
final List<_Rule> _dart = <_Rule>[
  _blockComment,
  _lineComment('//'),
  _Rule(
    RegExp('r?"""[\\s\\S]*?(?:"""|\$)|r?\'\'\'[\\s\\S]*?(?:\'\'\'|\$)'),
    MawyCodeTokenKind.string,
  ),
  _Rule(RegExp(r'r?"(?:\\[\s\S]|[^"\\\n])*"?'), MawyCodeTokenKind.string),
  _Rule(RegExp(r"r?'(?:\\[\s\S]|[^'\\\n])*'?"), MawyCodeTokenKind.string),
  _Rule(RegExp(r'@[\w.]+'), MawyCodeTokenKind.attribute),
  _number,
  _identifier(
    _words(
      'abstract as assert async await base break case catch class const continue covariant '
      'default deferred do else enum export extends extension external factory final finally '
      'for get hide if implements import in interface is late library mixin new on operator '
      'part required rethrow return sealed set show static switch sync this throw try typedef '
      'var when while with yield',
    ),
    _words('true false null this super'),
    _words('bool double int num dynamic void Never'),
  ),
  _operator,
  _punctuation,
];

final List<_Rule> _go = _clike(
  keywords:
      'break case chan const continue default defer else fallthrough for func go goto if import '
      'interface map package range return select struct switch type var',
  constants: 'true false nil iota',
);

final List<_Rule> _rust = _clike(
  keywords:
      'as async await break const continue crate dyn else enum extern fn for if impl in let loop '
      'match mod move mut pub ref return self static struct super trait type union unsafe use '
      'where while',
  constants: 'true false None Some Ok Err self Self',
);

final List<_Rule> _java = _clike(
  keywords:
      'abstract assert break case catch class const continue default do else enum extends final '
      'finally for goto if implements import instanceof interface native new package private '
      'protected public return static strictfp super switch synchronized this throw throws '
      'transient try var void volatile while',
  constants: 'true false null this super',
);

final List<_Rule> _c = _clike(
  keywords:
      'auto break case catch class const constexpr continue default delete do double else enum '
      'explicit extern float for friend goto if inline int long namespace new operator private '
      'protected public register return short signed sizeof static struct switch template this '
      'throw try typedef typename union unsigned using virtual void volatile while',
  constants: 'true false NULL nullptr this',
);

/// Every language, and the names a fence is likely to call it.
///
/// Aliases rather than a guess: `sh` and `bash` are the same grammar here and
/// `js` is not `json`, and the only way to be sure of that is a list.
final Map<String, List<_Rule>> _languages = <String, List<_Rule>>{
  'javascript': _javascript,
  'js': _javascript,
  'jsx': _javascript,
  'mjs': _javascript,
  'cjs': _javascript,
  'node': _javascript,
  'typescript': _typescript,
  'ts': _typescript,
  'tsx': _typescript,
  'mts': _typescript,
  'cts': _typescript,
  'json': _json,
  'jsonc': _json,
  'json5': _json,
  'html': _markup,
  'htm': _markup,
  'xml': _markup,
  'svg': _markup,
  'vue': _markup,
  'svelte': _markup,
  'css': _css,
  'scss': _css,
  'less': _css,
  'dart': _dart,
  'bash': _shell,
  'sh': _shell,
  'shell': _shell,
  'zsh': _shell,
  'console': _shell,
  'shellsession': _shell,
  'python': _python,
  'py': _python,
  'yaml': _yaml,
  'yml': _yaml,
  'sql': _sql,
  'go': _go,
  'golang': _go,
  'rust': _rust,
  'rs': _rust,
  'java': _java,
  'kotlin': _java,
  'c': _c,
  'cpp': _c,
  'c++': _c,
  'cc': _c,
  'h': _c,
  'hpp': _c,
  'cs': _java,
  'csharp': _java,
};

/// The names this highlighter answers to, for a documentation page to list.
List<String> get kMawyHighlightLanguages => _languages.keys.toList()..sort();

class _MawyHighlighter extends MawyHighlighter {
  const _MawyHighlighter();

  @override
  bool supports(String language) => _languages.containsKey(language.toLowerCase());

  @override
  List<MawyCodeToken> highlight(String code, String language) {
    final List<_Rule>? rules = _languages[language.toLowerCase()];

    return rules != null && code.length <= _limit
        ? _tokenize(code, rules)
        : <MawyCodeToken>[MawyCodeToken(code)];
  }
}

/// The highlighter itself.
///
/// ```dart
/// MawyViewer(value: document, highlight: mawyHighlighter)
/// ```
const MawyHighlighter mawyHighlighter = _MawyHighlighter();
