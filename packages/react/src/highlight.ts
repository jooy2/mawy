/**
 * Mawy's own syntax highlighter, for the languages a document usually shows.
 *
 * It is a separate entry point — `mawy/highlight` — and nothing in the main one
 * reaches it, so an application that never mentions it never ships it. That is
 * the whole reason it is over here rather than inside the viewer: a highlighter
 * is the largest thing a Markdown renderer can be made to carry, and most
 * documents have nothing in them to colour.
 *
 * It is **approximate**, deliberately and permanently. A correct parser for a
 * dozen languages is not a thing to keep beside a Markdown editor, and colour
 * is not the kind of answer that has to be right: a template literal with a
 * brace in it, a regular expression that reads as division, a `<` in prose
 * inside an HTML block — each of them comes out slightly wrong and none of them
 * matters. What it will not do is change the code. The renderer checks that the
 * tokens join back into exactly what they were given and draws the block plain
 * if they do not, so being wrong here is a colour that is off rather than a
 * document that says something else.
 *
 * For anything more than that, `MawyHighlighter` is a small interface and
 * Shiki or Prism behind it is a few lines. This is here so that the common case
 * needs neither.
 */

import type { MawyCodeToken, MawyCodeTokenKind, MawyHighlighter } from './types.js';

/* -------------------------------------------------------------------------
 * The machine
 * ---------------------------------------------------------------------- */

/**
 * What a rule says a run of characters is.
 *
 * A function rather than a name where the name depends on the word: `open` is a
 * function where it is followed by a bracket, a type where it starts with a
 * capital, and nothing in particular otherwise, and that is one rule rather
 * than three.
 */
type Kind =
  | MawyCodeTokenKind
  | null
  | ((text: string, code: string, end: number) => MawyCodeTokenKind | null);

interface Rule {
  /** Sticky, so it can only match where it is asked to. */
  match: RegExp;
  kind: Kind;
}

/**
 * How much code is worth colouring.
 *
 * Every rule is tried at every position a rule did not match, so the work is
 * the length of the block times the size of its grammar. A minified bundle
 * pasted into a document is not something to spend a frame on, and plain text
 * is a perfectly good drawing of it.
 */
const LIMIT = 100_000;

function tokenize(code: string, rules: readonly Rule[]): MawyCodeToken[] {
  const out: MawyCodeToken[] = [];
  let plain = '';
  let at = 0;

  const flush = () => {
    if (plain) {
      out.push({ text: plain, kind: null });
      plain = '';
    }
  };

  while (at < code.length) {
    let taken = 0;
    let kind: MawyCodeTokenKind | null = null;

    for (const rule of rules) {
      rule.match.lastIndex = at;

      const found = rule.match.exec(code);

      if (found && found[0]) {
        taken = found[0].length;
        kind = typeof rule.kind === 'function' ? rule.kind(found[0], code, at + taken) : rule.kind;
        break;
      }
    }

    if (!taken) {
      plain += code[at];
      at += 1;
      continue;
    }

    if (kind) {
      flush();
      out.push({ text: code.slice(at, at + taken), kind });
    } else {
      // Matched, but it is nothing in particular — it joins the plain run
      // rather than becoming an element that says nothing.
      plain += code.slice(at, at + taken);
    }

    at += taken;
  }

  flush();

  return out;
}

/* -------------------------------------------------------------------------
 * Pieces every grammar is made of
 * ---------------------------------------------------------------------- */

const words = (list: string) => new Set(list.split(' '));

const lineComment = (open: string): Rule => ({
  match: new RegExp(`${open}[^\\n]*`, 'y'),
  kind: 'comment'
});

