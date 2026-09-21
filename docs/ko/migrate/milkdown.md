---
title: Milkdown에서
order: 3
---

# Milkdown에서 옮겨오기

Milkdown 플러그인으로 조립한 에디터나 Crepe가 Mawy에서 무엇이 되는지 적었습니다.

Milkdown 7의 `@milkdown/kit`과 `@milkdown/crepe`를 보고 썼습니다. 네 경우 중 변화가 가장 큽니다. Milkdown은 툴킷이고 이쪽은 컴포넌트라서, 한쪽에는 플러그인 목록이 있고 다른 쪽에는 프롭이 있습니다. 문서도 저쪽에서는 ProseMirror 문서이고 여기서는 마크다운 문자열입니다.

**협업 편집을 쓰고 있다면 Milkdown에 남으세요.** `@milkdown/plugin-collab`은 ProseMirror 문서를 Yjs 문서에 묶고, 편집을 병합하려면 공유 문자열이 아니라 공유 문서가 있어야 합니다. 여기에는 그것이 없습니다.

::: fw flutter

Milkdown은 웹 라이브러리라 Flutter 애플리케이션 안에서 옮겨올 것은 없습니다. 문서는 그대로 넘어옵니다. 파서가 두 패키지에서 같고 변경마다 diff하며, 이 패키지에 없는 화면은 `wysiwyg` 하나입니다. 이유는 [에디터](../guide/editor)에 있습니다.

:::

## 컴포넌트

```tsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';

function Editable() {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, document);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => save(markdown));
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
  );

  return <Milkdown />;
}

<MilkdownProvider>
  <Editable />
</MilkdownProvider>;
```

이것이

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue={document} onChange={save} />;
```

이렇게 됩니다. 프로바이더와 훅, 컨텍스트가 함께 사라집니다. CommonMark와 GitHub의 확장은 파서가 읽는 것이라 `use`할 프리셋이 없고, `listenerCtx.markdownUpdated`가 `onChange`입니다.

Crepe에서 오는 경우도 모양은 같습니다.

```tsx
const crepe = new Crepe({ root, defaultValue: document });
crepe.on((listener) => listener.markdownUpdated((_, markdown) => save(markdown)));
await crepe.create();
```

`create`와 `destroy`는 마운트에 속하고 그것은 React가 이미 합니다. `crepe.getMarkdown()`은 이미 쥐고 있는 상태입니다.

## 플러그인과 기능

| Milkdown | Mawy |
| --- | --- |
| `commonmark`, `gfm` 프리셋 | — 파서가 언제나 읽습니다 |
| `listener` | `onChange`, `onModeChange`, `onColorSchemeChange` |
| `history` | — 되돌리기가 들어 있습니다. [되돌리기](../guide/editor#되돌리기) |
| `clipboard` | — [붙여넣기](../guide/editor#붙여넣기)가 들어 있습니다 |
| `indent` | — `Tab`이 줄이나 선택을 들여씁니다. [들여쓰기](../guide/editor#들여쓰기) |
| `upload` | [`onUploadImage`](../api/components/mawy-editor#이미지) |
| `prism`, `Crepe.Feature.CodeMirror` | [`highlight`](../api/functions/mawy-highlighter), 그리고 언어를 고르는 블록 위의 바 |
| `tooltip`, `Crepe.Feature.Toolbar` | — 툴바는 선택 위에 뜨는 것이 아니라 위나 아래 끝의 바 하나입니다 |
| `slash`, `block`, `Crepe.Feature.BlockEdit` | — 슬래시 메뉴도 블록 손잡이도 없습니다 |
| `Crepe.Feature.LinkTooltip` | — [링크 옆의 바](../guide/editor#문서-편집-화면)가 같은 일을 합니다 |
| `Crepe.Feature.ImageBlock` | — 그림은 `![alt](url)`이고, 주소와 설명을 다루는 바가 옆에 뜹니다 |
| `Crepe.Feature.Table` | — 표를 읽고 그리며, 쓰고 있는 행 가까이에 바가 뜹니다 |
| `Crepe.Feature.Placeholder` | `placeholder` |
| `Crepe.Feature.Latex` | — 수식이 없습니다 |
| `Crepe.Feature.AI`, `Crepe.Feature.TopBar` | — 없습니다 |
| `emoji` | — `:smile:`은 쓰인 문자 그대로입니다 |
| `collab` | — 협업 편집이 없습니다 |
| `trailing` | — 그려진 화면은 커서가 갈 데가 없는 자리에 문단을 엽니다 |

## 설정

| Milkdown | Mawy |
| --- | --- |
| `ctx.set(rootCtx, element)` | — React 컴포넌트입니다 |
| `ctx.set(defaultValueCtx, md)` | `defaultValue`, 문서를 애플리케이션이 쥔다면 `value` |
| `listenerCtx.markdownUpdated` | `onChange` |
| `editor.action(getMarkdown())` | 문서는 이미 애플리케이션의 상태입니다 |
| `crepe.setReadonly(true)` | `readOnly` |
| `editorViewOptionsCtx` | — 편집 화면이 ProseMirror 뷰가 아닙니다 |
| `@milkdown/theme-nord`, Crepe의 테마 파일 | [`--mawy-*` 토큰](../api/theming)과 `mawy-react/styles.css` |
| 직접 만든 `$node`, `$mark`, `$view` | `:::name[label]{key=value}`로 쓰는 문법이라면 [`directives`](../guide/viewer#디렉티브) |

Crepe의 `theme/common/style.css`와 `frame`, `classic`, `nord` 중 하나가 빠지고 한 줄이 들어갑니다.

```css
@import 'mawy-react/styles.css';
```

## 얻는 것

Milkdown은 문서를 그리고, 글을 쓰는 방법은 그것 하나입니다. 여기서는 같은 문서에 화면이 넷입니다. 그려진 문서, 마크다운 원문, 둘을 나란히, 그리고 미리보기입니다. 전환은 아무것도 변환하지 않습니다. 넷 다 같은 문자열을 보는 방법이기 때문입니다. [에디터](../guide/editor)가 그 전부입니다.

완성된 문서에도 편집을 끈 에디터가 아니라 전용 컴포넌트 [`MawyViewer`](../api/components/mawy-viewer)가 있고, [`MawyDocument`](../api/components/mawy-document)는 그것을 서버에서 그리면서 자바스크립트를 내려보내지 않습니다.

## 문서

Milkdown은 저장할 때마다 문서를 remark로 다시 써냅니다. 데이터베이스에 있는 것은 작성자의 표기가 아니라 remark의 표기입니다. 이미 벌어진 일이라 되돌릴 수 없고, 여기서 다시 고쳐 쓰지는 않습니다.

실제 문서를 열고 확인할 것이 셋 있습니다.

- **직접 추가한 노드.** `$node`는 마크다운에 무언가를 써넣었고, 여기서 그 문법은 애플리케이션이 그리는 디렉티브이거나 그냥 텍스트입니다. 쓰던 에디터를 걷어내기 전에 그 문서를 찾아 두세요.
- **수식.** Crepe의 Latex 기능을 켜 두었다면 `$...$`는 여기서 쓰인 문자 그대로입니다.
- **원시 HTML.** 기본 정책 `escape`에서는 문자 그대로 그립니다. 그려져야 하는 문서라면 `html="sanitize"`를 넘기고, 브라우저 없이 무엇이 그려지는지 [안전](../guide/viewer#안전)에서 읽으세요.
