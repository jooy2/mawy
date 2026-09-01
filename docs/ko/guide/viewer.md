---
title: 뷰어
order: 3
---

# 뷰어

뷰어는 마크다운 문서를 그리고, 편집하지는 않습니다. 에디터가 쓰는 것과 같은 파서, 같은 렌더러를 씁니다. 이것이 뷰어가 남의 라이브러리가 아니라 이 패키지 안에 있는 이유입니다.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

이게 전부입니다. 채워 넣을 테마 객체도, 문서를 그리기 전에 등록해야 할 것도, 렌더링을 맡길 두 번째 라이브러리도 없습니다.

## 왜 같은 패키지에 있나

::: fw flutter

그것은 두 패키지 사이에서도 성립하고, 주장이 아니라 검증됩니다. Dart 파서가 곧 TypeScript 파서입니다 — 같은 파일, 같은 함수, 같은 규칙 — 그리고 `packages/flutter/tool/parity.dart`가 저장소의 모든 마크다운 파일을 둘 다에 통과시켜 트리를 비교합니다. 브라우저에서 한 뜻인 문서는 앱에서도 같은 뜻입니다.

:::

"이걸로 쓰고 저걸로 보여주는" 구성에는 나중에 반박하기 어려운 실패가 하나 있습니다. 작성자가 에디터에서 문서를 쓰고, 화면에서 멀쩡해 보이고, 독자에게는 다르게 그려지는 것입니다. 두 마크다운 구현 사이의 모든 차이 — 목록이 어떻게 중첩되는지, 줄바꿈이 줄바꿈인지, 닫히지 않은 강조가 어떻게 되는지 — 가 전부 그 기회입니다.

파서와 렌더러를 공유하면 이 범주 자체가 사라집니다. 작성자가 `preview`에서 본 것이 곧 뷰어가 그리는 것입니다. 같은 코드 경로이기 때문입니다.

## 문서는 선택입니다

::: fw flutter

Flutter 패키지에는 없습니다. 거기서 `value`는 필수입니다. 파일을 여는 것은 파일 선택기를 뜻하고, 그것은 플러그인을 뜻합니다. 이 패키지에는 없고 애플리케이션에는 대개 이미 있는 의존성이죠. 그래서 파일을 읽는 것은 여러분의 몫이고 그리는 것이 Mawy의 몫이며, 이 절 전체가 React 패키지의 것입니다.

:::

::: fw react

`value`는 필수가 아니라 프롭입니다. 편의를 위해서가 아니라, 그것이 이 컴포넌트의 형태이기 때문입니다. 문서가 없으면 뷰어 자체가 **파일 선택기**가 됩니다. `.md` 파일을 끌어다 놓거나, 골라서 열면 됩니다.

<MawyDemo name="viewer/empty" />

어느 쪽이 되는지는 어떤 프롭을 넘겼는지에 따라 정해집니다.

| 넘긴 것 | 뷰어는 | 파일을 놓으면 |
| --- | --- | --- |
| 없음 | 받은 것을 엽니다 | 그것을 갖고, `onValueChange`를 호출합니다 |
| `defaultValue` | 거기서 시작해 스스로 갖습니다 | 그것을 갖고, `onValueChange`를 호출합니다 |
| `value` | 넘긴 것만 보여줍니다 | 꺼져 있습니다 — `fileDrop`으로 다시 켤 수 있습니다 |

어느 쪽이든 `onValueChange`는 본문과 그것이 온 `File`을 함께 넘겨줍니다.

```tsx
<MawyViewer
  onValueChange={(markdown, file) => {
    console.log(file?.name, markdown.length);
  }}
/>
```

5메가바이트가 넘는 파일은 읽지 않고 거절합니다. 마크다운으로 백만 단어쯤 되는 양이고, 이 제한이 막는 것은 누군가 데이터베이스 덤프를 끌어다 놓아서 응답이 멈춘 탭입니다.

:::

## 무엇을 읽나

CommonMark, 그리고 그 위에 GitHub이 더한 것들입니다.

|  |  |
| --- | --- |
| **블록** | ATX·setext 제목, 문단, 펜스·들여쓰기 코드 블록, 인용, 순서 있는·없는 목록(깊이 제한 없음), 구분선, HTML 블록 |
| **인라인** | 강조, 굵게, `코드`, 링크, 이미지, 자동 링크, 강제 줄바꿈, 문자 참조, 백슬래시 이스케이프 |
| **GitHub** | 열별 정렬이 있는 표, 체크박스 목록, `~~취소선~~`, 맨 URL과 이메일 주소, 각주, 그리고 다섯 종류의 [알림 블록](https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) |
| **참조** | `[label]: url "title"` 정의. 파일 어디에 쓰여 있든 해석합니다 |
| **하나 더** | 정의 목록. GitHub은 읽지 않는 것입니다 |

옵션은 `parse`에 있습니다.

::: fw react

```tsx
<MawyViewer value={document} parse={{ gfm: true, breaks: false, definitionLists: true }} />
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  parse: const MawyParseOptions(gfm: true, breaks: false, definitionLists: true),
);
```

:::

