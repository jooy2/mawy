import type { MawyLocale } from 'mawy-react';

/**
 * The document the playground's editor opens with, in the page's own language.
 *
 * Every other demo on this site shows one document in both locales, which is
 * fine for a specimen: what a table or a footnote looks like does not depend on
 * who is reading it. This one is different in kind — it is a list of things to
 * try — and instructions in a language the reader did not pick are instructions
 * nobody follows.
 *
 * Both are written rather than translated, and both are made of the awkward
 * things on purpose: a table, a footnote, an alert, two fences the highlighter
 * has to colour, a directive the site declared, and a line of Korean in the
 * English one so that an input method has something to compose over either way.
 */
export const PLAYGROUND: Readonly<Record<MawyLocale, string>> = {
  en: `# Everything, switched on

This is the editor from the package — not a picture of it, and not a cut-down
copy. What you type changes the Markdown, and the Markdown is what every other
surface is a view of.

## The switch at the left

Four answers to one question: \`wysiwyg\` draws the document and edits it where it
is drawn, \`plain\` is the source, \`preview\` is the reading, and \`split\` is both.
In \`split\` the bar between the panes is something to take hold of — drag it, or
give it the focus and press the arrows.

## The rest of the toolbar

Narrow the window and the buttons leave from the end, a group at a time, into
the menu marked with an ellipsis. Nothing wraps and nothing is lost.

- [x] \`Mod\` + **B**, *I*, K and E do what the buttons do
- [ ] \`Mod\` + **F** opens the find bar over the source, with replace beside it
- [ ] \`Mod\` + **S** hands the document to the browser as a download

## The awkward things, deliberately

| What | Why it is here |
| :--- | -------------: |
| A table | the pipes have to stay lined up while you type |
| A footnote[^1] | it is read at the bottom and written here |
| 한글 | 조합이 끝나기 전에는 아무것도 건드리지 않습니다 |

> [!TIP]
> Drop an image file on the editor, or paste a screenshot. This page answers
> \`onUploadImage\` with a \`data:\` URI, because there is no server behind a
> documentation site — a real application answers with wherever it put the bytes.

:::callout[A directive this page declared]{kind=note}
\`callout\`, \`progress\` and \`kbd\` are the site's rather than the library's. The
parser reads the shape; what the shape means is whoever embedded the editor.
:::

::progress{value=40 label=Written}

\`\`\`ts
<MawyEditor defaultValue={document} onChange={save} />
\`\`\`

\`\`\`dart
MawyEditor(defaultValue: document, onChange: save);
\`\`\`

[^1]: Written wherever it suits the author and read at the bottom, which is the
    whole of what a footnote is.
`,
  ko: `# 전부 켜 둔 채로

이 페이지에 있는 것은 패키지에 들어 있는 그 에디터입니다. 사진도 아니고 줄여
놓은 사본도 아닙니다. 여기에 입력하는 것이 곧 마크다운이고, 나머지 화면은 전부
그 마크다운을 보는 방법입니다.

## 왼쪽 끝의 전환

하나의 질문에 대한 네 가지 답입니다. \`wysiwyg\`는 그려진 문서를 그 자리에서
고치고, \`plain\`은 원문, \`preview\`는 읽기, \`split\`은 둘 다입니다. \`split\`에서
가운데 막대는 잡고 움직이는 것입니다. 끌어도 되고, 포커스를 준 뒤 방향키를
눌러도 됩니다.

## 툴바의 나머지

창을 좁히면 버튼이 끝에서부터 그룹 단위로 빠져나가 말줄임표 메뉴로 들어갑니다.
줄바꿈도 없고 사라지는 것도 없습니다.

- [x] \`Mod\` + **B**, *I*, K, E는 버튼과 같은 일을 합니다
- [ ] \`Mod\` + **F**는 원문 위에 찾기 막대를 엽니다. 바꾸기도 그 옆에 있습니다
- [ ] \`Mod\` + **S**는 문서를 브라우저에 넘겨 파일로 내려받게 합니다

## 일부러 까다로운 것들

| 무엇 | 왜 넣었는지 |
| :--- | ----------: |
| 표 | 입력하는 동안 세로줄이 계속 맞아야 합니다 |
| 각주[^1] | 쓰는 자리와 읽는 자리가 다릅니다 |
| 한글 | 조합이 끝나기 전에는 아무것도 건드리지 않습니다 |

> [!TIP]
> 이미지 파일을 에디터에 끌어다 놓거나 스크린샷을 붙여넣어 보세요. 이 페이지는
> \`onUploadImage\`에 \`data:\` URI로 답합니다. 문서 사이트 뒤에는 서버가 없기
> 때문이고, 실제 애플리케이션이라면 바이트를 올려둔 곳의 주소로 답합니다.

:::callout[이 페이지가 직접 선언한 디렉티브]{kind=note}
\`callout\`, \`progress\`, \`kbd\`는 라이브러리의 것이 아니라 이 사이트의 것입니다.
파서는 모양까지만 읽고, 그 모양이 무엇을 뜻하는지는 에디터를 가져다 쓴 쪽이
정합니다.
:::

::progress{value=40 label=작성}

\`\`\`ts
<MawyEditor defaultValue={document} onChange={save} />
\`\`\`

\`\`\`dart
MawyEditor(defaultValue: document, onChange: save);
\`\`\`

[^1]: 쓰기 좋은 자리에 쓰고 읽기는 맨 아래에서 읽습니다. 각주가 하는 일은
    그것뿐입니다.
`
};
