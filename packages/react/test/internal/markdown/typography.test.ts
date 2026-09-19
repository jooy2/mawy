import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import type { MdBlock, MdInline } from '../../../src/internal/markdown/ast.js';
import type { MawyQuotes } from '../../../src/types.js';

/**
 * The typographer, and the linkifier widened past the addresses GFM reads.
 *
 * Both are off by default and both rewrite prose, so what these check is not
 * only that each does its job but that neither does it when it was not asked
 * to. The expectations are markdown-it's, because that is the reader the
 * convention comes from and a document written against it has to come out of
 * this one the same way — `..` becoming an ellipsis and `????` collapsing to
 * three look like too much until a document written elsewhere arrives.
 */

/** What a document says, with the markup flattened and a link's target shown. */
function said(node: MdInline | MdBlock): string {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'inlineCode':
    case 'code':
      return `\`${node.value}\``;
    case 'inlineHtml':
    case 'html':
      return node.value;
    case 'image':
      return `![${node.alt}]`;
    case 'break':
      return '\n';
    case 'link':
      return `<${node.url}|${node.children.map(said).join('')}>`;
    default:
      return 'children' in node ? (node.children as MdInline[]).map(said).join('') : '';
  }
}

const read = (source: string, options = {}): string =>
  parseMarkdown(source, options).root.children.map(said).join(' | ');

const typeset = (source: string): string => read(source, { typographer: true });

describe('the typographer', () => {
  it('is off unless it is asked for', () => {
    expect(read('"a" -- b (c)...')).toBe('"a" -- b (c)...');
  });

  it('draws the marks a keyboard has no key for', () => {
    expect(typeset('(c) (C) (tm) (TM) (r) (R) (p)')).toBe('© © ™ ™ ® ® (p)');
    expect(typeset('a(c)b')).toBe('a©b');
    expect(typeset('a+-b')).toBe('a±b');
  });

  it('makes an ellipsis, and puts one back after a question mark', () => {
    expect(typeset('..')).toBe('…');
    expect(typeset('a...b')).toBe('a…b');
    expect(typeset('....')).toBe('…');
    expect(typeset('?...')).toBe('?..');
    expect(typeset('!...')).toBe('!..');
  });

  it('collapses a run of four or more of one mark, and no fewer', () => {
    expect(typeset('???')).toBe('???');
    expect(typeset('????')).toBe('???');
    expect(typeset('?????')).toBe('???');
    expect(typeset('!!!!!')).toBe('!!!');
    expect(typeset(',,,')).toBe(',');
    // Mixed marks are a run of neither, so nothing is touched.
    expect(typeset('?!?!?!?!')).toBe('?!?!?!?!');
  });

  it('takes three hyphens before two, so `---` is one em dash', () => {
    expect(typeset('a---b')).toBe('a—b');
    expect(typeset('a --- b')).toBe('a — b');
    expect(typeset('a--b')).toBe('a–b');
    expect(typeset('a -- b')).toBe('a – b');
    expect(typeset('well--known')).toBe('well–known');
    // A hyphen with a space on one side only is a hyphen.
    expect(typeset('a- -b')).toBe('a- -b');
  });

  it('turns a quotation round by what sits either side of it', () => {
    expect(typeset('"hello"')).toBe('“hello”');
    expect(typeset("'bye'")).toBe('‘bye’');
    expect(typeset('"a" and "b"')).toBe('“a” and “b”');
    expect(typeset('("q")')).toBe('(“q”)');
    expect(typeset('said "why?" then')).toBe('said “why?” then');
    expect(typeset('"nested \'inner\' outer"')).toBe('“nested ‘inner’ outer”');
  });

  it('leaves a mark nothing closes exactly as it was typed', () => {
    expect(typeset('"unclosed')).toBe('"unclosed');
    expect(typeset('unopened"')).toBe('unopened"');
    expect(typeset('"a"b')).toBe('"a"b');
    // Five feet six, rather than a quotation of a space.
    expect(typeset('5" 6"')).toBe('5" 6"');
  });

  it('knows the three things an apostrophe is', () => {
    expect(typeset("it's")).toBe('it’s');
    expect(typeset("dogs' bones")).toBe('dogs’ bones');
    // An opening mark that never closes, which is what `'tis` and `'90s` are.
    expect(typeset("'tis")).toBe("'tis");
    expect(typeset("'90s")).toBe("'90s");
  });

  it('pairs a mark across the markup between it and its other half', () => {
    expect(typeset('**a** "b"')).toBe('a “b”');
    expect(typeset('`code` "x"')).toBe('`code` “x”');
    expect(typeset('"a *b* c"')).toBe('“a b c”');
    expect(typeset('[l](/u) "x"')).toBe('</u|l> “x”');
  });

  it('opens and closes at one depth, and reads across no hard break', () => {
    expect(typeset('*"a"* b')).toBe('“a” b');
    expect(typeset('a\\\n"b"')).toBe('a\n“b”');
  });

  it('rewrites what a reader reads and nothing a machine reads', () => {
    expect(typeset('`a--b`')).toBe('`a--b`');
    expect(typeset('![a--b](/i.png)')).toBe('![a--b]');
    expect(typeset('[a--b](/u--v)')).toBe('</u--v|a–b>');
    expect(typeset('```\na--b\n```')).toBe('`a--b`');
  });

  it('never draws a dash into an address', () => {
    expect(typeset('see http://a.co/a--b here')).toBe(
      'see <http://a.co/a--b|http://a.co/a--b> here'
    );
    expect(typeset('<http://a.co/a--b>')).toBe('<http://a.co/a--b|http://a.co/a--b>');
    expect(typeset('a--b: http://x.co/y...z')).toBe('a–b: <http://x.co/y...z|http://x.co/y...z>');
    // An address the policy would follow, whether or not this document links it.
    expect(typeset('ftp://x.io/a--b')).toBe('ftp://x.io/a--b');
  });

  it('leaves a character the document escaped exactly as it was escaped', () => {
    expect(typeset('\\"a\\"')).toBe('"a"');
    expect(typeset('a\\-\\-b')).toBe('a--b');
    expect(typeset('a\\.\\.\\.b')).toBe('a...b');
    expect(typeset("it\\'s")).toBe("it's");
    expect(typeset('\\(c\\)')).toBe('(c)');
    // And leaves the tree it would have left anyway: the escaped characters go
    // back in with their neighbours once the typographer has had its look.
    expect(parseMarkdown('a\\-\\-b', { typographer: true }).root.children).toEqual(
      parseMarkdown('a\\-\\-b').root.children
    );
  });

  it('is nothing to a character reference, which is not an escape', () => {
    // markdown-it answers the same: `&eacute;` is read and the run around it
    // is still prose.
    expect(typeset('Caf&eacute; -- best')).toBe('Café – best');
  });

  it('draws a quotation with the marks the document asked for', () => {
    const marks = (quotes: MawyQuotes): string =>
      read(`"a 'b' c" and dogs' bones`, { typographer: true, typographerQuotes: quotes });

    expect(marks({ doubleOpen: '„', doubleClose: '“' })).toBe('„a ‘b’ c“ and dogs’ bones');
    expect(marks({ doubleOpen: '«', doubleClose: '»', singleOpen: '‹', singleClose: '›' })).toBe(
      '«a ‹b› c» and dogs’ bones'
    );
    // Anything left out keeps the English mark, and the apostrophe is not one
    // of the four: it stays an apostrophe whatever the quotations are drawn as.
    expect(marks({})).toBe('“a ‘b’ c” and dogs’ bones');
  });

  it('leaves a colon that goes nowhere to the prose it is', () => {
    expect(typeset('re:invent... was fun')).toBe('re:invent… was fun');
    expect(typeset('TODO:fix... this')).toBe('TODO:fix… this');
  });

  it('reaches a heading, a quotation, a list and a table cell', () => {
    expect(typeset('# a--b "q"')).toBe('a–b “q”');
    expect(typeset('> a--b "q"')).toBe('a–b “q”');
    expect(typeset('- a--b "q"')).toBe('a–b “q”');
    expect(typeset('| a--b |\n|---|\n| c...d |')).toBe('a–bc…d');
  });
});

