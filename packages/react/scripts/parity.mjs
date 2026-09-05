/**
 * One half of the parity check: this parser's trees, as JSON.
 *
 * The Flutter package's `tool/parity.dart` prints the same trees in the same
 * shape, and the two are diffed. That is the only thing that makes "one parser
 * shipped twice" a fact rather than an intention — two implementations of
 * CommonMark drift the moment nobody is comparing them, and a document that
 * means one thing in a browser and another in an app is the bug this whole
 * library exists to not have.
 *
 * The corpus is `packages/flutter/tool/corpus.json` — the awkward cases,
 * written down — plus every Markdown file in the repository, which are real
 * documents somebody wrote and a far better test than anything invented for
 * one. It lives beside the Dart half because one list read by both is the whole
 * point; two would be two corpora that agree until they do not.
 *
 * The highlighter is diffed alongside it, over `tool/code.json`, for exactly
 * the same reason: it is also one grammar written twice.
 *
 *     cd packages/react && node scripts/parity.mjs > /tmp/react.json
 *     cd ../flutter && dart run tool/parity.dart > /tmp/flutter.json
 *     diff /tmp/react.json /tmp/flutter.json
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../src/internal/markdown/parse.ts';
import { mawyHighlighter } from '../src/highlight.ts';
import { highlightMarkdown } from '../src/internal/markdown/highlight.ts';
import { commandActive, continueList, indent, runCommand } from '../src/internal/commands.ts';
import { findMatches, matchFrom, replaceAll, replaceMatch } from '../src/internal/search.ts';
import {
  caretAt,
  countBytes,
  countCharacters,
  countLines,
  countWords
} from '../src/internal/status.ts';
import { lineAt, lineStarts, previewScrollFor } from '../src/internal/scroll.ts';
import { findInDocument } from '../src/internal/markdown/find.ts';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, '../../..');

const SKIP = new Set(['node_modules', '.git', 'docs-dist', 'dist', '.dart_tool', 'build']);

/**
 * Every Markdown file under a directory, by path.
 *
 * Sorted, because the two halves of this check have to hand their parsers the
 * same documents in the same order — and a directory listing is in whatever
 * order the filesystem felt like, which is not the same order twice.
 */
function markdownUnder(directory, into) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  )) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) {
        markdownUnder(join(directory, entry.name), into);
      }

      continue;
    }

    if (entry.name.endsWith('.md')) {
      into.push(readFileSync(join(directory, entry.name), 'utf8'));
    }
  }

  return into;
}

function corpus() {
  const written = JSON.parse(
    readFileSync(resolve(rootDir, 'packages/flutter/tool/corpus.json'), 'utf8')
  );

  return markdownUnder(rootDir, written);
}

/** A node with its keys in one order and its ranges as pairs, so a diff lines up. */
function clean(node) {
  if (Array.isArray(node)) {
    return node.map(clean);
  }

  if (node && typeof node === 'object') {
    const out = {};

    for (const key of Object.keys(node).sort()) {
      if (key === 'range') {
        out.r = [node.range.start, node.range.end];
        continue;
      }

      if (key === 'content') {
        out.content = [node.content.start, node.content.end];
        continue;
      }

      out[key] = clean(node[key]);
    }

    return out;
  }

  return node;
}

const trees = corpus().map((source) => {
  const document = parseMarkdown(source);

  return {
    blocks: clean(document.root.children),
    outline: clean(document.outline),
    footnotes: clean(document.footnotes)
  };
});

/**
 * The highlighter's half of the same question.
 *
 * `src/highlight.ts` and `lib/src/highlight.dart` are one grammar written
 * twice, the same way the parser is, and they drift for the same reason — so
 * they are diffed over `packages/flutter/tool/code.json`, which is a piece of
 * every language either of them claims to know plus two that nobody does.
 */
const highlights = JSON.parse(
  readFileSync(resolve(rootDir, 'packages/flutter/tool/code.json'), 'utf8')
).map(([language, code]) => ({
  language,
  supported: mawyHighlighter.supports(language),
  tokens: mawyHighlighter.highlight(code, language).map((token) => [token.kind ?? '', token.text])
}));

/**
 * And the source highlighter, which is a third thing written twice.
 *
 * Over the same documents the parsers are compared on, because what it has to
 * get right is real Markdown rather than invented Markdown — and because it is
 * allowed to be *wrong* in ways the parser must not be, which makes "wrong the
 * same way in both" the only statement worth making about it.
 */
const source = corpus().map((document) =>
  highlightMarkdown(document).map((line) => [
    line.text,
    line.tokens.map((token) => [token.start, token.end, token.kind])
  ])
);

/** Every command, over every case, and the two things that are not commands. */
const COMMANDS = [
  'bold',
  'italic',
  'strikethrough',
  'code',
  'link',
  'image',
  'heading1',
  'heading2',
  'heading3',
  'paragraph',
  'quote',
  'bulletList',
  'orderedList',
  'taskList',
  'codeBlock',
  'rule'
];

/**
 * And the editing commands, which are a fourth thing written twice.
 *
 * They are pure functions of a string and two offsets, which makes them the
 * easiest half of this to compare and the easiest to let drift: nothing about
 * them is visible until somebody presses a button, and then it is visible in
 * one package and not the other.
 */
