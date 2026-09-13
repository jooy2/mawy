---
title: 링크와 이미지 그리기
order: 10.5
---

# 링크와 이미지 그리기

문서에 쓰인 링크와 그림을 어떻게 그릴지 정합니다. 링크를 따라가거나 그림을 내려받게 두고 싶지 않은 페이지를 위한 설정입니다.

독자가 쓴 문서를 싣는 페이지가 이 설정이 필요한 경우입니다. 무엇을 원하는지는 페이지마다 다릅니다. 텍스트로 그리면 링크는 문장에 남고 목적지만 사라집니다. 원문으로 그리면 목적지가 보이지만 따라갈 수 없습니다. 숨기면 링크가 문장에서 통째로 빠집니다.

::: fw react

```tsx
<MawyViewer value={comment.body} links="text" images="hide" />
```

:::

::: fw flutter

```dart
MawyViewer(value: comment.body, links: MawyLinkPolicy.text, images: MawyImagePolicy.hide)
```

:::

## `MawyLinkPolicy`

::: fw react

```ts
type MawyLinkPolicy = 'show' | 'text' | 'source' | 'hide';
```

:::

::: fw flutter

```dart
enum MawyLinkPolicy { show, text, source, hide }
```

:::

- `show` — 기본값입니다. 독자가 따라갈 수 있는 링크로 그립니다.
- `text` — 링크의 낱말만 주변 글과 같은 모양으로 그리고, 따라갈 곳은 없습니다. 링크 안의 서식은 그대로 두고, 링크 안의 그림은 `MawyImagePolicy`대로 그립니다.
- `source` — `[낱말](주소)`처럼 쓰인 글자 그대로 그립니다. 아무도 맡지 않은 디렉티브와 같은 모양입니다. 주소가 보이지만 따라가지는 않습니다.
- `hide` — 낱말까지 아무것도 그리지 않습니다.

문서가 쓴 링크에만 해당합니다. 각주 번호와 각주에서 되돌아가는 링크는 이 라이브러리가 만든 것이라 설정과 상관없이 그립니다. 제목의 앵커도 바뀌지 않습니다. 앵커는 낱말을 그리든 말든 작성자가 쓴 낱말에서 만들기 때문입니다.

뷰어의 찾기는 그려진 것만 찾습니다. 그래서 숨긴 링크의 낱말은 찾지 못하고, 원문으로 그린 링크는 주소로도 찾습니다.

::: fw react

날 HTML 안의 링크도 `html="sanitize"`에서는 같은 규칙을 따릅니다. `href`가 있는 `<a>`는 낱말이 되거나, 브라우저가 읽은 마크업 그대로가 되거나, 사라집니다. `name`만 있는 `<a>`는 링크가 아니라 찾아갈 자리이므로 그대로 둡니다. `raw`에서는 아무것도 바꾸지 않습니다. `raw`가 원래 그런 값입니다.

`wysiwyg` 화면에서는 설정과 상관없이 캐럿이 들어간 링크를 원문으로 풀어 씁니다. 캐럿이 링크를 고칠 수 있는 곳이 거기뿐이기 때문입니다. 숨긴 링크는 캐럿이 닿아야 화면에 나타납니다.

:::

::: fw flutter

`MawyEditor`에서는 미리보기에 적용됩니다. 원문 창은 문서의 글자 그대로라 바뀌지 않습니다.

:::

## `MawyImagePolicy`

::: fw react

```ts
type MawyImagePolicy = 'show' | 'text' | 'source' | 'hide';
```

:::

::: fw flutter

```dart
enum MawyImagePolicy { show, text, source, hide }
```

:::

- `show` — 기본값입니다. 그림을 내려받아 그립니다.
- `text` — 그림이 있을 자리에 설명, 곧 대체 텍스트를 글로 그립니다. 설명이 없는 그림은 아무것도 그리지 않습니다.
- `source` — `![설명](주소)`처럼 쓰인 글자 그대로 그립니다.
- `hide` — 아무것도 그리지 않습니다.

`show`가 아니면 아무것도 내려받지 않고, <Fw react="image" flutter="imageBuilder" code />도 호출하지 않습니다.

::: fw react

날 HTML 안의 그림도 `html="sanitize"`에서는 같은 규칙을 따릅니다. DOM 없이 서버에서 그리는 한 가지 `<img>`도 마찬가지입니다. `raw`에서는 아무것도 바꾸지 않습니다.

:::
