'use client';

import { useMemo, type ReactNode } from 'react';

// Lightweight, dependency-free syntax highlighter for chat code blocks.
// It covers the common languages produced by the assistant. Unknown
// languages gracefully fall back to plain (unhighlighted) text.

type TokenType = 'comment' | 'string' | 'number' | 'keyword' | 'literal' | 'plain';

type LanguageSpec = {
  keywords: ReadonlySet<string>;
  literals: ReadonlySet<string>;
  lineComments: readonly string[];
  blockComment?: readonly [string, string];
  quotes: readonly string[];
  caseInsensitiveKeywords?: boolean;
};

type Token = { type: TokenType; text: string };

const MAX_HIGHLIGHT_LENGTH = 20000;

function toSet(words: string): ReadonlySet<string> {
  return new Set(words.split(' '));
}

const JS_LIKE: LanguageSpec = {
  keywords: toSet(
    'abstract as async await break case catch class const continue debugger default delete do else enum export extends finally for from function get if implements import in instanceof interface let new of private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield'
  ),
  literals: toSet('true false null undefined NaN Infinity'),
  lineComments: ['//'],
  blockComment: ['/*', '*/'],
  quotes: ['"', "'", '`']
};

const PYTHON: LanguageSpec = {
  keywords: toSet(
    'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'
  ),
  literals: toSet('True False None'),
  lineComments: ['#'],
  quotes: ['"', "'"]
};

const SHELL: LanguageSpec = {
  keywords: toSet(
    'if then else elif fi for while until do done case esac function in select time export local return exit echo cd source alias unset readonly shift trap set'
  ),
  literals: toSet('true false'),
  lineComments: ['#'],
  quotes: ['"', "'"]
};

const SQL: LanguageSpec = {
  keywords: toSet(
    'select from where insert into values update set delete create table view index drop alter add join inner left right full outer on as and or not null primary key foreign references group by order having limit offset union all distinct case when then else end exists between like in is'
  ),
  literals: toSet('null true false'),
  lineComments: ['--'],
  blockComment: ['/*', '*/'],
  quotes: ["'", '"'],
  caseInsensitiveKeywords: true
};

const C_LIKE: LanguageSpec = {
  keywords: toSet(
    'auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern final finally float for friend goto if inline int long namespace new operator override private protected public register return short signed sizeof static struct switch template this throw throws try typedef typename union unsigned using virtual void volatile while implements interface extends package import synchronized boolean byte instanceof native transient assert var record sealed permits fn let mut impl trait pub use mod match crate self dyn move ref where async await func go chan defer fallthrough map range select type'
  ),
  literals: toSet('true false null nullptr nil NULL None'),
  lineComments: ['//'],
  blockComment: ['/*', '*/'],
  quotes: ['"', "'"]
};

const CSS_SPEC: LanguageSpec = {
  keywords: toSet(
    'important media supports keyframes font-face import charset namespace page root hover focus active visited disabled checked first-child last-child not is where has before after'
  ),
  literals: toSet('inherit initial unset auto none'),
  lineComments: [],
  blockComment: ['/*', '*/'],
  quotes: ['"', "'"]
};

const MARKUP: LanguageSpec = {
  keywords: new Set<string>(),
  literals: new Set<string>(),
  lineComments: [],
  blockComment: ['<!--', '-->'],
  quotes: ['"', "'"]
};

const LANGUAGE_SPECS: Record<string, LanguageSpec> = {
  js: JS_LIKE,
  jsx: JS_LIKE,
  ts: JS_LIKE,
  tsx: JS_LIKE,
  javascript: JS_LIKE,
  typescript: JS_LIKE,
  json: JS_LIKE,
  python: PYTHON,
  py: PYTHON,
  bash: SHELL,
  sh: SHELL,
  shell: SHELL,
  zsh: SHELL,
  sql: SQL,
  c: C_LIKE,
  cpp: C_LIKE,
  csharp: C_LIKE,
  cs: C_LIKE,
  java: C_LIKE,
  kotlin: C_LIKE,
  swift: C_LIKE,
  go: C_LIKE,
  rust: C_LIKE,
  rs: C_LIKE,
  php: C_LIKE,
  scala: C_LIKE,
  dart: C_LIKE,
  css: CSS_SPEC,
  scss: CSS_SPEC,
  less: CSS_SPEC,
  html: MARKUP,
  xml: MARKUP,
  svg: MARKUP,
  vue: MARKUP
};