const edits = JSON.parse(
  readFileSync(resolve(rootDir, 'packages/flutter/tool/edits.json'), 'utf8')
).map(([value, start, end]) => {
  const state = { value, start, end };
  const out = { state: [value, start, end] };

  for (const command of COMMANDS) {
    const after = runCommand(command, state);

    out[command] = [after.value, after.start, after.end, commandActive(command, state)];
  }

  out.counts = [
    countLines(value),
    countWords(value),
    countCharacters(value),
    countBytes(value),
    ...(({ line, column, selected }) => [line, column, selected])(caretAt(value, start, end))
  ];

  const carried = continueList(state);
  const indented = indent(state, false);
  const outdented = indent(state, true);

  out.continueList = carried && [carried.value, carried.start, carried.end];
  out.indent = [indented.value, indented.start, indented.end];
  out.outdent = [outdented.value, outdented.start, outdented.end];

  return out;
});

/**
 * And finding text, which is a fifth thing written twice.
 *
 * The same shape of decision as the commands: what "replace all" does to
 * overlapping matches, which match "next" goes to from where the caret is, and
 * whether the two packages agree about what lowercase means. Nothing about any
 * of it is visible until somebody types in the find box.
 */
const searches = JSON.parse(
  readFileSync(resolve(rootDir, 'packages/flutter/tool/searches.json'), 'utf8')
).map(([value, query, matchCase, caret, replacement]) => {
  const matches = findMatches(value, query, matchCase);
  const first = matches[0];
  const replaced = first ? replaceMatch(value, first, replacement) : null;
  const all = replaceAll(value, query, replacement, matchCase);

  return {
    input: [value, query, matchCase, caret, replacement],
    matches: matches.map((match) => [match.start, match.end]),
    forwards: matchFrom(matches, caret, true),
    backwards: matchFrom(matches, caret, false),
    replaceFirst: replaced && [replaced.value, replaced.caret],
    replaceAll: [all.value, all.count]
  };
});

/**
 * And the status line, which is a sixth thing written twice.
 *
 * Over documents rather than over edit states: `edits` counts the short strings
 * the commands are exercised on, which is the wrong shape of text for the one
 * count that is hard. A word is not a run between two spaces in every language,
 * so `countWords` adds a spaced half to an unspaced one — and both halves have
 * to be in the corpus or only one of them is being compared. The documentation
 * is half of it Korean, which *is* spaced; `packages/flutter/tool/corpus.json`
 * ends with a document of Han and kana, which is not, and it is there for this.
 * Before it was written, dropping the unspaced half changed nothing either side
 * printed.
 */
const counts = corpus().map((document) => {
  const starts = lineStarts(document);
  // A line start rather than an offset picked out of the air: an offset that
  // lands between the two halves of an emoji is a different question, and it is
  // the parsers' to answer rather than the status line's.
  const caret = caretAt(document, starts[starts.length >> 1], starts[starts.length - 1]);

  return [
    countLines(document),
    countWords(document),
    countCharacters(document),
    countBytes(document),
    caret.line,
    caret.column,
    caret.selected
  ];
});

/**
 * And lining the two panes of `split` up, which is a seventh.
 *
 * The measuring is not shared and cannot be — a browser reads a bounding box
 * and Flutter reads a viewport, and neither is a thing the other has — but the
 * arithmetic on what was measured is, and it is arithmetic nobody sees being
 * wrong: a preview half a screen away from what is being typed reads as a pane
 * that scrolls badly rather than as two packages disagreeing.
 *
 * The lines are taken from the corpus, because which offset is on which line is
 * a question about real documents. The anchors are not: they are pixels
 * somebody measured, so `packages/flutter/tool/scrolls.json` is measurements
 * invented to be awkward — two anchors on the same line of source, one anchor
 * and nothing to interpolate towards, a position above the first and below the
 * last.
 */
const scrolls = {
  lines: corpus().map((document) => {
    const starts = lineStarts(document);
    const length = document.length;

    return [
      starts,
      [0, 1, length >> 2, length >> 1, length - 1, length, length + 99].map((at) =>
        lineAt(starts, at)
      )
    ];
  }),
  // Written out to six places rather than as numbers. A pixel is a `number`
  // here and a double there, and `240` and `240.0` are the same position and
  // two different lines of JSON.
  preview: JSON.parse(
    readFileSync(resolve(rootDir, 'packages/flutter/tool/scrolls.json'), 'utf8')
  ).map(([anchors, positions]) =>
    positions.map((at) =>
      previewScrollFor(
        anchors.map(([from, to]) => ({ from, to })),
        at
      ).toFixed(6)
    )
  )
};

/**
 * And finding text in a *drawn* document, which is an eighth.
 *
 * The trees are compared above and the find bar's arithmetic is compared in
 * `searches`; what is left between the two is which of a document's nodes draw
 * prose a reader can search — an alert's children yes, a code block no, an
 * image's alt text no. Two traversals that disagree about that report different
 * numbers of matches for the same page, and that number is the one part of a
 * find bar a reader can check.
 *
 * The matches are printed in the order the traversal found them, which is the
 * order both halves put them into the map.
 */
const finds = JSON.parse(
  readFileSync(resolve(rootDir, 'packages/flutter/tool/finds.json'), 'utf8')
);

const found = corpus().map((document) => {
  const blocks = parseMarkdown(document).root.children;

  return finds.map(([query, matchCase]) => {
    const answer = findInDocument(blocks, query, matchCase);

    return [
      answer.total,
      [...answer.at.values()].map((matches) =>
        matches.map((match) => [match.start, match.end, match.index])
      )
    ];
  });
});

process.stdout.write(
  JSON.stringify({ trees, highlights, source, edits, searches, counts, scrolls, found }, null, 1)
);
