---
title: MawyEditor
order: 2
---

# `MawyEditor`

뷰어를 옆에 둔 마크다운 에디터입니다. [에디터](../../guide/editor)를 보세요.

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue="# 안녕하세요" onChange={save} />;
```

`children`과 `onChange`를 뺀 `<div>`의 모든 프롭을 받아 그대로 넘깁니다. `ref`는 가장 바깥 엘리먼트에 닿습니다.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyEditor(defaultValue: '# 안녕하세요', onChange: save);
```

뷰어와 마찬가지로 `package:flutter/widgets.dart`만으로 만들었고, 문서를 건네받지 않으면 직접 문서를 소유합니다.

:::

## 문서

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 문서. 애플리케이션이 주인일 때. |
| `defaultValue` | `string` | `''` | 에디터가 문서를 직접 가질 때, 시작할 문서. |
| `onChange` | `(value: string) => void` | — | 모든 변경. 제어 여부와 무관하게. |
| `readOnly` | `boolean` | `false` | 읽고 선택하고 복사하는 것은 그대로 됩니다. |
| `placeholder` | `string` | 로케일에 맞는 안내문 | 문서가 비어 있는 동안 보입니다. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `String?` | — | 문서. 애플리케이션이 주인일 때. |
| `defaultValue` | `String` | `''` | 에디터가 문서를 직접 가질 때, 시작할 문서. |
| `onChange` | `ValueChanged<String>?` | — | 모든 변경. 직접 갖든 건네받든. |
| `readOnly` | `bool` | `false` | 읽고 선택하고 복사하는 것은 그대로 됩니다. |
| `placeholder` | `String?` | 로케일에 맞는 안내문 | 문서가 비어 있는 동안 보입니다. |

이 두 방식은 Flutter의 모든 텍스트 필드가 제공하는 방식이고, React 패키지가 제공하는 방식이기도 합니다.

:::

## 화면

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `mode` | [`MawyMode`](../types/editor-mode) | — | 어느 화면인지. 애플리케이션이 주인일 때. |
| `defaultMode` | `MawyMode` | `modes`의 첫 번째 | 시작할 화면. |
| `onModeChange` | `(mode: MawyMode) => void` | — | 바뀔 때마다 호출됩니다. |
| `modes` | `readonly MawyMode[]` | `['wysiwyg', 'plain', 'split', 'preview']` | 전환 컨트롤이 제시할 화면. 하나만 주면 컨트롤이 사라집니다. |

`'wysiwyg'`는 문서를 그린 채 그 자리에서 고칩니다. 기본 목록의 첫 번째이고, 제시하고 싶지 않다면 `modes`에서 빼면 됩니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `mode` | [`MawyEditorMode?`](../types/editor-mode) | — | 어느 화면인지. 애플리케이션이 주인일 때. |
| `defaultMode` | `MawyEditorMode` | `MawyEditorMode.split` | 처음 열 화면. |
| `onModeChange` | `ValueChanged<MawyEditorMode>?` | — | 독자가 다른 화면을 고를 때 호출됩니다. |
| `modes` | `List<MawyEditorMode>` | `kMawyEditorModes` | 전환 컨트롤이 제시할 화면. 하나만 주면 컨트롤이 사라집니다. |

**이 패키지의 화면은 셋**이고, React 패키지의 `wysiwyg`가 여기 없는 하나입니다. 그려진 자리에서 문서를 고치는 일은 전적으로 `contenteditable` 위에 서 있습니다. 브라우저가 누군가 트리에 무엇을 하려 했는지 컴포넌트에 알려 주면, 컴포넌트가 그것을 거절하고 대신 마크다운을 고치는 구조입니다. Flutter에는 이에 해당하는 것이 없습니다. `EditableText`가 자기 문자열을 소유하기 때문입니다. 텍스트 필드이기도 한 문서를 그리려면 문서 모델이 하나 더 필요한데, 모델이 둘이면 까다로운 입력을 서로 다르게 읽습니다.

:::