- **`gfm`** (기본값 `true`) — GitHub의 확장. 끄면 `|`는 그냥 세로줄이고 `~~`는 물결 넷입니다.
- **`breaks`** (기본값 `false`) — 문단 안의 줄바꿈 하나를 줄바꿈으로 볼지. 마크다운은 아니라고 합니다. 채팅 클라이언트와 이슈 트래커는 맞다고 합니다. 마크다운을 써 본 적 없는 독자가 기대하는 쪽이 후자이고, 이것이 이 항목이 결정이 아니라 옵션인 이유입니다.
- **`definitionLists`** (기본값 `true`) — 글줄 아래의 `: `을 용어와 그 뜻으로 읽을지. 아래를 보세요.

### 얼마나 읽나

**명세의 예제 652개 중 605개**, 그리고 그것을 바뀔 때마다 돌립니다. CommonMark는 테스트 모음이 안에 들어 있는 문서라서, "CommonMark를 읽는다"는 주장이 아니라 숫자입니다. 그 숫자는 `packages/react/test/internal/markdown/commonmark.test.ts`에 있고, 나머지 47개가 무엇인지도 그 옆에 적혀 있습니다.

그중 셋은 모자란 것이 아니라 결정입니다. 모든 URL은 스킴 허용 목록을 거치므로 `<made-up-scheme://foo>`는 작성자가 쓴 글자 그대로 그려집니다. 나머지는 대체로 가장자리입니다. 목록 항목 안의 탭, 링크 목적지 안의 문자 참조, 명세는 빽빽하다고 보는데 여기서는 성기다고 보는 목록 같은 것들. 하나하나 왜 거기 있는지가 함께 적혀 있어서, 그 목록은 의도적으로만 짧아질 수 있습니다.

Dart 파서는 이 모음을 돌지 않고, 돌 필요도 없습니다. 두 파서의 트리를 까다로운 사례 전부와 저장소의 모든 마크다운 파일에 대해 diff하므로, 한쪽에서 맞는 트리는 다른 쪽이 내놓는 트리입니다.

### 각주

문장 속의 `[^label]`은 번호가 되고, 그것이 가리키는 주석은 문서 아래에 그려집니다. 언급된 자리로 돌아가는 링크와 함께.

```md
Mawy는 자기 마크다운을 직접 파싱합니다.[^why]

[^why]: 문서의 한 조각이 어디서 왔는지 말할 수 있는 것은 파서뿐이고, 여기 있는 나머지 전부가 그 위에 서 있습니다.
```

알아둘 것 셋, 그리고 셋 다 GitHub이 하는 그대로입니다.

- **번호는 처음 언급된 순서**이지 쓰인 순서가 아닙니다. 파일이 어떻게 생겼든 독자는 `1`을 `2`보다 먼저 만납니다.
- **아무도 언급하지 않은 주석은 아예 그려지지 않습니다.** 아무도 걸지 않은 `[label]: url`과 같은 뜻에서, 문서가 아니라 글쓴이에게 남긴 메모입니다.
- **가리킬 것이 없는 `[^label]`은 쓰인 그 글자 그대로** 남습니다. 아무 데도 가지 않는 링크가 되지 않습니다.

주석 하나가 여러 블록일 수 있습니다. 두 번째 문단, 목록, 코드 블록 — 첫 줄 이후를 네 칸 들여쓰기만 하면 됩니다. 어디에 썼는지는 상관없습니다. 파서가 흐름에서 들어내므로, 문서 한가운데에 쓴 주석도 아래에서 읽힙니다.

### 정의 목록

