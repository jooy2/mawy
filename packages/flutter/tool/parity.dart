/// One half of the parity check: the Dart parser's trees, as JSON.
///
/// The React package's `scripts/parity.mjs` prints the same trees in the same
/// shape, and the two are diffed. That is the only thing that makes "one parser
/// shipped twice" a fact rather than an intention — two implementations of
/// CommonMark drift the moment nobody is comparing them, and a document that
/// means one thing in a browser and another in an app is the bug this whole
/// library exists to not have.
///
/// The corpus is `tool/corpus.json` — the awkward cases, written down — plus
/// every Markdown file in the repository, which are real documents somebody
/// wrote and a far better test than anything invented for one.
///
/// ```bash
/// cd packages/react && node scripts/parity.mjs > /tmp/react.json
/// cd ../flutter && dart run tool/parity.dart > /tmp/flutter.json
/// diff /tmp/react.json /tmp/flutter.json
/// ```
library;

import 'dart:convert';
import 'dart:io';

import 'package:mawy/src/code.dart';
import 'package:mawy/src/editor/commands.dart';
import 'package:mawy/src/editor/scroll.dart';
import 'package:mawy/src/editor/search.dart';
import 'package:mawy/src/editor/status.dart';
import 'package:mawy/src/highlight.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/find.dart';
import 'package:mawy/src/markdown/highlight.dart';
import 'package:mawy/src/markdown/parse.dart';

/// A directive's attributes with their keys in one order.
///
/// The React half sorts the keys of every object it prints, this one writes
/// them in the order the fields are read, and attributes are the one place a
/// document decides what the keys even are. Sorting here is what makes the two
/// halves comparable; the parsers themselves keep the order the document wrote.
Map<String, String> _sorted(Map<String, String> attributes) {
  final List<String> keys = attributes.keys.toList()..sort();

  return <String, String>{for (final String key in keys) key: attributes[key]!};
}

Object? clean(Object? node) {
  if (node is List) {
    return node.map(clean).toList();
  }

  if (node is MdNode) {
    final Map<String, Object?> out = <String, Object?>{};

    void put(String key, Object? value) => out[key] = value;

    if (node is MdHeading) {
      put('children', clean(node.children));
      put('depth', node.depth);
      put('r', <int>[node.range.start, node.range.end]);
      put('slug', node.slug);
      put('type', 'heading');
    } else if (node is MdParagraph) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'paragraph');
    } else if (node is MdCode) {
      put('content', <int>[node.content.start, node.content.end]);
      put('lang', node.lang);
      put('lines', node.lines);
      put('meta', node.meta);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'code');
      put('value', node.value);
    } else if (node is MdBlockquote) {
      put('alert', node.alert?.name);
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'blockquote');
    } else if (node is MdList) {
      put('children', clean(node.children));
      put('loose', node.loose);
      put('ordered', node.ordered);
      put('r', <int>[node.range.start, node.range.end]);
      put('start', node.start);
      put('type', 'list');
    } else if (node is MdListItem) {
      put('checked', node.checked);
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'listItem');
    } else if (node is MdTable) {
      put('align', node.align.map((MdAlign? a) => a?.name).toList());
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'table');
    } else if (node is MdTableRow) {
      put('children', clean(node.children));
      put('header', node.header);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'tableRow');
    } else if (node is MdTableCell) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'tableCell');
    } else if (node is MdDefinitionList) {
      put('children', clean(node.children));
      put('loose', node.loose);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'definitionList');
    } else if (node is MdDefinitionTerm) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'definitionTerm');
    } else if (node is MdDefinitionDescription) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'definitionDescription');
    } else if (node is MdFootnoteDefinition) {
      put('children', clean(node.children));
      put('label', node.label);
      put('number', node.number);
      put('r', <int>[node.range.start, node.range.end]);
      put('slug', node.slug);
      put('type', 'footnoteDefinition');
    } else if (node is MdThematicBreak) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'thematicBreak');
    } else if (node is MdContainerDirective) {
      put('attributes', _sorted(node.attributes));
      put('children', clean(node.children));
      put('label', clean(node.label));
      put('name', node.name);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'containerDirective');
    } else if (node is MdLeafDirective) {
      put('attributes', _sorted(node.attributes));
      put('children', clean(node.children));
      put('name', node.name);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'leafDirective');
    } else if (node is MdHtmlBlock) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'html');
      put('value', node.value);
    } else if (node is MdText) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'text');
      put('value', node.value);
    } else if (node is MdEmphasis) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'emphasis');
    } else if (node is MdStrong) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'strong');
    } else if (node is MdDelete) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'delete');
    } else if (node is MdInlineCode) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'inlineCode');
      put('value', node.value);
    } else if (node is MdLink) {
      put('children', clean(node.children));
      put('r', <int>[node.range.start, node.range.end]);
      put('title', node.title);
      put('type', 'link');
      put('url', node.url);
    } else if (node is MdImage) {
      put('alt', node.alt);
      put('r', <int>[node.range.start, node.range.end]);
      put('title', node.title);
      put('type', 'image');
      put('url', node.url);
    } else if (node is MdFootnoteReference) {
      put('index', node.index);
      put('label', node.label);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'footnoteReference');
    } else if (node is MdBreak) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'break');
    } else if (node is MdTextDirective) {
      put('attributes', _sorted(node.attributes));
      put('children', clean(node.children));
      put('name', node.name);
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'textDirective');
    } else if (node is MdInlineHtml) {
      put('r', <int>[node.range.start, node.range.end]);
      put('type', 'inlineHtml');
      put('value', node.value);
    }

    return out;
  }

  return node;
}