## 인터페이스

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `toolbar` | [`MawyEditorToolbarOption`](../types/editor-toolbar-item) | `true` | 툴바에 둘 컨트롤과 그 순서. |
| `headingLevels` | `readonly (1 \| 2 \| 3 \| 4 \| 5 \| 6)[]` | `[1, 2, 3]` | `heading` 메뉴가 보여 주고 `Mod`+`1`~`Mod`+`6`이 닿는 제목 수준. |
| `frame` | [`MawyFrame`](../types/frame) | `'box'` | 에디터가 테두리를 두를지, 페이지 위에 뜰지. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `'top'` | 툴바와 찾기 바가 어느 끝에 있을지. 상태 표시줄은 움직이지 않습니다. |
| `status` | [`MawyEditorStatusOption`](../types/editor-status-item) | `true` | 상태 표시줄이 셀 것. |
| `lineNumbers` | `boolean` | `true` | 원문 왼쪽의 줄 번호. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | 에디터 인터페이스가 쓰는 언어. 툴바 이름표, 메뉴 항목, 상태 표시줄의 낱말, 스크린 리더에 주는 글입니다. 미리보기에도 함께 건넵니다. 문서와는 무관합니다. |
| `strings` | `Partial<`[`MawyStrings`](../types/locale#mawystrings)`>` | — | 인터페이스의 낱말 일부나 전부. 나머지는 `locale`에서 가져옵니다. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `toolbar` | `List<`[`MawyEditorToolbarItem`](../types/editor-toolbar-item)`>` | `kMawyEditorToolbar` | 툴바에 둘 컨트롤과 그 순서. 없애려면 `const []`. |
| `headingLevels` | `List<int>` | `const [1, 2, 3]` | `heading` 메뉴가 보여 주고 `Mod`+`1`~`Mod`+`6`이 닿는 제목 수준. 1에서 6 사이가 아닌 수는 뺍니다. |
| `frame` | [`MawyFrame`](../types/frame) | `MawyFrame.box` | 에디터가 테두리를 두를지, 화면 위에 뜰지. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `MawyToolbarPlacement.top` | 툴바와 찾기 바가 어느 끝에 있을지. 상태 표시줄은 움직이지 않습니다. |
| `status` | `List<`[`MawyEditorStatusItem`](../types/editor-status-item)`>` | `kMawyEditorStatus` | 상태 표시줄이 셀 것. 없애려면 `const []`. |
| `lineNumbers` | `bool` | `true` | 원문 앞쪽 가장자리의 줄 번호. |
| `locale` | [`MawyLocale`](../types/locale) | `MawyLocale.en` | 에디터 인터페이스가 쓰는 언어. 툴바 이름표, 메뉴 항목, 상태 표시줄의 낱말, 스크린 리더에 주는 글입니다. 미리보기에도 함께 건넵니다. 문서와는 무관합니다. |
| `strings` | [`MawyStrings?`](../types/locale#mawystrings) | — | 애플리케이션이 직접 가진 인터페이스 낱말. 주면 `locale`은 쓰이지 않습니다. 미리보기에도 함께 건넵니다. |

`true`가 아니라 목록인 이유는 뷰어의 `toolbar`가 목록인 이유와 같습니다.

:::

## 이미지

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `onUploadImage` | [`MawyImageUpload`](../types/image) | — | 떨어뜨리거나 붙여넣거나 고른 그림을 어디에 두고 어떤 URL을 쓸지. |
| `onUploadingChange` | `(count: number) => void` | — | 아직 문서에 들어오는 중인 이미지 수. 바뀔 때마다 부릅니다. |

이것이 있으면 툴바의 `image` 버튼은 기기에서 고른 그림도 올리는 메뉴가 되고, `Mod`+`Shift`+`U`로도 같은 선택 창이 열립니다. 이것이 없으면 떨어뜨린 파일은 아무 일도 하지 않습니다. 그림을 어딘가에 보관하는 일은 텍스트 에디터가 혼자 정할 일이 아니기 때문입니다. 이미 웹에 있는 이미지를 페이지째 붙여넣으면 원래 가지고 있던 URL 그대로 들어옵니다. [이미지](../../guide/editor#이미지)를 보세요.

:::

::: fw flutter

여기에는 이미지 업로드가 없습니다. 에디터는 애플리케이션이 건넨 URL로 마크다운을 쓸 뿐이고, 파일을 고르는 일은 위젯이 아니라 플러그인의 몫입니다.

:::

## 에디터 밖에서

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `handle` | `Ref<MawyEditorHandle>` | — | 애플리케이션이 자기 컨트롤에서 에디터에 할 수 있는 일. |

```ts
interface MawyEditorHandle {
  focus(): void;
  insert(markdown: string): void;
}
```

`insert`는 커서 자리에 마크다운을 쓰고, 선택한 내용이 있으면 그것을 대신합니다. 되돌리기 한 번에 되돌아가는 한 단계이고, 커서는 쓴 내용 뒤에 둡니다. `focus`는 지금 보이는 화면에 포커스를 돌려주고, 커서는 두었던 자리에 있습니다. 둘 다 `preview`에서는 아무 일도 하지 않고, `insert`는 에디터가 읽기 전용일 때도 아무 일도 하지 않습니다.

```tsx
const editor = useRef<MawyEditorHandle>(null);

<>
  <button onClick={() => editor.current?.insert('> [!NOTE]\n> ')}>참고</button>
  <MawyEditor handle={editor} />
</>;
```

`ref`는 가장 바깥 요소이고 앞으로도 그렇기 때문에 따로 프롭을 두었습니다. `ref`가 가리키는 것을 바꾸면, 이미 `ref`로 에디터를 재거나 스크롤하는 애플리케이션이 모두 깨집니다.

:::

::: fw flutter

| 인자     | 타입                | 기본값 | 하는 일                                                |
| -------- | ------------------- | ------ | ------------------------------------------------------ |
| `handle` | `MawyEditorHandle?` | —      | 애플리케이션이 자기 컨트롤에서 에디터에 할 수 있는 일. |

```dart
class MawyEditorHandle {
  MawyEditorHandle();

  void focus();
  void insert(String markdown);
}
```

애플리케이션이 만들어 넘기며, 스크롤 뷰에 `ScrollController`를 넘기는 것과 같습니다. `insert`는 커서 자리에 마크다운을 선택 영역 대신 한 번의 변경으로 쓰고, 커서를 그 뒤에 두고 초점을 원문에 둡니다. 아직 아무도 커서를 두지 않았다면 문서 끝에 씁니다. `focus`는 커서를 둔 자리 그대로 초점을 원문에 돌려줍니다. `preview`에서는 둘 다 아무 일도 하지 않고, 읽기 전용일 때는 `insert`가 아무 일도 하지 않으며, 에디터가 받기 전이나 사라진 뒤에도 둘 다 아무 일도 하지 않습니다.

```dart
final MawyEditorHandle editor = MawyEditorHandle();

Column(
  children: [
    NoteButton(onPressed: () => editor.insert('> [!NOTE]\n> ')),
    Expanded(child: MawyEditor(handle: editor)),
  ],
);
```

`TextEditingController`가 아닌 이유는, 그것을 넘기면 필드의 문자열이 넘어가 문서가 사는 곳이 두 군데가 되기 때문입니다. 문서는 여전히 `value`와 `onChange`에 있습니다.

:::

## 열기와 저장

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `onSave` | `(value: string, name: string) => void` | — | 저장한 문서가 갈 곳. 없으면 브라우저에 내려받기를 건넵니다. |
| `accept` | `string` | 모든 마크다운·텍스트 확장자 | 파일 선택기가 제시할 것. |
| `fileDrop` | `boolean` | `false` | 에디터에 떨어뜨린 마크다운 파일을 문서로 열지 말지. |

이름은 파일을 열었다면 그 파일의 이름이고, 아니면 문서의 첫 제목입니다. 에디터에 떨어뜨린 파일은 `fileDrop`이 달리 말하지 않는 한 문서가 아니라 이미지로 다룹니다. 그 이유와 켰을 때 달라지는 것은 [열기와 저장](../../guide/editor#열기와-저장)에 있습니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `onOpen` | `VoidCallback?` | — | 문서를 연다는 것이 무엇인지. 없으면 `open` 버튼도, 빈 에디터를 채우겠다고 제안하는 화면도 없습니다. |

**`onSave`도 `accept`도 `save`도 없습니다.** 파일 선택기는 위젯이 아니라 플러그인이고, 애플리케이션이 이미 고른 것이 무엇인지를 마크다운 에디터가 대신 정할 일은 아닙니다. `value`와 `onChange`가 이음매의 전부입니다. 파일을 읽어 문자열을 건네고, 문자열을 되받으면 됩니다.

`onOpen`은 선택기가 아니라 버튼입니다. 에디터는 툴바와 빈 에디터의 화면에 컨트롤을 그리고, 그것을 눌렀을 때 무엇이 열릴지는 애플리케이션이 정합니다.

:::

## 찾기

::: fw react

`Mod`+`F`가 지금 보이는 화면 위에 찾기 바를 엽니다. [찾기](../../guide/editor#찾기)를 보세요.

:::

::: fw flutter

`Mod`+`F`가 원문 위에 찾기 바를 열고, [`MawyEditorToolbarItem.find`](../types/editor-toolbar-item)가 같은 일을 하는 버튼입니다. `Enter`는 다음 일치, `Shift`+`Enter`는 이전 일치, `Escape`는 닫고 초점을 문서에 돌려줍니다.

플랫폼 자신의 찾기는 텍스트가 놓인 페이지에는 닿아도 텍스트 필드 *안*에는 닿지 않고, 원문 화면이 바로 그 텍스트 필드라서 이것이 있습니다. 계산 부분도 내보내 두었습니다. [본문 찾기](../functions/find)를 보세요. 자기 인터페이스에서 직접 몰고 싶은 애플리케이션을 위한 것입니다.

:::

## 미리보기와 팔레트

::: fw react

`parse`, `html`, `linkTarget`, `linkRel`, `links`, `images`, `highlight`, `fonts`, `directives`, `image`, `resolveUrl`, `anchorPrefix`, `headingBase`, `typography`, `defaultTypography`, `colorScheme`, `defaultColorScheme`, `onColorSchemeChange`는 [`MawyViewer`](./mawy-viewer)에서와 정확히 같은 의미이고, 문서를 어떻게 그릴지 말하는 것은 모두 미리보기로 그대로 전달됩니다. `directives`, `anchorPrefix`, `headingBase`, `links`, `images`는 그려진 문서에도 닿습니다.

그려진 문서에서는 `links`와 `images`가 무엇이든 캐럿이 들어간 링크나 그림을 늘 그래 왔듯 원문으로 풀어 씁니다. 캐럿이 고칠 수 있는 곳이 거기뿐이기 때문입니다. `hide`로 둔 링크와 그림은 캐럿이 닿기 전까지 화면에 없습니다. 독자에게 보일 모습을 작성자에게도 보여 주는 에디터라면 그것이 원하는 동작입니다.

`anchorPrefix`는 한 페이지에 놓인 에디터 두 개를 서로 떼어 놓습니다. 두 문서가 모두 `# Introduction`으로 시작하면 제목 두 개가 똑같이 `id="introduction"`을 받고, 두 번째 에디터의 각주 참조는 첫 번째 에디터의 각주로 갑니다. 에디터마다 접두사를 따로 주면 이 충돌이 사라집니다. 주지 않으면 에디터가 스스로 만들지 않습니다. 어느 에디터들이 한 페이지에 있는지는 애플리케이션만 알고, 자동으로 만든 이름은 애플리케이션이 자기 화면에서 링크를 걸 수 없는 이름이기 때문입니다.

:::

::: fw flutter

`parse`, `directives`, `highlight`, `onLinkTap`, `links`, `images`, `resolveUrl`, `typography`, `defaultTypography`, `tokens`는 [`MawyViewer`](./mawy-viewer)에서와 정확히 같은 의미이고, 미리보기로 그대로 전달됩니다.

색 팔레트는 뷰어의 인자 하나와 달리 여기서는 제어 쌍입니다. 애플리케이션이 주인일 때는 `colorScheme`, 에디터가 직접 가질 때는 `defaultColorScheme`(`MawyColorScheme.system`), 어느 쪽이든 `onColorSchemeChange`입니다.

`tokens`는 미리보기 너머까지 닿습니다. 에디터 자신의 툴바와 상태 표시줄과 찾기 바가 모두 그것이 돌려준 팔레트로 그려지므로, 에디터와 그것이 편집하는 문서가 서로 다른 두 팔레트가 되는 일은 없습니다.

:::
