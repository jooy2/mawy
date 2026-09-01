/**
 * The CommonMark specification's own examples, and enough of an HTML writer to
 * compare against them.
 *
 * This library never produces a string of HTML — that is the whole safety
 * story, and it is not going to grow a serialiser to be measured. So the writer
 * is here, in the tests, and it exists for one purpose: to turn the parsed tree
 * into the shape the specification writes its expectations in, so that
 * "CommonMark" in the README is a number somebody can check rather than a word.
 *
 * It follows `cmark`'s own renderer closely enough to be compared byte for
 * byte — including where a newline goes, which `cr()` below is the whole of.
 * Anything it gets wrong is a failure of this file rather than of the parser,
 * so the deviations the test records are read with that in mind.
 */
import { parseMarkdown } from '../../src/internal/markdown/parse.js';
import type { MdBlock, MdInline, MdList, MdListItem } from '../../src/internal/markdown/ast.js';

/** One example out of the specification: what goes in, and what should come out. */
export interface SpecExample {
  markdown: string;
  html: string;
  /** The heading it was written under, which is how a failure is grouped. */
  section: string;
  /** Its number in the document, counting from one. */
  number: number;
}

/**
 * The examples, read out of `spec.txt`.
 *
 * The specification is a Markdown document, and its examples are fenced blocks
 * of thirty-two backticks with a `.` between the source and the expectation.
 * Reading them out of it is four lines of regular expression, which is a great
 * deal less than depending on a package that reads the file with `fs` — these
 * tests run in a browser, where there is no such thing.
 *
 * A tab inside an example is written `→`, because a specification is read by
 * people and a tab is invisible. That is the one substitution to undo.
 */
export function specExamples(text: string): SpecExample[] {
  const examples: SpecExample[] = [];
  const tests = text.replace(/\r\n?/g, '\n').replace(/^<!-- END TESTS -->[\s\S]*/m, '');
  const pattern = /^`{32} example\n([\s\S]*?)^\.\n([\s\S]*?)^`{32}$|^#{1,6} *(.*)$/gm;

  let section = '';
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tests)) !== null) {
    const [, markdown, html, heading] = match;

    if (heading !== undefined) {
      section = heading;
      continue;
    }

    examples.push({
      markdown: markdown.replaceAll('→', '\t'),
      html: html.replaceAll('→', '\t'),
      section,
      number: examples.length + 1
    });
  }

  return examples;
}

const ESCAPED: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};

