---
title: 비교
order: 2
---

# 다른 에디터와 비교

웹 애플리케이션이 흔히 고르는 마크다운 에디터들과 Mawy가 어디서 갈라지는지, 그리고 그 에디터들이 하는 일 중 Mawy가 하지 않는 것은 무엇인지 적었습니다.

이 페이지는 Toast UI Editor 3.2.2, MDXEditor 4, Milkdown 7, `@uiw/react-md-editor` 4, Tiptap 3, BlockNote 0.54를 보고 썼습니다. 모두 계속 바뀌는 프로젝트이고 여기는 그 프로젝트의 문서가 아니므로, 결정을 좌우할 항목은 각 프로젝트의 문서에서 다시 확인하세요. 아래의 차이가 빠뜨린 기능이 아니라 결정인 경우에는 그 이유를 해당 코드 옆에 적어 두었습니다. [에디터](./guide/editor)와 [뷰어](./guide/viewer) 문서에 있습니다.

## 이 페이지에 오른 에디터

| 에디터 | 무엇인가 | 기반 | 선언한 의존성 |
| --- | --- | --- | --- |
| **Mawy**<br>`mawy-react` | 마크다운 문자열 하나 위의 뷰어와 에디터 | 자체 파서와 렌더러 | 1개 |
| **Toast UI Editor**<br>`@toast-ui/editor` | 위지윅 화면, 마크다운 화면, 별도의 뷰어 | ProseMirror | 8개 |
| **MDXEditor**<br>`@mdxeditor/editor` | 마크다운과 MDX를 위한 위지윅 에디터 | Lexical, CodeMirror, mdast | 57개 |
| **Milkdown**<br>`@milkdown/kit`, `@milkdown/crepe` | 플러그인으로 조립하는 위지윅 에디터. Crepe는 조립해 둔 것 | ProseMirror, remark | 21개와 17개 |
| **react-md-editor**<br>`@uiw/react-md-editor` | 미리보기를 옆에 둔 textarea | remark, rehype | 4개 |
| **Tiptap**<br>`@tiptap/react`, `@tiptap/markdown` | 헤드리스 리치 텍스트 에디터. 마크다운은 가장자리에서 읽고 씀 | ProseMirror | 3개 |
| **BlockNote**<br>`@blocknote/react` | Notion 같은 블록 에디터 | Tiptap을 거쳐 ProseMirror | 9개 |

BlockNote만 MPL-2.0이고 나머지는 전부 MIT입니다.

의존성 개수는 각 패키지가 선언한 수이지 실제로 설치되는 수가 아닙니다. `@tiptap/react`는 셋을 선언하고 ProseMirror는 peer로 받습니다. 그래도 표에 올린 이유는 벤치마크에 동의해야 읽을 수 있는 숫자가 아니라서이고, 에디터와 함께 설치되는 패키지는 애플리케이션이 고른 적 없는 패키지이기 때문입니다.

Toast UI Editor만 사정이 다릅니다. 저장소가 아카이브되었고 마지막 릴리스 3.2.2는 2023년 2월입니다. 그래도 올린 이유는, 상류가 멈춘 에디터야말로 옮길 이유가 있는 에디터이고 이것이 아직 한 달에 수십만 번 내려받히기 때문입니다. 멈췄다고 해서 하던 일이 틀린 것은 아닙니다.

## 한눈에 보기

`✓`는 패키지에 들어 있는 것, `✕`는 들어 있지 않은 것, `—`는 해당하지 않는 항목입니다. 표시보다 한 단어가 정확한 자리에는 단어를 적었습니다. 모든 줄은 설치한 그대로의 패키지 기준입니다. 남이 만든 플러그인도, README의 예제도 체크가 아닙니다.

**Tiptap과 BlockNote는 아래 네 표에 없습니다.** 에디터라기보다 툴킷이라서 대부분의 줄이 "익스텐션을 붙이면"으로 답해야 하고, 그것을 체크로 적으면 패키지가 하지 않는 말을 하게 됩니다. Mawy 칸은 `mawy-react` 기준이고, Flutter 패키지가 다른 부분은 [시작하기](./guide/getting-started)와 [에디터](./guide/editor)에 적혀 있습니다.

