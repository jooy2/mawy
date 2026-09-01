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
import 'package:mawy/src/highlight.dart';
import 'package:mawy/src/markdown/ast.dart';
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
    const JsonEncoder.withIndent(
      ' ',
    ).convert(<String, Object?>{'trees': out, 'highlights': _highlights()}),
  );
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
