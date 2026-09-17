---
title: MawyViewerToolbarItem
order: 4
---

# `MawyViewerToolbarItem`

뷰어 툴바의 컨트롤 하나입니다. [툴바](../../guide/viewer#툴바)를 보세요.

::: fw react

```ts
type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'find'
  | 'raw'
  | 'copy'
  | 'open'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyViewerToolbarItem {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  measure,
  colorScheme,
  outline,
  find,
  raw,
  copy,
  separator,
}
```

:::

`separator`는 컨트롤이 아니라 가는 선을 그립니다.

`find`는 문서 위에 바를 열고, 뷰어가 초점을 가진 동안 `Ctrl`+`F`(`Cmd`+`F`)를 가져갑니다. 빼면 단축키는 다시 브라우저의 것이 되고, 페이지를 가득 채우는 뷰어에는 그 편이 맞습니다. 이 바는 자기 영역 안에 든 뷰어를 위한 것입니다. 브라우저의 찾기는 그런 영역을 들여다보지 않고 지나칩니다. 찾는 대상은 문서가 _그린_ 글자입니다. `bold`는 `**bold**` 안의 낱말을 찾고 `**`는 아무것도 찾지 못합니다. 일치가 두 조각에 걸칠 수는 없으므로 `he**llo**`에서 `hello`는 찾지 못하고, 펜스 코드 블록은 찾지 않습니다.

`raw`는 문서를 쓰인 마크다운 그대로 보여 줍니다. 같은 영역에 뜻 대신 원문의 글자가 들어가고, 툴바가 글자에 대해 말한 것은 그대로 적용됩니다. `outline`과 `find`는 그려진 문서를 읽으므로, 켜져 있는 동안 둘은 꺼집니다.

::: fw flutter

`open`은 없습니다. 파일 선택기가 없는 것과 같은 이유로, 파일을 여는 일은 이 패키지에 없는 플러그인을 뜻합니다.

## `kMawyViewerToolbar`

```dart
const List<MawyViewerToolbarItem> kMawyViewerToolbar;
```

툴바가 그리는 순서 그대로의 모든 컨트롤이고, `toolbar`의 기본값입니다. `const []`는 툴바 없음이고, 다른 목록은 딱 그 컨트롤을 딱 그 순서로 뜻합니다.

:::

::: fw react

## `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true`는 위 순서 그대로의 모든 컨트롤, `false`는 툴바 없음, 배열은 딱 그 컨트롤을 딱 그 순서로 뜻합니다.

:::

목록에 없는 컨트롤을 더하는 방법은 두 패키지 어느 쪽에도 없습니다. 아무 자식이나 받는 툴바는 라이브러리가 더 이상 키보드로 다룰 수 있게 만들 수 없는 툴바입니다.