### 화면

|                                | Mawy | Toast UI | MDXEditor | Milkdown | react-md-editor |
| ------------------------------ | :--: | :------: | :-------: | :------: | :-------------: |
| 그려진 문서를 그 자리에서 편집 |  ✓   |    ✓     |     ✓     |    ✓     |        ✕        |
| 마크다운 원문을 편집           |  ✓   |    ✓     |     ✓     |    ✕     |        ✓        |
| 둘을 나란히                    |  ✓   |    ✓     |     ✕     |    ✕     |        ✓        |
| 화면을 바꿔도 변환하지 않음    |  ✓   |    ✕     |     ✕     |    —     |        ✓        |
| 전용 읽기 전용 뷰어            |  ✓   |    ✓     |     ✕     |    ✕     |        ✓        |
| 자바스크립트 없는 게시 페이지  |  ✓   |    ✕     |     ✕     |    ✕     |        ✕        |

### 읽는 문법

|                             | Mawy | Toast UI | MDXEditor | Milkdown | react-md-editor |
| --------------------------- | :--: | :------: | :-------: | :------: | :-------------: |
| 표                          |  ✓   |    ✓     |     ✓     |    ✓     |        ✓        |
| 태스크 목록                 |  ✓   |    ✓     |     ✓     |    ✓     |        ✓        |
| 취소선                      |  ✓   |    ✓     |     ✓     |    ✓     |        ✓        |
| 각주                        |  ✓   |    ✕     |     ✕     |    ✓     |        ✓        |
| GitHub 알림 `> [!NOTE]`     |  ✓   |    ✕     |     ✕     |    ✕     |        ✓        |
| 정의 목록                   |  ✓   |    ✕     |     ✕     |    ✕     |        ✕        |
| 프런트매터를 문서에서 빼냄  |  ✓   |    ✓     |     ✓     |    ✕     |        ✕        |
| 디렉티브 `:::name[label]`   |  ✓   |    ✕     |     ✓     |    ✕     |        ✕        |
| 제목에 직접 쓴 `{#id}`      |  ✓   |    ✕     |     ✕     |    ✕     |        ✕        |
| 수식                        |  ✕   |    ✕     |     ✕     |    ✓     |        ✕        |
| MDX와 JSX                   |  ✕   |    ✕     |     ✓     |    ✕     |        ✕        |
| 패키지에 든 코드 하이라이터 |  ✓   | 플러그인 |     ✓     | 플러그인 |        ✓        |

### 편집

|                         | Mawy | Toast UI | MDXEditor | Milkdown | react-md-editor |
| ----------------------- | :--: | :------: | :-------: | :------: | :-------------: |
| 툴바                    |  ✓   |    ✓     |     ✓     |    ✓     |        ✓        |
| 슬래시 메뉴             |  ✕   |    ✕     |     ✕     |    ✓     |        ✕        |
| 블록을 잡고 끄는 손잡이 |  ✕   |    ✕     |     ✕     |    ✓     |        ✕        |
| 올린 이미지를 받는 훅   |  ✓   |    ✓     |     ✓     |    ✓     |        ✕        |
| 에디터 안에서 찾기      |  ✓   |    ✕     |     ✓     |    ✕     |        ✕        |
| 파일 열기와 저장        |  ✓   |    ✕     |     ✕     |    ✕     |        ✕        |
| 단어와 글자 세기        |  ✓   |    ✕     |     ✕     |    ✕     |      콜백       |
| 협업 편집               |  ✕   |    ✕     |     ✕     |    ✓     |        ✕        |

### 문서 둘레