여기서 GitHub이 읽지 않는 유일한 것입니다. 문법은 [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#def-list)의 것이고, 이런 걸 쓰는 사람들이 쓰는 바로 그 문법입니다.

```md
마크다운 : 쓰인 대로 읽히는 글쓰기 방식.

Mawy : 이것. : 그리고 그 옆의 에디터.
```

용어는 글줄 하나이고, 그 뜻은 콜론 **하나와 공백**으로 시작하는 줄입니다. 그 공백이 없으면 문장 아래의 `:warning:`이 그 문장을 용어로 만들어 버립니다. 아주 많은 문서에서요. 여러 용어가 한 뜻을 나눠 가질 수도, 한 용어가 여러 뜻을 가질 수도 있고, 첫 줄 이후를 들여쓰면 뜻 하나가 여러 블록일 수도 있습니다. 뜻 앞의 빈 줄은 목록 전체를 성기게 만듭니다. 글머리 기호 목록에서와 똑같이.

`parse`에 `definitionLists: false`를 넘기면 꺼집니다. GitHub에서와 정확히 같은 뜻이어야 하는 문서를 위해서.

## 코드 블록에 색 입히기

::: fw flutter

Flutter 패키지는 지금 코드 블록을 색 없이 그립니다. `MawyHighlighter`는 React의 타입이고, Dart 쪽은 그것을 번역한 것이 아니라 자기 모양을 갖게 될 것입니다. 그래서 이 절의 나머지는 React 패키지의 것이고, 그 모양은 거기서부터 따져 나가게 됩니다.

:::

::: fw react

기본값은 색이 없는 것이고, 빠뜨린 것이 아닙니다. 하이라이터는 마크다운 렌더러가 지고 갈 수 있는 것 중 가장 큰 것이고, 대부분의 문서에는 색을 입힐 것이 없습니다. 그래서 프롭이고, 그 프롭은 **함수**를 받습니다. 펜스에 언어가 적힌 문서를 실제로 그리기 전까지는 가져오지도 않도록.

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

`mawy-react/highlight`는 별도의 진입점이라, 언급한 적 없는 애플리케이션의 번들에는 들어가지 않습니다. 안에 든 것은 Mawy가 직접 만든 하이라이터이고, 문서가 흔히 보여주는 언어들 — `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `go`, `rust`, `java`, `c`, `cpp`과 그것들이 함께 답하는 이름들 — 을 압니다. **근사적이고**, 의도적으로 그리고 앞으로도 그렇습니다. 중괄호가 든 템플릿 리터럴이나 나눗셈처럼 읽히는 정규식은 조금씩 틀리게 나오고, 그건 문제가 되지 않습니다. 색은 반드시 맞아야 하는 종류의 답이 아니니까요.

그 이상이 필요하면 `MawyHighlighter`가 인터페이스 전부이고, 그 뒤에 Shiki나 Prism을 두는 것은 몇 줄입니다.

```tsx
const shiki: MawyHighlighter = {
  supports: (language) => languages.includes(language),
  highlight: async (code, language) => toMawyTokens(await codeToTokens(code, { lang: language }))
};
```

**마크업이 아니라 토큰**이고, 이것은 이 라이브러리 전체가 딛고 선 것과 같은 결정입니다. 하이라이터가 답하는 것은 텍스트와 이름 — `keyword`, `string`, `comment` 외 열 가지 — 이고, 그것이 어떤 엘리먼트가 될지는 이 패키지가 정합니다. HTML 문자열로 화면에 닿는 것이 하나도 없고, 하이라이터가 틀렸다고 해서 문서에 `<script>`를 넣을 수는 없습니다. 목록에 없는 이름은 그냥 텍스트로 그려집니다.

하이라이터가 지켜야 할 것은 하나, 토큰이 **곧 그 코드**라는 것입니다. 돌아온 것을 다시 이어 붙여 들어간 것과 비교하고, 맞지 않는 블록은 색 없이 그립니다. 문서가 하지 않은 말을 화면이 하는 것과 바꿀 만한 색은 없습니다.

색이 입혀진 조각도 뷰어가 그리는 다른 모든 것처럼 어디서 왔는지 말합니다. 코드 블록 한가운데를 클릭해도 여전히 그 글자를 찾아냅니다.

색 자체는 여덟 개의 커스텀 프로퍼티입니다 — `--mawy-hl-comment`, `--mawy-hl-string`, `--mawy-hl-number`, `--mawy-hl-keyword`, `--mawy-hl-type`, `--mawy-hl-function`, `--mawy-hl-variable`, `--mawy-hl-punctuation`. 밝은 팔레트와 어두운 팔레트 양쪽에서 `.mawy-root`에 선언되어 있고, 다시 선언하는 것은 여러분 몫입니다.

:::

## 디렉티브

뷰어는 마크다운이 말할 수 있는 것을 그립니다. 그런데 문서는 가끔 마크다운에 낱말이 없는 것을 말하고 싶어 합니다. 영상, 수식, 사이트의 모든 페이지가 쓰는 우리 회사 알림 상자 같은 것. 혼자서 거기서 빠져나가는 길은 둘뿐이고 둘 다 나쁩니다. 원시 HTML — 안전 이야기 전체가 그것을 필요로 하지 않는 데 딛고 서 있습니다 — 아니면 영상을 아는 라이브러리, 즉 그다음엔 모든 것을 알아야 하는 라이브러리.

디렉티브가 세 번째 길입니다. 파서는 **모양**을 읽고 거기서 멈춥니다. `youtube`가 무엇인지에 대해 아무 의견이 없고, 바로 그것이 문서가 그것을 실어 나를 수 있게 하는 것입니다. 그 모양이 무슨 뜻인지는 여러분이 말합니다.

셋이 있고, 콜론의 개수가 그 구분입니다.

```md
:::callout[주의]{kind=warning} 블록이고, 블록으로 파싱됩니다. **강조**, 목록, 코드. :::

::youtube{id=dQw4w9WgXcQ}

가려면 :kbd[Ctrl]을 누르세요.
```

컨테이너는 블록을 담고 자기 길이 이상의 콜론에서 닫힙니다. 그래서 `::::`가 `:::`를 담을 수 있습니다. 리프는 한 줄이고 그 아래에 아무것도 없습니다. 텍스트 디렉티브는 문장 안에 앉습니다.

::: fw react

각 이름이 어떤 컴포넌트가 되는지는 프롭 하나입니다.

```tsx
const Callout = ({ attributes, label, children }: MawyDirectiveProps) => (
  <aside className={`callout callout-${attributes.kind ?? 'note'}`}>
    {label ? <h3>{label}</h3> : null}
    {children}
  </aside>
);

<MawyViewer value={document} directives={{ callout: Callout, youtube: YouTube }} />;
```

컴포넌트가 받는 것은 `name`, `attributes`, 이미 그려진 `label`, 컨테이너라면 이미 그려진 `children`, 그것이 쓰인 자리인 `range`, 그리고 쓰인 글자인 `source`입니다. 그래서 컴포넌트는 React 엘리먼트를 조립할 뿐 마크업 문자열을 볼 일이 없습니다. 확장 지점이 생겨도 안전 이야기가 그대로인 것이 그것입니다. 마크다운과 화면 사이에 여전히 `innerHTML`이 없고, 위험한 것을 그리는 디렉티브는 애플리케이션이 그것을 그린 것입니다.

:::

::: fw flutter

각 이름이 어떤 위젯이 되는지는 인자 하나입니다.

```dart
MawyViewer(
  value: document,
  directives: <String, MawyDirectiveBuilder>{
    'callout': (BuildContext context, MawyDirective directive) => Callout(
      kind: directive.attributes['kind'] ?? 'note',
      title: directive.label,
      children: directive.children!,
    ),
  },
);
```

빌더가 받는 것은 `name`, `attributes`, `InlineSpan`으로 이미 그려진 `label`, 컨테이너라면 위젯으로 이미 그려진 `children`, 그것이 쓰인 자리인 `range`, 그리고 쓰인 글자인 `source`입니다. 그래서 빌더는 위젯을 조립할 뿐 어떤 종류의 마크업도 볼 일이 없습니다. 텍스트 디렉티브는 문장 안에 `WidgetSpan`으로 놓이므로, 그 빌더는 글줄 위에 앉을 만한 것을 돌려주는 게 좋습니다.

:::

<MawyDemo name="viewer/directives" flutter="viewer/directives" :height="460" />

`{…}`는 이 문법을 쓰는 다른 곳과 똑같이 씁니다. `key=value`, `key="공백이 든 값"`, `#id`, `.a .b` — 각각 `id`와 `class`로 도착합니다 — 그리고 맨 `key`, 이것은 빈 문자열로 도착하며 플래그를 적는 방법입니다. 모든 값은 문자열입니다. 문서가 말한 것이 문자열뿐이기 때문입니다. 그것을 숫자로 읽는 것도, 없을 때 무슨 뜻인지 정하는 것도 컴포넌트의 몫입니다.

**아무도 맡지 않은 이름은 쓰인 글자 그대로 그려집니다.** 기본 `html` 정책에서 원시 HTML이 받는 것과 같은 답이고, 같은 이유입니다. 어떤 구성이 무슨 뜻인지 들은 적 없는 뷰어라면, 문서의 일부를 조용히 버리는 대신 작성자가 쓴 것을 보여주어야 합니다. 그리고 그것은 아무것도 잃지 않는 유일한 대비책이기도 합니다. 처리되지 않은 `::youtube{id=…}` 안에는 대신 보여줄 내용이라는 것이 아예 없습니다.

::: fw react

`wysiwyg` 화면에서 그 글자들은 **곧** 원문이고, 하나하나 그대로입니다. 그래서 맡지 않은 디렉티브도 쓰인 자리에서 그대로 편집됩니다.

:::

이 문법이 온 [`remark-directive`](https://github.com/remarkjs/remark-directive) 확장보다 여기서 좁은 규칙이 둘 있고, 둘 다 문서가 이미 말한 것을 바꾸지 않기 위한 것입니다.

- **콜론 바로 뒤에 이름이 옵니다.** 사이에 공백이 있는 `::: tip`은 늘 그랬듯 문단입니다. 이미 그렇게 컨테이너를 쓰고 있는 모든 문서가 여전히 뜻하는 것이 그것입니다.
- **인라인 디렉티브는 레이블이나 속성을 답니다.** `:name` 하나로는 디렉티브가 아니어서, 문장 속의 `Note:`나 `12:30`이나 `:warning:`은 정확히 그것들 그대로 남습니다.

확장이 읽는 나머지는 이것도 읽습니다. 그래서 한쪽을 위해 쓰인 문서를 다른 쪽이 읽습니다.

## 안전

뷰어는 실행하는 사람이 쓰지 않은 내용을 그립니다. 그래서 기본값이 안전한 쪽입니다.

::: fw react

**문서는 HTML 문자열이 아니라 React 엘리먼트가 됩니다.** 마크다운에서 화면까지 가는 길에 `innerHTML`이 없습니다. 파싱된 문서의 노드는 렌더러가 `case`로 다루는 엘리먼트만 될 수 있습니다. 이것은 이스케이프를 꼼꼼히 한 것이 아니라, 이스케이프할 것이 애초에 없는 것입니다. 훨씬 강한 말입니다.

:::

::: fw flutter

**문서는 무엇의 문자열도 아닌 위젯이 됩니다.** 마크다운에서 화면까지 가는 길에 마크업이 없습니다. 파싱된 문서의 노드는 렌더러가 `case`로 다루는 위젯만 될 수 있습니다. 이것은 이스케이프를 꼼꼼히 한 것이 아니라, 이스케이프할 것이 애초에 없는 것입니다. 훨씬 강한 말입니다.

:::

**모든 URL은 HTML 못지않게 마크다운에서도 검사합니다.** `[click](javascript:…)`은 HTML이 하나도 없는 순수 마크다운이므로, 스킴 허용 목록은 HTML 옵션의 일부가 아니고 그것과 함께 꺼지지도 않습니다. 거절된 대상은 작성자가 쓴 낱말 그대로, 링크 없이 그려집니다. 독자는 아무 일도 하지 않는 컨트롤 대신 문장을 봅니다.

::: fw flutter

**원시 HTML은 쓰인 글자 그대로 보이고, 다르게 만들 방법은 없습니다.** Flutter에는 그것을 그릴 HTML이 없으니 다른 것일 수가 없습니다. Flutter 패키지에 `html` 프롭이 아예 없는 이유가 그것입니다. 이 절의 나머지는 React 패키지의 것입니다.

**그리고 아무것도 열지 않습니다.** 탭한 링크는 `onLinkTap`으로 애플리케이션이 "연다"는 것이 무엇인지 말하기 전까지 아무 일도 하지 않습니다. URL을 플랫폼에 넘기는 것은 뷰어가 할 결정이 아닙니다. 스킴 허용목록은 이미 돌았고, 나머지는 여러분 몫입니다.

:::

::: fw react

**문서 안의 원본 HTML은 요청하기 전까지 아무 일도 하지 않습니다.** 그것을 바꿀 수 있는 프롭은 `html` 하나입니다.

| `html`                | 문서 안의 `<div>`는                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| `'escape'` _(기본값)_ | 쓰인 글자 그대로, 텍스트로 보입니다                                    |
| `'sanitize'`          | 진짜 `<div>`가 됩니다. 허용 목록 밖의 요소·속성·URL 스킴은 제거된 채로 |
| `'raw'`               | 진짜 `<div>`가 됩니다. 쓰인 그대로                                     |

`'sanitize'`는 정규식이 아니라 `DOMParser`로 파싱합니다. 의도적입니다. HTML의 오류 복구가 곧 공격면이고, `<img src=x onerror=alert(1)>`을 브라우저와 똑같이 해석하는 파서는 브라우저의 것뿐입니다. `DOMParser`가 없는 곳 — 서버 렌더링 — 에서는 추측하는 대신 마크업을 텍스트로 보여줍니다.

`'raw'`는 내용에 대한 책임을 호출자에게 넘깁니다. 이것을 켠 채 신뢰할 수 없는 마크다운을 그린 경우는 취약점 신고의 [범위 밖](https://github.com/jooy2/mawy/blob/main/SECURITY.md)입니다. 그것이 그 값의 문서화된 의미이기 때문입니다.

:::

## 툴바

툴바는 문서가 무엇을 말하는지가 아니라 문서가 어떻게 **조판되는지**에 대한 것입니다. 독자가 글자를 키우고, 숨 쉴 자리를 넓히고, 명조로 바꿔도 아래의 문서는 그대로입니다.

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

:::

<MawyDemo name="viewer/minimal" flutter="viewer/minimal" :height="360" />

::: fw react

`toolbar`는 전부를 뜻하는 `true`, 아무것도 없음을 뜻하는 `false`, 또는 그릴 컨트롤과 그릴 순서를 받습니다.

:::

::: fw flutter

`toolbar`는 리스트를 받습니다. 전부는 `kMawyViewerToolbar`, 아무것도 없음은 `const []`, 아니면 그릴 컨트롤과 그릴 순서.

:::

| 항목              | 하는 일                                 |
| ----------------- | --------------------------------------- |
| `'fontFamily'`    | 뷰어가 받은 글꼴들 — [아래](#글꼴) 참고 |
| `'fontSize'`      | 13~26픽셀                               |
| `'lineHeight'`    | 1.3~2.4                                 |
| `'letterSpacing'` | −0.04~0.16em                            |
| `'measure'`       | 본문이 뻗을 수 있는 폭                  |
| `'colorScheme'`   | 라이트, 다크, 또는 시스템 설정          |
| `'outline'`       | 제목 목록 패널을 엽니다                 |
| `'copy'`          | 마크다운 원문을 클립보드로              |
| `'open'`          | 파일 선택기                             |
| `'separator'`     | 가는 구분선. 긴 목록을 묶을 때          |

::: fw flutter

여기서 그것들은 `MawyViewerToolbarItem`의 값입니다 — 둘째 줄이라면 `MawyViewerToolbarItem.fontSize` — 그리고 `open` 하나가 빠진 같은 목록입니다. 이 패키지는 파일을 열지 않기 때문입니다.

:::

목록에 없는 컨트롤을 얹을 방법은 없습니다. 의도적입니다. 임의의 자식을 받는 툴바는 라이브러리가 더 이상 키보드로 다루게 만들어 줄 수 없는 툴바입니다.

::: fw react

이것은 버튼을 늘어놓은 줄이 아니라 진짜 `toolbar`입니다. Tab 한 번으로 들어가고 한 번으로 나옵니다. 안에서는 화살표 키와 `Home`·`End`가 컨트롤 사이를 옮깁니다. 키보드만 쓰는 독자는 열한 번이 아니라 두 번의 키 입력으로 문서에 닿아야 합니다.

:::

::: fw flutter

모든 컨트롤은 이름이 있고 눌린 상태를 말하는 `Semantics` 버튼입니다. 스크린 리더가 도형의 줄이 아니라 툴바를 읽습니다. 키보드 이동은 아직 만들어지지 않았습니다 — 아래 [접근성](#접근성)을 보세요.

:::

## 글꼴

기본으로 제공하는 것은 셋이고, 글꼴 이름이 아니라 역할입니다. `sans`·`serif`·`mono`, 독자의 기기에 이미 있는 것으로 그립니다. 내려받는 것이 없으니 실패할 것도 없습니다.

::: fw flutter

여기서는 그 셋이 전부입니다. `MawyFontFamily`에는 네 번째 값이 없고 값을 더할 `fonts` 목록도 없습니다. 이 절의 React 쪽이 말하는 두 가지 — 글꼴 카탈로그, 그리고 그중 하나를 처음 그리는 순간 받아오는 스타일시트 — 는 브라우저의 것이고, Flutter 애플리케이션은 자기가 싣는 글꼴을 뷰어가 만들어지기 훨씬 전에 `pubspec.yaml`에 적어 두기 때문입니다.

번들한 서체에 필요한 것은 이름이고, 그것이 `fontFamilyName`입니다.

```dart
MawyViewer(
  value: document,
  defaultTypography: const MawyTypography(
    fontFamily: MawyFontFamily.serif,
    fontFamilyName: 'Archive',
  ),
);
```

빼면 세 역할은 각각 플랫폼이 그 역할에 쓰는 것이 됩니다. 넣으면 이름을 댄 패밀리가 됩니다. 툴바가 뭐라고 부르고 셋 중 어느 것이 선택되어 있는지는 여전히 역할이 정하고, 실제로 무엇이 그려지는지를 `fontFamilyName`이 정합니다.

이 절의 나머지는 React 패키지의 것입니다.

:::

::: fw react

진짜 웹폰트는 프롭 하나 차이인데, 기본값이 아니라 프롭인 것은 의도적입니다. 뷰어는 남의 페이지 안에 들어가는 컴포넌트이고, 폰트 CDN에 스스로 연결을 여는 컴포넌트는 애초에 자기 것이 아닌 결정 — 프라이버시, 오프라인 동작, 그 페이지의 콘텐츠 정책이 거부할 수도 있는 요청 — 을 내린 것입니다. 그래서 목록은 라이브러리가 싣고, 승낙은 애플리케이션이 합니다.

```tsx
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';

<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />;
```

`MAWY_WEB_FONTS`의 모든 글꼴은 SIL Open Font License입니다. 상업적 사용과 임베딩, 재배포가 허용되므로 목록에 라이선스를 구매해야 하는 것은 없습니다.

|  |  |
| --- | --- |
| **고딕** | Inter, IBM Plex Sans, [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) |
| **명조** | Source Serif 4, Literata, Lora, EB Garamond |
| **고정폭** | JetBrains Mono |
| **한글** | Pretendard, Noto Sans KR, Noto Serif KR, 나눔명조, 고운돋움 |

한글 글꼴이 목록에 있는 것은 폴백에 맡기지 않기 위해서입니다. "글꼴 메뉴가 라틴 문자뿐"인 상태가 곧 한글 문서가 아무도 고르지 않은 서체로 조판되는 경로입니다.

필요해지기 전에는 아무것도 받지 않습니다. 문서가 이미 쓰고 있는 글꼴은 뷰어가 마운트될 때, 나머지는 글꼴 메뉴를 처음 열 때 도착합니다. 메뉴를 열 때 받아야 하는 이유도 분명합니다. 그 메뉴의 이름 하나하나가 자기 서체로 그려지기 때문입니다. 메뉴를 한 번도 열지 않는 독자는 아무것도 요청하지 않습니다.

직접 만든 목록도 같은 모양입니다.

```tsx
<MawyViewer
  value={document}
  fonts={[
    { id: 'sans' },
    { id: 'house', label: '사내 서체', stack: "'Sandoll', system-ui, sans-serif" },
    { id: 'archive', label: '아카이브', stack: "'Archive', serif", href: '/fonts/archive.css' }
  ]}
/>
```

`id`는 `typography.fontFamily`에 넣는 값입니다. `stack`의 기본값은 `var(--mawy-font-{id})`이고, 내장된 세 역할이 스타일시트의 소관으로 남는 것이 이 덕분입니다. `href`는 글꼴을 처음 그릴 때 한 번 받아오는 스타일시트입니다. 페이지가 이미 불러오는 글꼴이라면 빼면 됩니다.

:::

## 조판, 그리고 그 주인

::: fw react

모든 조판 값은 `--mawy-doc-*` 커스텀 속성으로 화면에 도달합니다. 그래서 들어가는 길이 둘이고, 둘은 같은 길입니다.

프롭으로 넣고, 뷰어가 갖고 있게 하거나,

```tsx
<MawyViewer
  value={document}
  defaultTypography={{ fontSize: 18, measure: 'wide' }}
  onTypographyChange={(typography) => localStorage.setItem('type', JSON.stringify(typography))}
/>
```

툴바를 아예 끄고 CSS로 직접 정하거나.

```css
.reader .mawy-md {
  --mawy-doc-size: 18px;
  --mawy-doc-line-height: 1.8;
}
```

`typography`에서 빠뜨린 항목은 기본값을 지킵니다. `{ fontSize: 18 }`은 부분적인 답이 아니라 완전한 답입니다.

문서의 줄 간격과 자간은 감싸는 컨테이너뿐 아니라 글자를 담은 요소에도 직접 선언됩니다. 사소해 보이지만 컨트롤이 동작하느냐 마느냐를 가르는 차이입니다. 상속된 값은 그 요소에 선언된 _어떤_ 값에도 집니다. 그래서 주변 페이지에 `article p { line-height: 28px }` 한 줄만 있어도 줄 간격 컨트롤은 독자가 볼 수 없는 숫자만 움직이게 됩니다.

:::

::: fw flutter

들어가는 길은 하나이고, 그것은 인자입니다. `MawyTypography`는 선택 항목의 묶음이 아니라 모든 항목에 기본값이 있는 클래스라서, 하나를 이름 대면 그것이 완전한 답이고 나머지는 있던 자리에 그대로 있습니다.

```dart
MawyViewer(
  value: document,
  defaultTypography: const MawyTypography(fontSize: 18, measure: MawyMeasure.wide),
  onTypographyChange: (MawyTypography typography) => save(typography),
);
```

`defaultTypography`는 뷰어를 어딘가에서 시작하게 하고 설정은 뷰어가 갖고 있게 둡니다. `typography`는 그것을 가져옵니다. 이것을 넘기면 툴바는 독자가 고른 것을 여전히 `onTypographyChange`로 알려주고, 애플리케이션이 새 값을 되돌려 주기 전까지는 아무것도 움직이지 않습니다. `onTypographyChange`는 어느 쪽이든 호출되므로, 독자의 선택을 기억하는 코드는 양쪽에서 같은 코드입니다.

이미 가진 설정에서 하나만 바꾸는 것은 `copyWith`입니다.

```dart
setState(() => _type = _type.copyWith(fontSize: 18));
```

크기는 CSS 픽셀이 아니라 논리 픽셀이고, 폭은 560·704·880입니다. 본문 16픽셀 기준으로 같은 세 단입니다.

:::

## 테마

::: fw flutter

팔레트는 [`MawyTokens`](../api/#mawytokens)이고, 스타일시트의 커스텀 속성을 Dart 이름으로 옮긴 것입니다. 값 하나까지 그대로여서 `accent`가 `--mawy-accent`이고 둘 다 `#5b34ea`입니다. `MawyTokens.light`과 `MawyTokens.dark`가 그 둘이며, 뷰어는 전역이 아니라 `colorScheme`에서 둘 중 하나를 고릅니다. 문서 하나가 밝은 화면 안에서 어두울 수 있는 것이 그 덕분입니다.

**뷰어가 자기 팔레트를 받지는 아직 못합니다.** 그런 인자가 없어서, 이 절의 React 쪽에 대응하는 것이 여기에는 없습니다. 오늘 이 export가 쓰이는 곳은 문서 옆에 자기 chrome을 그리면서 같은 색을 쓰고 싶은 애플리케이션입니다.

```dart
final MawyTokens tokens = MawyTokens.of(Theme.of(context).brightness);

Container(color: tokens.backgroundSunken, child: /* … */);
```

모서리 반경, 그리고 움직이는 모든 것이 쓰는 하나의 시간과 하나의 곡선에 대해서도 같은 생각이 `MawyRadius`와 `MawyMotion`입니다.

:::

::: fw react

뷰어가 그리는 모든 색은 `.mawy-root`에 선언된 `--mawy-*` 커스텀 속성이고, 하나를 다시 선언하는 것이 테마의 전부입니다.

```css
.mawy-root {
  --mawy-accent: #b8005c;
  --mawy-radius-lg: 4px;
}
```

`:root`가 아니라 `.mawy-root`에 있는 것은 의도적입니다. 컴포넌트 라이브러리가 문서 루트에 값을 쓸 일은 없고, `:root`에서 팔레트를 읽는 뷰어는 밝은 페이지 안에서 어두울 수 없습니다. 문서 하나를 끼워 넣을 때 흔히 원하는 것이 바로 그것인데도요.

:::

라이트와 다크 중 어느 팔레트를 쓸지는 `colorScheme`이 정하고, 따로 말하지 않으면 `system`입니다. `system`은 플랫폼이 이미 말하고 있는 것을 따릅니다 — 브라우저에서는 `prefers-color-scheme`, 앱에서는 플랫폼 밝기. `light`과 `dark`는 따르지 않습니다. 그래서 자체 스위치가 있는 애플리케이션은 그것으로 뷰어를 몰 수 있고, 어두운 기기를 쓰는 독자도 요청한 대로 밝은 문서를 받습니다.

## 페이지의 각 조각이 어디서 왔나

::: fw flutter

범위는 Dart 트리에도 있고, 같은 위치값입니다. 모든 `MdNode`가 하나씩 갖고 있고 텍스트 노드도 그렇습니다. 없는 것은 그것을 붙일 엘리먼트입니다. DOM이 없으니 범위는 화면에서 읽는 것이 아니라 [`parseMarkdown`](../api/#parsemarkdown)에서 읽는 것이고, 속성을 다루는 이 절의 나머지는 React 패키지의 것입니다.

:::

::: fw react

뷰어가 그린 모든 엘리먼트는 `data-mawy-range="start,end"`를 갖습니다. 넘겨받은 마크다운에서 그 조각의 첫 글자와 마지막 글자 다음의 위치입니다. 블록, 목록 항목, 표의 행과 셀, 그리고 그 안의 인라인 엘리먼트 — 강조, 링크, 코드 스팬, 이미지까지.

코드 블록은 두 번 말합니다. 바깥의 상자는 펜스와 정보 문자열과 들여쓰기까지 통째로를, 안의 `code` 엘리먼트는 코드만을 가리킵니다. 커서가 있을 수 있는 것은 뒤쪽이고, 펜스 사이에 아무것도 없어도 여전히 자리입니다. 그때는 두 위치가 같은 수입니다.

`# Title`, 빈 줄, `## Second` 이렇게 쓰인 문서라면 두 번째 제목은 이렇게 그려집니다.

```html
<h2 id="second" class="mawy-md-heading" data-mawy-range="9,18">Second</h2>
```

범위가 돌아가는 유일한 길이기 때문에 있습니다. 화면의 어떤 자리에서 그것이 그려져 나온 문서의 자리로. 에디터의 `split`은 이것을 두 번 읽습니다. 원문 맨 위 줄이 속한 블록으로 미리보기를 스크롤할 때, 그리고 미리보기에서 클릭한 단어로 커서를 옮길 때. 애플리케이션도 같은 종류의 일에 쓸 수 있습니다 — 문단에 달린 댓글, 제목 옆의 "이 절 편집" 버튼. 오프셋은 넘긴 문자열을 UTF-16 코드 유닛으로 직접 가리키므로, `value.slice(start, end)`가 곧 클릭된 것 뒤의 마크다운입니다.

화면에서 범위가 붙지 않는 것은 텍스트 하나뿐입니다. 속성을 담을 자리가 없어서요. 그럴 필요도 없습니다. 텍스트 한 줄기는 양옆의 엘리먼트로 둘러싸여 있고, 그 사이에서 원문을 찾기에는 그것으로 충분합니다. `**bold**`로 그려진 `<strong>` 안에서 `bold`가 있는 자리는 그 여덟 글자 중 정확히 한 곳입니다.

:::

## 접근성

::: fw react

- 툴바는 탭 정지점이 하나이고 안에서는 화살표로 움직이는 `toolbar`입니다.
- 모든 아이콘 버튼에 이름이 있습니다. "버튼"이라고만 읽히는 것은 없습니다.
- 메뉴는 `Escape`로 닫히고, 열었던 컨트롤로 포커스를 돌려줍니다.
- 목차 항목을 따라가면 스크롤뿐 아니라 포커스도 함께 갑니다. 다음 `Tab`이 패널이 아니라 제목에서 이어집니다.
- 코드 블록의 복사 버튼은 포인터나 포커스가 닿기 전까지 보이지 않지만, 레이아웃에서 빠지지는 않습니다. 레이아웃에 없는 버튼은 `Tab`이 지나쳐 버리는 버튼입니다.
- `prefers-reduced-motion`에서는 애니메이션을 뺍니다.

:::

::: fw react

모든 화면을 바뀔 때마다 [axe](https://github.com/dequelabs/axe-core)로 훑습니다. 문서를 띄운 뷰어와 파일 선택 상태의 뷰어, 에디터의 네 가지 모드, 목차를 연 상태, 메뉴를 연 상태, 찾기/바꾸기를 연 상태를 각각 두 팔레트 모두에서. 거기서 나온 것이 위 목록에 이미 들어 있습니다. 체크 목록의 체크박스는 옆줄이 이름이 되고, 팔레트에서 가장 옅은 글자색은 두 배경 모두에서 AA를 넘도록 올렸고, 편집 화면은 `article`이 아니라 `div`입니다. ARIA는 문서 구획이 `textbox`가 되는 것을 허용하지 않기 때문입니다. 각주에서 본문으로 돌아가는 링크에는 밑줄이 생겼습니다. 색만으로 구분되던 링크였습니다.

자동 검사는 천장이 아니라 바닥입니다. 그 위의 것들 — 툴바 안의 화살표 이동, 목차 항목을 따라간 뒤 포커스가 가는 자리 — 은 같은 테스트 모음에서 하나씩 확인합니다.

:::

::: fw flutter

- 모든 컨트롤은 이름이 있는 `Semantics` 버튼이고, 토글하는 것은 상태도 말합니다. 스크린 리더가 도형의 줄이 아니라 툴바를 읽습니다.
- 제목·링크·이미지는 문서 안에서 각자의 시맨틱을 들고 있고, 목차 항목을 따라가면 그것이 가리키는 제목으로 스크롤합니다.
- 글자 크기는 플랫폼의 크기 설정을 따릅니다. 크기가 어딘가에 박혀 있지 않고 `MawyTypography`를 통과하는 논리 픽셀이기 때문입니다.

React 패키지에 있고 여기에는 아직 없는 것 셋, 그리고 그것이 정직한 목록입니다. 툴바 안의 키보드 이동, 메뉴를 닫는 `Escape`, 그리고 플랫폼의 모션 줄이기 설정에서 애니메이션이 빠지는 것.

:::

## 인쇄

종이 위의 뷰어는 문서이고 그 외에는 아무것도 아닙니다. 툴바도, 목차도, 상태 표시줄도, 찾기 상자도 전부 누르는 것이고 종이는 눌리지 않습니다. 그래서 그중 무엇도 인쇄되지 않고, 각주에서 본문으로 돌아가는 링크도 마찬가지입니다.

::: fw react

나머지 셋은 화면이 아니라 페이지에 관한 것입니다. 높이를 받은 뷰어는 그 안에서 스크롤하는데, 높이가 있는 상자는 한 상자 분량만 인쇄하고 나머지를 잃습니다. 종이 위에서는 문서만큼 깁니다. 팔레트는 독자가 무엇을 골랐든 밝은 바탕에 어두운 글자가 됩니다. 어두운 테마를 인쇄하면 흰 글자를 두른 잉크 사각형이기 때문입니다. 그리고 링크의 목적지는 링크 뒤에 적힙니다. 아무것도 가리키지 않는 "문서를 보세요"는 요점을 잃은 문장이니까요.

에디터에서는 그려진 문서가 인쇄됩니다. `split`에서는 원문 창이 비켜서고, 그려진 문서가 없는 `plain`에서는 원문이 `<textarea>`가 아니라 글자로 인쇄됩니다. textarea는 자기 상자 안에 있는 것만 페이지에 얹고 나머지 파일을 잃습니다.

켤 것은 없습니다. 이미 가져다 쓰는 스타일시트 안의 `@media print`이므로, 뷰어가 있는 페이지에서 `Ctrl`+`P`를 누르면 그대로 동작합니다.

:::

::: fw flutter

인쇄는 패키지가 아니라 플랫폼의 몫입니다. 앱은 플러그인이나 운영체제의 시트를 통해 인쇄하고, 넘기는 것은 페이지가 아니라 위젯 트리입니다. 이 절은 React 패키지의 것입니다.

:::
