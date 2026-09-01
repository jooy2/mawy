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

  const carried = continueList(state);
  const indented = indent(state, false);
  const outdented = indent(state, true);

  out.continueList = carried && [carried.value, carried.start, carried.end];
  out.indent = [indented.value, indented.start, indented.end];
  out.outdent = [outdented.value, outdented.start, outdented.end];

  return out;
});

process.stdout.write(JSON.stringify({ trees, highlights, source, edits }, null, 1));