describe('the widened linkifier', () => {
  const wide = (source: string): string => read(source, { autolinkSchemes: true });

  it('is off unless it is asked for', () => {
    expect(read('ftp://x.io/f and //a.co/x')).toBe('ftp://x.io/f and //a.co/x');
  });

  it('reads every scheme the link policy trusts', () => {
    expect(wide('ftp://x.io/f')).toBe('<ftp://x.io/f|ftp://x.io/f>');
    expect(wide('matrix:r/x')).toBe('<matrix:r/x|matrix:r/x>');
    expect(wide('tel:+15550100')).toBe('<tel:+15550100|tel:+15550100>');
    // Already an address, and not one that is given `mailto:` a second time.
    expect(wide('mailto:a@b.com')).toBe('<mailto:a@b.com|mailto:a@b.com>');
  });

  it('reads an address that left its scheme to the page', () => {
    expect(wide('//a.co/x')).toBe('<//a.co/x|//a.co/x>');
    expect(wide('see //a.co/x.')).toBe('see <//a.co/x|//a.co/x>.');
    // A host with no dot in it is a word: a Windows network path stays one.
    expect(wide('//server/share')).toBe('//server/share');
    expect(wide('//comment')).toBe('//comment');
    expect(wide('// a comment')).toBe('// a comment');
  });

  it('refuses every scheme the link policy refuses', () => {
    expect(wide('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(wide('vbscript:x')).toBe('vbscript:x');
    expect(wide('data:text/html,x')).toBe('data:text/html,x');
  });

  it('leaves a colon that is not a scheme alone', () => {
    expect(wide('TODO:fix this')).toBe('TODO:fix this');
    expect(wide('note: see below')).toBe('note: see below');
    expect(wide('ratio 3:2 here')).toBe('ratio 3:2 here');
    expect(wide('a:b')).toBe('a:b');
    expect(wide('C:\\Users\\x')).toBe('C:\\Users\\x');
    // A scheme with nothing after it points nowhere.
    expect(wide('ftp:')).toBe('ftp:');
  });

  it('still reads everything GFM reads, port and all', () => {
    for (const options of [{}, { autolinkSchemes: true }]) {
      expect(read('www.example.com:8080/x', options)).toBe(
        '<http://www.example.com:8080/x|www.example.com:8080/x>'
      );
      expect(read('http://a.co/x', options)).toBe('<http://a.co/x|http://a.co/x>');
      expect(read('a@b.com', options)).toBe('<mailto:a@b.com|a@b.com>');
    }
  });

  it('is nothing to a document GFM is off for', () => {
    expect(read('ftp://x.io/f', { gfm: false, autolinkSchemes: true })).toBe('ftp://x.io/f');
  });
});
