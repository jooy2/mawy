---
title: MawyEditorStatusItem
order: 3
---

# `MawyEditorStatusItem`

에디터가 아래쪽 가장자리에서 세는 것입니다.

::: fw react

```ts
type MawyEditorStatusItem = 'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';
```

:::

::: fw flutter

```dart
enum MawyEditorStatusItem { position, selection, lines, words, characters, size }
```

:::

`characters`는 코드 포인트라서 이모지 하나가 한 글자입니다. `words`는 공백으로 나눈 수에 한자와 히라가나, 가타카나를 글자마다 더합니다. 그 문자들은 띄어쓰기 없이 쓰기 때문입니다. 한국어는 띄어 쓰므로 어절 하나가 한 낱말입니다. `size`는 UTF-8 바이트이고, 디스크에 놓일 파일의 크기가 그 값입니다.

::: fw react

## `MawyEditorStatusOption`

```ts
type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];
```

`true`는 위 목록 전부, `false`는 상태 표시줄 없음, 배열은 딱 그 항목을 딱 그 순서로 뜻합니다.

:::

::: fw flutter

## `kMawyEditorStatus`

```dart
const List<MawyEditorStatusItem> kMawyEditorStatus;
```

달리 말하지 않으면 상태 표시줄이 세는 것입니다. `const []`는 상태 표시줄 없음입니다.

:::
