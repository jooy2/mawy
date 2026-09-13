---
title: MawyEditorToolbarItem
order: 2
---

# `MawyEditorToolbarItem`

에디터 툴바의 컨트롤 하나입니다.

::: fw react

```ts
type MawyEditorToolbarItem =
  | 'mode'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'table'
  | 'rule'
  | 'find'
  | 'open'
  | 'save'
  | 'colorScheme'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyEditorToolbarItem {
  mode,
  bold,
  italic,
  strikethrough,
  code,
  link,
  image,
  heading,
  quote,
  bulletList,
  orderedList,
  taskList,
  codeBlock,
  rule,
  find,
  colorScheme,
  separator,
}
```

:::

`mode`, `find`, `colorScheme`, `separator`를 뺀 나머지는 모두 서식 명령이고, 그 하나하나에 단축키도 있습니다. `find`에도 `Mod`+`F`가 있고 버튼을 그리든 말든 동작합니다. `separator`는 컨트롤이 아니라 가는 선을 그립니다.

::: fw react

`undo`와 `redo`는 되돌리기 기록이고 단축키는 `Mod`+`Z`와 `Mod`+`Shift`+`Z`입니다. 되돌리거나 다시 할 단계가 없으면 비활성화됩니다. `table`은 표를 넣고 모양을 바꾸는 명령 일곱 개를 담은 메뉴이고, 명령마다 단축키가 따로 있습니다. [표](../../guide/editor#표)를 보세요.

`open`과 `save`도 여기 있습니다. `Mod`+`S`는 버튼을 그리든 말든 저장합니다. `open`에는 단축키가 없습니다. 브라우저 자신의 `Mod`+`O`는 건드리지 않는 편이 낫고, 파일을 여는 일은 글을 쓰다 말고 하는 일이 아니라 드물고 분명한 행동이기 때문입니다.

## `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true`는 위 순서 그대로의 모든 컨트롤, `false`는 툴바 없음, 배열은 딱 그 컨트롤을 딱 그 순서로 뜻합니다.

:::

::: fw flutter

`open`도 `save`도 없습니다. 여기서는 둘 다 애플리케이션이 맡습니다. [열기와 저장](../../guide/editor#열기와-저장)을 보세요.

## `kMawyEditorToolbar`

```dart
const List<MawyEditorToolbarItem> kMawyEditorToolbar;
```

툴바가 그리는 순서 그대로의 모든 컨트롤이고, `toolbar`의 기본값입니다. `const []`는 툴바 없음이고, 다른 목록은 딱 그 컨트롤을 딱 그 순서로 뜻합니다.

:::