const escapeText = (value: string): string => value.replace(/[&<>"]/g, (char) => ESCAPED[char]);

/**
 * A destination, escaped the way `cmark` escapes one.
 *
 * Everything that is not safe in a URL becomes its UTF-8 bytes in percent
 * notation, and the two characters that would end the attribute early are
 * written as references instead. `%` is safe, so a destination that was already
 * encoded is left as it is rather than encoded twice.
 */
function escapeHref(url: string): string {
  const SAFE = /[A-Za-z0-9\-_.+!*(),%#@?=;:/$~]/;
  let out = '';

  for (const char of url) {
    if (char === '&') {
      out += '&amp;';
    } else if (char === "'") {
      out += '&#x27;';
    } else if (SAFE.test(char)) {
      out += char;
    } else {
      for (const byte of new TextEncoder().encode(char)) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }

  return out;
}

/**
 * The buffer `cmark` writes into, and the one thing about it worth copying.
 *
 * `cr()` is a newline only if the last one written was not — which is what
 * decides, everywhere in the reference renderer, whether a block starts on a
 * line of its own. A tight list item's paragraph is not a block, so `<li>` is
 * followed by its text; anything else is, so `<li>` is followed by a newline.
 */
class Out {
  private buffer = '';

  lit(value: string): void {
    this.buffer += value;
  }

  cr(): void {
    if (this.buffer !== '' && !this.buffer.endsWith('\n')) {
      this.buffer += '\n';
    }
  }

  toString(): string {
    return this.buffer;
  }
}

/** The document as HTML, in the shape the specification writes its answers in. */
export function writeHtml(source: string): string {
  const document = parseMarkdown(source, { gfm: false, definitionLists: false });
  const out = new Out();

  writeBlocks(out, document.root.children, source, false);

  return out.toString();
}

function writeBlocks(out: Out, nodes: MdBlock[], source: string, tight: boolean): void {
  for (const node of nodes) {
    writeBlock(out, node, source, tight);
  }
}

function writeBlock(out: Out, node: MdBlock, source: string, tight: boolean): void {
  switch (node.type) {
    case 'paragraph':
      if (tight) {
        writeInlines(out, node.children, source);
        break;
      }

      out.cr();
      out.lit('<p>');
      writeInlines(out, node.children, source);
      out.lit('</p>\n');
      break;

    case 'heading':
      out.cr();
      out.lit(`<h${node.depth}>`);
      writeInlines(out, node.children, source);
      out.lit(`</h${node.depth}>\n`);
      break;

    case 'code': {
      // The info string's first word, and only that: `class="language-ts"` out
      // of ```` ```ts twoslash ````.
      const info = node.lang === null ? '' : ` class="language-${escapeText(node.lang)}"`;
      // The parser holds the code as its lines joined by newlines, without the
      // one that ended the last of them, and the specification writes that one.
      // It used to be written only where the value did not already end in a
      // newline, which was this file compensating for a blank line the reader
      // invented at the end of a document — and which quietly cost a real blank
      // line at the end of a code block.
      const value = node.value === '' ? node.value : `${node.value}\n`;

      out.cr();
      out.lit(`<pre><code${info}>${escapeText(value)}</code></pre>\n`);
      break;
    }

    case 'html':
      out.cr();
      out.lit(node.value);
      out.cr();
      break;

    case 'thematicBreak':
      out.cr();
      out.lit('<hr />\n');
      break;

    case 'blockquote':
      out.cr();
      out.lit('<blockquote>\n');
      writeBlocks(out, node.children, source, false);
      out.cr();
      out.lit('</blockquote>\n');
      break;

    case 'list':
      writeList(out, node, source);
      break;

    // Nothing below this line is CommonMark, and every one of them is here
    // because the parser reads more than CommonMark does. A construct the
    // specification has never heard of is written as the characters it was
    // written with, which is what the specification would have made of them.
    default:
      out.cr();
      out.lit(escapeText(source.slice(node.range.start, node.range.end)));
      out.cr();
      break;
  }
}

function writeList(out: Out, node: MdList, source: string): void {
  const tag = node.ordered ? 'ol' : 'ul';
  const start = node.ordered && node.start !== 1 ? ` start="${node.start}"` : '';

  out.cr();
  out.lit(`<${tag}${start}>\n`);

  for (const item of node.children) {
    writeItem(out, item, source, !node.loose);
  }

  out.cr();
  out.lit(`</${tag}>\n`);
}

function writeItem(out: Out, node: MdListItem, source: string, tight: boolean): void {
  out.cr();
  out.lit('<li>');
  writeBlocks(out, node.children, source, tight);
  out.lit('</li>\n');
}

function writeInlines(out: Out, nodes: MdInline[], source: string): void {
  for (const node of nodes) {
    writeInline(out, node, source);
  }
}

function writeInline(out: Out, node: MdInline, source: string): void {
  switch (node.type) {
    case 'text':
      out.lit(escapeText(node.value));
      break;

    case 'break':
      out.lit('<br />\n');
      break;

    case 'inlineCode':
      out.lit(`<code>${escapeText(node.value)}</code>`);
      break;

    case 'inlineHtml':
      out.lit(node.value);
      break;

    case 'emphasis':
      out.lit('<em>');
      writeInlines(out, node.children, source);
      out.lit('</em>');
      break;

    case 'strong':
      out.lit('<strong>');
      writeInlines(out, node.children, source);
      out.lit('</strong>');
      break;

    case 'link': {
      const title = node.title === null ? '' : ` title="${escapeText(node.title)}"`;

      out.lit(`<a href="${escapeHref(node.url)}"${title}>`);
      writeInlines(out, node.children, source);
      out.lit('</a>');
      break;
    }

    case 'image': {
      const title = node.title === null ? '' : ` title="${escapeText(node.title)}"`;

      out.lit(`<img src="${escapeHref(node.url)}" alt="${escapeText(node.alt)}"${title} />`);
      break;
    }

    default:
      out.lit(escapeText(source.slice(node.range.start, node.range.end)));
      break;
  }
}
