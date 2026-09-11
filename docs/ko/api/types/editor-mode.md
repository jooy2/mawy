---
title: 에디터 화면
order: 1
---

# 에디터 화면

문서를 어느 화면으로 보여 줄지. 어느 쪽이든 같은 문서를 보여 줍니다. [에디터](../../guide/editor)를 보세요.

::: fw react

## `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';
```

- `'wysiwyg'` — 그려진 문서를 그 자리에서 고칩니다.
- `'plain'` — 마크다운 원문을 텍스트로 고칩니다.
- `'preview'` — 그려진 문서만, 읽기 전용으로.
- `'split'` — 한쪽에 원문, 다른 쪽에 미리보기를 동시에.

`split`이 목록 옆이 아니라 목록 안에 있는 것은 독자가 그 컨트롤을 쓰는 방식 때문입니다. 넷은 한 번에 하나만 눌리는 한 무리의 버튼이고, "둘 다"는 같은 질문에 대한 네 번째 답입니다.

:::

::: fw flutter

## `MawyEditorMode`

```dart
enum MawyEditorMode { plain, split, preview }
```

- `plain` — 색이 입혀진 마크다운 원문을 텍스트로 고칩니다.
- `split` — 한쪽에 원문, 다른 쪽에 그려진 문서를 동시에. 기본값입니다.
- `preview` — 그려진 문서만.

`wysiwyg`는 없고 앞으로도 없습니다. 이유는 [`MawyEditor`](../components/mawy-editor#화면)에 있습니다.

## `kMawyEditorModes`

```dart
const List<MawyEditorMode> kMawyEditorModes;
```

전환 컨트롤이 제시하는 순서 그대로의 셋이고, `modes`의 기본값입니다. 하나만 주면 컨트롤이 사라집니다.

:::