|                           | Mawy | Toast UI  | MDXEditor | Milkdown | react-md-editor |
| ------------------------- | :--: | :-------: | :-------: | :------: | :-------------: |
| 문서의 아웃라인           |  ✓   |     ✕     |     ✕     |    ✕     |        ✕        |
| 읽는 사람이 조판을 정함   |  ✓   |     ✕     |     ✕     |    ✕     |        ✕        |
| 패키지에 든 다크 테마     |  ✓   |     ✓     |     ✓     |    ✓     |        ✓        |
| 다른 언어로 된 인터페이스 |  둘  | 스무 개쯤 |   함수    | 문구마다 |     중국어      |
| 기본값이 원시 HTML을 거부 |  ✓   |   정제    |     ✕     |    ✕     |        ✕        |
| Flutter 패키지            |  ✓   |     ✕     |     ✕     |    ✕     |        ✕        |
| 선언한 의존성             | 1개  |    8개    |   57개    |   21개   |       4개       |

## 문서가 어디에 있는가

나머지 차이는 전부 여기서 나옵니다.

**Mawy에서는 마크다운 문자열이 곧 문서입니다.** `plain`과 `split`, `preview`, `wysiwyg`는 그 문자열을 보는 네 가지 방법이고, 전환은 다른 화면을 마운트할 뿐 무엇도 변환하지 않습니다. 패키지 안에 직렬화기가 없고, 그려진 문서 뒤에 두 번째 모델도 없습니다. 위지윅 화면의 키 입력은 일단 거부되고, 마크다운에 대한 편집으로 바뀌고, 문서는 그렇게 바뀐 마크다운에서 다시 그려집니다. 그대로 들어온 파일은 그대로 나갑니다. 목록을 어느 기호로 썼는지까지 그대로입니다.

**다른 에디터에서는 모델이 문서이고 마크다운은 오갈 때 변환하는 형식입니다.** 각자의 API가 그렇게 말합니다.

- Toast UI Editor에는 `beforeConvertWysiwygToMarkdown` 훅과 `customMarkdownRenderer` 옵션이 있습니다. 위지윅 화면을 떠날 때 문서를 변환하기 때문입니다.
- MDXEditor의 `onChange`는 두 번째 인자 `initialMarkdownNormalize`를 함께 넘깁니다. 처음 건넨 마크다운이 달라져서 돌아올 때를 알리는 값입니다. 그 API 문서는 이유를 "additional whitespace, bullet symbols different than the configured ones"라고 적었습니다. 출력 형식은 `toMarkdownOptions`에서 정합니다.
- Milkdown의 `getMarkdown()`은 ProseMirror 문서를 remark로 직렬화합니다.
- BlockNote는 메서드 이름 자체가 `blocksToMarkdownLossy`입니다.

`@uiw/react-md-editor`는 예외입니다. `textarea`라서 값이 곧 마크다운이고, Mawy와는 다른 데서 갈라집니다. 이쪽 미리보기는 같은 문자열을 remark와 rehype로 한 번 더 그린 결과이지 에디터가 글을 쓰는 화면이 아닙니다.