function isIdentStart(ch: string) {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentPart(ch: string) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function isDigit(ch: string) {
  return ch >= '0' && ch <= '9';
}

function tokenize(code: string, spec: LanguageSpec): Token[] {
  const tokens: Token[] = [];
  let plainStart = 0;
  let index = 0;

  const pushPlain = (end: number) => {
    if (end > plainStart) {
      tokens.push({ type: 'plain', text: code.slice(plainStart, end) });
    }
  };

  const pushToken = (type: TokenType, end: number) => {
    pushPlain(index);
    tokens.push({ type, text: code.slice(index, end) });
    index = end;
    plainStart = end;
  };

  while (index < code.length) {
    const ch = code[index] ?? '';

    const lineComment = spec.lineComments.find((marker) =>
      code.startsWith(marker, index)
    );
    if (lineComment) {
      let end = code.indexOf('\n', index);
      if (end === -1) end = code.length;
      pushToken('comment', end);
      continue;
    }

    if (spec.blockComment && code.startsWith(spec.blockComment[0], index)) {
      const close = code.indexOf(
        spec.blockComment[1],
        index + spec.blockComment[0].length
      );
      const end =
        close === -1 ? code.length : close + spec.blockComment[1].length;
      pushToken('comment', end);
      continue;
    }

    if (spec.quotes.includes(ch)) {
      let end = index + 1;
      while (end < code.length) {
        const current = code[end];
        if (current === '\\') {
          end += 2;
          continue;
        }
        if (current === ch) {
          end += 1;
          break;
        }
        if (ch !== '`' && current === '\n') break;
        end += 1;
      }
      pushToken('string', Math.min(end, code.length));
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(code[index + 1] ?? ''))) {
      let end = index + 1;
      while (end < code.length) {
        const current = code[end] ?? '';
        if (/[0-9A-Fa-f_.xXoObBeE]/.test(current)) {
          end += 1;
          continue;
        }
        if (
          (current === '+' || current === '-') &&
          /[eE]/.test(code[end - 1] ?? '')
        ) {
          end += 1;
          continue;
        }
        break;
      }
      pushToken('number', end);
      continue;
    }

    if (isIdentStart(ch)) {
      let end = index + 1;
      while (end < code.length && isIdentPart(code[end] ?? '')) end += 1;
      const word = code.slice(index, end);
      const lookup = spec.caseInsensitiveKeywords ? word.toLowerCase() : word;
      if (spec.keywords.has(lookup)) {
        pushToken('keyword', end);
      } else if (spec.literals.has(lookup)) {
        pushToken('literal', end);
      } else {
        index = end;
      }
      continue;
    }

    index += 1;
  }

  pushPlain(code.length);
  return tokens;
}

export function CodeHighlight({
  code,
  language
}: {
  code: string;
  language?: string;
}) {
  const nodes = useMemo<ReactNode>(() => {
    const spec = language
      ? LANGUAGE_SPECS[language.toLowerCase()]
      : undefined;
    if (!spec || code.length > MAX_HIGHLIGHT_LENGTH) return code;

    return tokenize(code, spec).map((token, tokenIndex) =>
      token.type === 'plain' ? (
        token.text
      ) : (
        <span key={tokenIndex} className={'tok-' + token.type}>
          {token.text}
        </span>
      )
    );
  }, [code, language]);

  return <>{nodes}</>;
}