/// Every document the two parsers are compared over.
List<String> corpus() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final Directory root = tool.parent.parent.parent;
  final List<String> docs = <String>[
    ...(jsonDecode(File('${tool.path}/corpus.json').readAsStringSync()) as List<dynamic>)
        .cast<String>(),
  ];

  // Sorted, because the two halves of this check have to hand their parsers the
  // same documents in the same order — and a directory listing is in whatever
  // order the filesystem felt like, which is not the same order twice.
  void walk(Directory directory) {
    final List<FileSystemEntity> entries = directory.listSync()
      ..sort((FileSystemEntity a, FileSystemEntity b) => a.path.compareTo(b.path));

    for (final FileSystemEntity entry in entries) {
      final String name = entry.uri.pathSegments.where((String part) => part.isNotEmpty).last;

      if (entry is Directory) {
        if (const <String>{
          'node_modules',
          '.git',
          'docs-dist',
          'dist',
          '.dart_tool',
          'build',
        }.contains(name)) {
          continue;
        }

        walk(entry);
        continue;
      }

      if (entry is File && name.endsWith('.md')) {
        docs.add(entry.readAsStringSync());
      }
    }
  }

  walk(root);

  return docs;
}

void main() {
  final List<Object?> out = <Object?>[];

  for (final String source in corpus()) {
    final MdDocument d = parseMarkdown(source);

    out.add(<String, Object?>{
      'blocks': clean(d.root.children),
      'outline': d.outline
          .map(
            (MdOutlineEntry e) => <String, Object?>{
              'depth': e.depth,
              'r': <int>[e.range.start, e.range.end],
              'slug': e.slug,
              'text': e.text,
            },
          )
          .toList(),
      'footnotes': clean(d.footnotes),
    });
  }

  stdout.write(
    const JsonEncoder.withIndent(' ').convert(<String, Object?>{
      'trees': out,
      'highlights': _highlights(),
      'source': _source(),
      'edits': _edits(),
      'searches': _searches(),
      'counts': _counts(),
      'scrolls': _scrolls(),
      'found': _found(),
    }),
  );
}

/// And the source highlighter, which is a third thing written twice.
///
/// Over the same documents the parsers are compared on, because what it has to
/// get right is real Markdown rather than invented Markdown — and because it is
/// allowed to be *wrong* in ways the parser must not be, which makes "wrong the
/// same way in both" the only statement worth making about it.
List<Object?> _source() {
  return corpus()
      .map(
        (String document) => highlightMarkdown(document)
            .map(
              (MdHighlightedLine line) => <Object?>[
                line.text,
                line.tokens
                    .map((MdToken token) => <Object?>[token.start, token.end, token.kind.name])
                    .toList(),
              ],
            )
            .toList(),
      )
      .toList();
}