**모델은 문자열이 살 수 없는 것을 삽니다.** 마크다운에 표기법이 없는 노드, 손잡이를 잡고 끄는 블록, 그 블록을 넣는 슬래시 메뉴, 그리고 협업 편집이 그렇습니다. 마지막 항목은 공유할 문자열이 아니라 병합할 공유 문서를 필요로 합니다. Milkdown과 Tiptap, BlockNote는 모두 [Yjs](https://yjs.dev)로 그것을 합니다. Mawy에는 하나도 없고, 그 없음은 각각 위의 결정에서 따라 나온 결과이지 아무도 손대지 못한 일이 아닙니다.

## 문서를 읽기만 할 때

편집하지 않는 사람에게 문서를 보여주는 애플리케이션에는 렌더러도 필요하고, 그 렌더러는 에디터와 같은 문서를 같게 읽어야 합니다.

| 에디터 | 완성된 문서를 그리는 것 |
| --- | --- |
| **Mawy** | [`MawyViewer`](./api/components/mawy-viewer). 에디터가 미리보기에 쓰는 바로 그 렌더러입니다. 자바스크립트를 내려보내지 않는 페이지에는 [`MawyDocument`](./api/components/mawy-document) |
| **Toast UI Editor** | 같은 패키지를 따로 빌드한 `Viewer` |
| **MDXEditor** | `readOnly`. 다만 읽기만 하는 내용에는 쓰지 말고 다른 렌더러를 쓰라고 자체 문서가 권합니다 |
| **Milkdown** | 에디터에 `setReadonly(true)` |
| **react-md-editor** | `MDEditor.Markdown`, 즉 `@uiw/react-markdown-preview` |
| **Tiptap**, **BlockNote** | 편집을 끈 에디터, 또는 정적 렌더러 |

Mawy에서 둘이 한 라이브러리인 것은 의도입니다. 뷰어와 에디터의 미리보기는 같은 파스 트리를 읽는 같은 코드라서, 쓰는 동안의 문서와 게시한 뒤의 문서가 다른 말을 할 수 없습니다.

## 서버에서 그릴 때

`mawy-react/server`의 `MawyDocument`는 문서를 HTML로 그리고 그에 필요한 자바스크립트는 내려보내지 않습니다. 블로그 글이나 문서 페이지가 원하는 동작입니다. [게시하기](./guide/publishing)에 있습니다.

MDXEditor는 서버 렌더링을 지원하지 않는다고 명시하고, Next.js 페이지에 필요한 `ssr: false` 동적 임포트를 함께 보여 줍니다. `@uiw/react-md-editor`도 같은 임포트를 안내합니다. Toast UI Editor와 Milkdown은 엘리먼트를 받아 생성하므로 브라우저가 먼저 있어야 합니다.

## 문서 안의 원시 HTML

다른 데서 온 마크다운 문서에는 HTML이 섞여 있기 마련이고, 그 HTML을 어떻게 할지는 렌더링이 아니라 안전에 관한 결정입니다.

| 에디터 | 원시 HTML 처리 |
| --- | --- |
| **Mawy** | [`html`](./api/types/html-policy)이 정합니다. 기본값 `escape`는 쓰인 문자 그대로 그리고, `sanitize`는 안전하다고 증명되는 것만, `raw`는 전부 그립니다 |
| **Toast UI Editor** | 함께 설치되는 DOMPurify로 정제해 그립니다. `customHTMLSanitizer`로 교체합니다 |
| **MDXEditor** | HTML을 자체 노드로 읽습니다. `suppressHtmlProcessing`으로 끕니다 |
| **Milkdown** | 프리셋과 추가한 플러그인이 정합니다 |
| **react-md-editor** | 그립니다. 작성자를 완전히 믿지 못한다면 `rehype-sanitize`를 직접 추가하라고 README가 안내합니다 |

Mawy가 `escape`를 기본값으로 둔 이유는 두 가지입니다. 뷰어는 대개 남이 쓴 문서를 보여주고, 안전한 기본값은 아무도 기억하지 않아도 되는 기본값입니다. DOM 없이 `sanitize`가 무엇까지 그리는지, 그 목록이 왜 그렇게 짧은지는 [안전](./guide/viewer#안전)에 있습니다.

## 스타일과 인터페이스 언어

Mawy가 그리는 모든 것은 `.mawy-root`에 선언된 `--mawy-*` 커스텀 프로퍼티를 지나갑니다. 그래서 테마는 선택자 싸움이 아니라 토큰 재선언이고, 밝은 페이지 안에서 에디터 하나만 어둡게 둘 수 있습니다. [테마](./api/theming)가 그 전부입니다.

다른 에디터는 스타일시트를 가져와 덮어쓰는 방식입니다. Toast UI Editor는 다크 테마 파일과 `theme` 옵션을, `@uiw/react-md-editor`는 상위 요소의 `data-color-mode` 속성을, Milkdown의 Crepe는 골라 쓰는 테마 파일 몇 개를 제공합니다.

인터페이스 자체의 언어는 여기서 `locale`과 `strings`이고, 함께 배포되는 언어는 영어와 한국어입니다. **이 항목은 Toast UI Editor가 앞섭니다.** 스무 개쯤 되는 언어를 함께 배포하고 `Editor.setLanguage`로 더 받습니다. MDXEditor는 `translation` 함수를 받고, `@uiw/react-md-editor`는 중국어 커맨드 세트를 따로 배포합니다.

## 브라우저와 앱

Mawy는 패키지 둘입니다. npm의 `mawy-react`와 pub.dev의 [`mawy`](https://pub.dev/packages/mawy)입니다. 파서 하나, 문서 모델 하나, 팔레트 하나를 공유하고, 저장소의 모든 마크다운 파일에 대해 두 파서의 트리를 매번 diff합니다. 이 페이지의 다른 에디터는 전부 웹 라이브러리입니다.

같은 문서를 웹에서도 읽고 앱에서도 읽는다면 이것이 중요합니다. 그렇지 않다면 아무 값어치도 없습니다.

## 크기

::: fw react

| 가져오는 것             | gzip    |
| ----------------------- | ------- |
| `MawyViewer`            | 33.6 kB |
| `MawyEditor`            | 79.4 kB |
| `mawy-react/markdown`   | 12.5 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 7.6 kB  |

배포 파일을 실제로 번들해서 잰 값입니다. React는 제외하고 `lucide-react`는 포함했으며, `packages/react/size-budget.json`에 기록해 두고 초과하는 변경은 CI가 떨어뜨립니다. 문서를 읽기만 하는 페이지는 에디터를 내려받지 않습니다.

다른 에디터의 숫자를 적은 표는 없습니다. 이 에디터들은 저마다 조립해서 쓰는 물건이라서 — Milkdown은 어떤 플러그인을 썼는지로, MDXEditor는 어떤 플러그인을 넘겼는지로, Tiptap은 어떤 익스텐션을 등록했는지로 — 하나의 숫자를 적으면 그것은 그 중 한 조합의 숫자일 뿐입니다. 실제로 배포할 구성을 직접 재세요.

:::

::: fw flutter

앱 번들은 페이지처럼 재지 않고, 이 페이지의 에디터는 전부 웹 라이브러리입니다. React 패키지의 수치는 React 스위치 아래에 있고, 이 패키지에서 확인할 숫자는 아이콘 폰트의 3 MB 하나입니다. [시작하기](./guide/getting-started#번들-크기)에 적어 두었습니다.

:::

## Mawy가 하지 않는 일

옮긴 뒤가 아니라 옮기기 전에 읽을 목록입니다.

- **MDX와 JSX를 읽지 않습니다.** 문서 안에 컴포넌트를 넣어야 한다면 그 일은 MDXEditor의 것입니다.
- **협업 편집이 없습니다.** 병합할 공유 문서가 없고 문자열만 있습니다.
- **블록 손잡이와 슬래시 메뉴가 없습니다.** Crepe와 BlockNote는 그것을 중심에 두고 만든 에디터입니다.
- **수식과 다이어그램이 없습니다.** Crepe에는 LaTeX 기능이 있고, `@uiw/react-md-editor`는 KaTeX와 Mermaid를 붙이는 예제를 문서에 둡니다.
- **새 문법을 추가하는 플러그인 체계가 없습니다.** 확장 지점은 [디렉티브](./guide/viewer#디렉티브)입니다. 파서가 모양을 읽고 애플리케이션이 그립니다. 파서가 읽지 않는 문법은 밖에서 더할 수 없습니다.
- **인터페이스 언어는 둘**, 영어와 한국어입니다. 나머지는 `strings`로 넣습니다.
- **Flutter 패키지에는 이미지 업로드가 없습니다.** 파일을 고르는 일은 위젯이 아니라 플러그인의 몫입니다. React 패키지에는 [`onUploadImage`](./api/components/mawy-editor#이미지)가 있습니다.

## 여기서 옮겨오기

[옮겨오기](./migrate/)에 Toast UI Editor와 MDXEditor, Milkdown, `@uiw/react-md-editor` 각각의 문서가 있습니다. 옵션이 무엇으로 바뀌는지, 이미 데이터베이스에 있는 문서는 어떻게 되는지, 여기에 대응이 없는 것은 무엇인지를 적었습니다.