const BLOCK_COMMENT: Rule = { match: /\/\*[\s\S]*?(?:\*\/|$)/y, kind: 'comment' };
const DOUBLE_QUOTED: Rule = { match: /"(?:\\[\s\S]|[^"\\\n])*"?/y, kind: 'string' };
const SINGLE_QUOTED: Rule = { match: /'(?:\\[\s\S]|[^'\\\n])*'?/y, kind: 'string' };
const BACKTICKED: Rule = { match: /`(?:\\[\s\S]|[^`\\])*`?/y, kind: 'string' };
const NUMBER: Rule = {
  match:
    /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*)?\.\d[\d_]*|\d[\d_]*)(?:[eE][+-]?\d+)?[a-zA-Z_]*/y,
  kind: 'number'
};
const OPERATOR: Rule = { match: /[+\-*/%=<>!&|^~?:]+/y, kind: 'operator' };
const PUNCTUATION: Rule = { match: /[{}[\]();,.]/y, kind: 'punctuation' };

/** An identifier, named by what it turns out to be where it stands. */
const identifier = (keywords: Set<string>, constants: Set<string>, types?: Set<string>): Rule => ({
  match: /[A-Za-z_$][\w$]*/y,
  kind: (text, code, end) => {
    if (types?.has(text)) {
      return 'type';
    }

    if (keywords.has(text)) {
      return 'keyword';
    }

    if (constants.has(text)) {
      return 'constant';
    }

    // A name with a bracket after it is being called, whatever it is.
    if (/^[ \t]*[(<]/.test(code.slice(end, end + 8))) {
      return 'function';
    }

    return /^[A-Z]/.test(text) ? 'type' : null;
  }
});

/** The shape almost every language with braces in it shares. */
function clike(options: {
  keywords: string;
  constants?: string;
  /** Names of types, which read as types wherever they stand. */
  types?: string;
  comment?: string;
  backticks?: boolean;
  blockComments?: boolean;
}): Rule[] {
  const keywords = words(options.keywords);
  const constants = words(options.constants ?? 'true false null');
  const types = options.types ? words(options.types) : undefined;

  return [
    ...(options.blockComments === false ? [] : [BLOCK_COMMENT]),
    lineComment(options.comment ?? '//'),
    DOUBLE_QUOTED,
    SINGLE_QUOTED,
    ...(options.backticks ? [BACKTICKED] : []),
    NUMBER,
    identifier(keywords, constants, types),
    OPERATOR,
    PUNCTUATION
  ];
}

/* -------------------------------------------------------------------------
 * The languages
 * ---------------------------------------------------------------------- */

const JS_KEYWORDS =
  'as async await break case catch class const continue debugger default delete do else export ' +
  'extends finally for from function get if import in instanceof let new of return set static ' +
  'switch throw try typeof var void while with yield';

const TS_KEYWORDS = `${JS_KEYWORDS} abstract asserts declare enum implements infer interface is keyof namespace override private protected public readonly satisfies type unique`;

/** The names TypeScript writes a type with, which are not keywords to a reader. */
const TS_TYPES = 'any bigint boolean never number object string symbol undefined unknown void';

const JS_CONSTANTS = 'true false null undefined NaN Infinity this super globalThis arguments';

const javascript = clike({
  keywords: JS_KEYWORDS,
  constants: JS_CONSTANTS,
  backticks: true
});

const typescript = clike({
  keywords: TS_KEYWORDS,
  constants: JS_CONSTANTS,
  types: TS_TYPES,
  backticks: true
});

const json: Rule[] = [
  // A string with a colon after it is a name rather than a value, which is the
  // only structure JSON has to show.
  {
    match: /"(?:\\[\s\S]|[^"\\\n])*"/y,
    kind: (_text, code, end) => (/^\s*:/.test(code.slice(end, end + 8)) ? 'attribute' : 'string')
  },
  lineComment('//'),
  BLOCK_COMMENT,
  NUMBER,
  { match: /\b(?:true|false|null)\b/y, kind: 'constant' },
  PUNCTUATION,
  { match: /:/y, kind: 'operator' }
];

const markup: Rule[] = [
  { match: /<!--[\s\S]*?(?:-->|$)/y, kind: 'comment' },
  { match: /<!\w[^>]*>?/y, kind: 'keyword' },
  { match: /<\/?[A-Za-z][\w:.-]*/y, kind: 'tag' },
  { match: /\/?>/y, kind: 'punctuation' },
  { match: /[A-Za-z_:][\w:.-]*(?=[ \t]*=)/y, kind: 'attribute' },
  DOUBLE_QUOTED,
  SINGLE_QUOTED,
  { match: /&#?\w+;/y, kind: 'constant' },
  { match: /=/y, kind: 'operator' }
];

const css: Rule[] = [
  BLOCK_COMMENT,
  { match: /@[\w-]+/y, kind: 'keyword' },
  { match: /#[\da-fA-F]{3,8}\b/y, kind: 'number' },
  DOUBLE_QUOTED,
  SINGLE_QUOTED,
  { match: /[-\w]+(?=[ \t]*:)/y, kind: 'attribute' },
  { match: /--[\w-]+/y, kind: 'variable' },
  { match: /[.#][-\w]+|::?[-\w]+/y, kind: 'type' },
  { match: /-?(?:\d*\.)?\d+[\w%]*/y, kind: 'number' },
  { match: /[A-Za-z-]+(?=\()/y, kind: 'function' },
  PUNCTUATION,
  { match: /[>+~*=]/y, kind: 'operator' }
];

const shell: Rule[] = [
  lineComment('#'),
  DOUBLE_QUOTED,
  SINGLE_QUOTED,
  { match: /\$\{[^}]*\}?|\$[\w@?#*!$-]+/y, kind: 'variable' },
  {
    match: /[A-Za-z_][\w-]*/y,
    kind: (text) =>
      words(
        'if then else elif fi for while until do done case esac function return in select time ' +
          'break continue local export declare readonly source alias set unset trap exit'
      ).has(text)
        ? 'keyword'
        : null
  },
  NUMBER,
  { match: /[|&;<>]+/y, kind: 'operator' },
  PUNCTUATION
];

const python: Rule[] = [
  lineComment('#'),
  { match: /[rbfu]{0,2}"""[\s\S]*?(?:"""|$)|[rbfu]{0,2}'''[\s\S]*?(?:'''|$)/y, kind: 'string' },
  { match: /[rbfu]{0,2}"(?:\\[\s\S]|[^"\\\n])*"?/y, kind: 'string' },
  { match: /[rbfu]{0,2}'(?:\\[\s\S]|[^'\\\n])*'?/y, kind: 'string' },
  { match: /@[\w.]+/y, kind: 'attribute' },
  NUMBER,
  identifier(
    words(
      'and as assert async await break class continue def del elif else except finally for from ' +
        'global if import in is lambda match nonlocal not or pass raise return try while with yield'
    ),
    words('True False None self cls')
  ),
  OPERATOR,
  PUNCTUATION
];

const yaml: Rule[] = [
  lineComment('#'),
  { match: /^[ \t]*(?:-[ \t]+)?[\w."'-]+(?=[ \t]*:)/my, kind: 'attribute' },
  { match: /^[ \t]*-(?=[ \t]|$)/my, kind: 'punctuation' },
  { match: /[&*][\w-]+/y, kind: 'variable' },
  DOUBLE_QUOTED,
  SINGLE_QUOTED,
  { match: /\b(?:true|false|null|yes|no|on|off|~)\b/y, kind: 'constant' },
  NUMBER,
  { match: /[|>:]/y, kind: 'operator' }
];

const sql: Rule[] = [
  lineComment('--'),
  BLOCK_COMMENT,
  SINGLE_QUOTED,
  DOUBLE_QUOTED,
  {
    match: /[A-Za-z_][\w$]*/y,
    kind: (text, code, end) =>
      words(
        'add all alter and as asc between by case cast column constraint create cross database ' +
          'default delete desc distinct drop else end exists from full group having if in index ' +
          'inner insert intersect into is join key left like limit not null offset on or order ' +
          'outer primary references replace right select set table then top truncate union unique ' +
          'update using values view when where with'
      ).has(text.toLowerCase())
        ? 'keyword'
        : /^[ \t]*\(/.test(code.slice(end, end + 4))
          ? 'function'
          : null
  },
  NUMBER,
  OPERATOR,
  PUNCTUATION
];

const go = clike({
  keywords:
    'break case chan const continue default defer else fallthrough for func go goto if import ' +
    'interface map package range return select struct switch type var',
  constants: 'true false nil iota'
});

const rust = clike({
  keywords:
    'as async await break const continue crate dyn else enum extern fn for if impl in let loop ' +
    'match mod move mut pub ref return self static struct super trait type union unsafe use where while',
  constants: 'true false None Some Ok Err self Self'
});

const java = clike({
  keywords:
    'abstract assert break case catch class const continue default do else enum extends final ' +
    'finally for goto if implements import instanceof interface native new package private ' +
    'protected public return static strictfp super switch synchronized this throw throws ' +
    'transient try var void volatile while',
  constants: 'true false null this super'
});

const c = clike({
  keywords:
    'auto break case catch class const constexpr continue default delete do double else enum ' +
    'explicit extern float for friend goto if inline int long namespace new operator private ' +
    'protected public register return short signed sizeof static struct switch template this ' +
    'throw try typedef typename union unsigned using virtual void volatile while',
  constants: 'true false NULL nullptr this'
});

/**
 * Every language, and the names a fence is likely to call it.
 *
 * Aliases rather than a guess: `sh` and `bash` are the same grammar here and
 * `js` is not `json`, and the only way to be sure of that is a list.
 */
const LANGUAGES: Record<string, Rule[]> = {
  javascript,
  js: javascript,
  jsx: javascript,
  mjs: javascript,
  cjs: javascript,
  node: javascript,
  typescript,
  ts: typescript,
  tsx: typescript,
  mts: typescript,
  cts: typescript,
  json,
  jsonc: json,
  json5: json,
  html: markup,
  htm: markup,
  xml: markup,
  svg: markup,
  vue: markup,
  svelte: markup,
  css,
  scss: css,
  less: css,
  bash: shell,
  sh: shell,
  shell: shell,
  zsh: shell,
  console: shell,
  shellsession: shell,
  python,
  py: python,
  yaml,
  yml: yaml,
  sql,
  go,
  golang: go,
  rust,
  rs: rust,
  java,
  kotlin: java,
  c,
  cpp: c,
  'c++': c,
  cc: c,
  h: c,
  hpp: c,
  cs: java,
  csharp: java
};

/** The names this highlighter answers to, for a documentation page to list. */
export const MAWY_HIGHLIGHT_LANGUAGES: readonly string[] = Object.keys(LANGUAGES).sort();

/**
 * The highlighter itself.
 *
 * Pass it straight to `highlight`, or — better — fetch it only when a document
 * turns out to have code in it:
 *
 * ```tsx
 * <MawyViewer
 *   value={document}
 *   highlight={() => import('mawy/highlight').then((module) => module.mawyHighlighter)}
 * />
 * ```
 */
export const mawyHighlighter: MawyHighlighter = {
  supports(language) {
    return language.toLowerCase() in LANGUAGES;
  },

  highlight(code, language) {
    const rules = LANGUAGES[language.toLowerCase()];

    return rules && code.length <= LIMIT ? tokenize(code, rules) : [{ text: code, kind: null }];
  }
};