/// The highlighter's half of the same question.
///
/// `lib/src/highlight.dart` and the React package's `src/highlight.ts` are one
/// grammar written twice, the same way the parser is, and they drift for the
/// same reason — so they are diffed over `tool/code.json`, which is a piece of
/// every language either of them claims to know plus two that nobody does.
List<Object?> _highlights() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final File file = File('${tool.path}/code.json');
  final List<Object?> corpus = jsonDecode(file.readAsStringSync()) as List<Object?>;

  return corpus.map((Object? entry) {
    final List<Object?> pair = entry! as List<Object?>;
    final String language = pair[0]! as String;
    final String code = pair[1]! as String;

    return <String, Object?>{
      'language': language,
      'supported': mawyHighlighter.supports(language),
      'tokens': mawyHighlighter
          .highlight(code, language)
          .map(
            (MawyCodeToken token) => <String>[
              token.kind == null ? '' : token.kind!.name,
              token.text,
            ],
          )
          .toList(),
    };
  }).toList();
}

/// And the editing commands, which are a fourth thing written twice.
///
/// They are pure functions of a string and two offsets, which makes them the
/// easiest half of this to compare and the easiest to let drift: nothing about
/// them is visible until somebody presses a button, and then it is visible in
/// one package and not the other.
List<Object?> _edits() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final List<Object?> cases =
      jsonDecode(File('${tool.path}/edits.json').readAsStringSync()) as List<Object?>;

  return cases.map((Object? entry) {
    final List<Object?> triple = entry! as List<Object?>;
    final EditState state = EditState(triple[0]! as String, triple[1]! as int, triple[2]! as int);
    final Map<String, Object?> out = <String, Object?>{
      'state': <Object?>[state.value, state.start, state.end],
    };

    for (final MawyCommand command in MawyCommand.values) {
      final EditState after = runCommand(command, state);

      out[command.name] = <Object?>[
        after.value,
        after.start,
        after.end,
        commandActive(command, state),
      ];
    }

    final MawyCaretAt caret = caretAt(state.value, state.start, state.end);

    out['counts'] = <Object?>[
      countLines(state.value),
      countWords(state.value),
      countCharacters(state.value),
      countBytes(state.value),
      caret.line,
      caret.column,
      caret.selected,
    ];

    final EditState? carried = continueList(state);
    final EditState indented = indent(state, out: false);
    final EditState outdented = indent(state, out: true);

    out['continueList'] = carried == null
        ? null
        : <Object?>[carried.value, carried.start, carried.end];
    out['indent'] = <Object?>[indented.value, indented.start, indented.end];
    out['outdent'] = <Object?>[outdented.value, outdented.start, outdented.end];

    return out;
  }).toList();
}

/// And finding text, which is a fifth thing written twice.
///
/// The same shape of decision as the commands: what "replace all" does to
/// overlapping matches, which match "next" goes to from where the caret is, and
/// whether the two packages agree about what lowercase means. Nothing about any
/// of it is visible until somebody types in the find box.
List<Object?> _searches() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final List<Object?> cases =
      jsonDecode(File('${tool.path}/searches.json').readAsStringSync()) as List<Object?>;

  return cases.map((Object? entry) {
    final List<Object?> each = entry! as List<Object?>;
    final String value = each[0]! as String;
    final String query = each[1]! as String;
    final bool matchCase = each[2]! as bool;
    final int caret = each[3]! as int;
    final String replacement = each[4]! as String;

    final List<MawyMatch> matches = findMatches(value, query, matchCase);
    final MawyReplaced? replaced = matches.isEmpty
        ? null
        : replaceMatch(value, matches.first, replacement);
    final MawyReplacedAll all = replaceAll(value, query, replacement, matchCase);

    return <String, Object?>{
      'input': <Object?>[value, query, matchCase, caret, replacement],
      'matches': matches.map((MawyMatch match) => <int>[match.start, match.end]).toList(),
      'forwards': matchFrom(matches, caret, forwards: true),
      'backwards': matchFrom(matches, caret, forwards: false),
      'replaceFirst': replaced == null ? null : <Object?>[replaced.value, replaced.caret],
      'replaceAll': <Object?>[all.value, all.count],
    };
  }).toList();
}

/// And the status line, which is a sixth thing written twice.
///
/// Over documents rather than over edit states: `_edits` counts the short
/// strings the commands are exercised on, which is the wrong shape of text for
/// the one count that is hard. A word is not a run between two spaces in every
/// language, so [countWords] adds a spaced half to an unspaced one — and both
/// halves have to be in the corpus or only one of them is being compared. The
/// documentation is half of it Korean, which *is* spaced; `tool/corpus.json`
/// ends with a document of Han and kana, which is not, and it is there for
/// this. Before it was written, dropping the unspaced half changed nothing
/// either side printed.
List<Object?> _counts() {
  return corpus().map((String document) {
    final List<int> starts = lineStarts(document);
    // A line start rather than an offset picked out of the air: an offset that
    // lands between the two halves of an emoji is a different question, and it
    // is the parsers' to answer rather than the status line's.
    final MawyCaretAt caret = caretAt(document, starts[starts.length >> 1], starts.last);

    return <int>[
      countLines(document),
      countWords(document),
      countCharacters(document),
      countBytes(document),
      caret.line,
      caret.column,
      caret.selected,
    ];
  }).toList();
}

/// And lining the two panes of `split` up, which is a seventh.
///
/// The measuring is not shared and cannot be — a browser reads a bounding box
/// and this reads a viewport, and neither is a thing the other has — but the
/// arithmetic on what was measured is, and it is arithmetic nobody sees being
/// wrong: a preview half a screen away from what is being typed reads as a
/// pane that scrolls badly rather than as two packages disagreeing.
///
/// The lines are taken from the corpus, because which offset is on which line
/// is a question about real documents. The anchors are not: they are pixels
/// somebody measured, so `tool/scrolls.json` is measurements invented to be
/// awkward — two anchors on the same line of source, one anchor and nothing to
/// interpolate towards, a position above the first and below the last.
Map<String, Object?> _scrolls() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final List<Object?> cases =
      jsonDecode(File('${tool.path}/scrolls.json').readAsStringSync()) as List<Object?>;

  return <String, Object?>{
    'lines': corpus().map((String document) {
      final List<int> starts = lineStarts(document);
      final int length = document.length;

      return <Object?>[
        starts,
        <int>[
          0,
          1,
          length >> 2,
          length >> 1,
          length - 1,
          length,
          length + 99,
        ].map((int at) => lineAt(starts, at)).toList(),
      ];
    }).toList(),
    'preview': cases.map((Object? entry) {
      final List<Object?> pair = entry! as List<Object?>;
      final List<MawyScrollAnchor> anchors = (pair[0]! as List<Object?>).map((Object? point) {
        final List<Object?> both = point! as List<Object?>;

        return MawyScrollAnchor(
          from: (both[0]! as num).toDouble(),
          to: (both[1]! as num).toDouble(),
        );
      }).toList();

      // Written out to six places rather than as numbers. A pixel is a double
      // here and a `number` there, and `240` and `240.0` are the same position
      // and two different lines of JSON.
      return (pair[1]! as List<Object?>)
          .map(
            (Object? at) => previewScrollFor(anchors, (at! as num).toDouble()).toStringAsFixed(6),
          )
          .toList();
    }).toList(),
  };
}

/// And finding text in a *drawn* document, which is an eighth.
///
/// The trees are compared above and the find bar's arithmetic is compared in
/// `_searches`; what is left between the two is which of a document's nodes
/// draw prose a reader can search — an alert's children yes, a code block no,
/// an image's alt text no. Two traversals that disagree about that report
/// different numbers of matches for the same page, and that number is the one
/// part of a find bar a reader can check.
///
/// The matches are printed in the order the traversal found them, which is the
/// order both halves put them into the map. `inBlock` is not printed: it is
/// which block to scroll to, the React package has no equivalent because a
/// mark there is an element with a position of its own, and `total` is counted
/// from it on this side and from a counter on that one — so the totals lining
/// up is already the statement it would make.
List<Object?> _found() {
  final Directory tool = File(Platform.script.toFilePath()).parent;
  final List<Object?> queries =
      jsonDecode(File('${tool.path}/finds.json').readAsStringSync()) as List<Object?>;

  return corpus().map((String document) {
    final List<MdBlock> blocks = parseMarkdown(document).root.children;

    return queries.map((Object? entry) {
      final List<Object?> pair = entry! as List<Object?>;
      final MawyFound found = findInDocument(blocks, pair[0]! as String, pair[1]! as bool);

      return <Object?>[
        found.total,
        found.at.values
            .map(
              (List<MawyDocumentMatch> matches) => matches
                  .map((MawyDocumentMatch match) => <int>[match.start, match.end, match.index])
                  .toList(),
            )
            .toList(),
      ];
    }).toList();
  }).toList();
}
