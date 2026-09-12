---
title: 프레임
order: 22
---

# 프레임

표면이 테두리를 두를지, 그리고 툴바가 어느 끝에 있을지.

## `MawyFrame`

::: fw react

```ts
type MawyFrame = 'box' | 'floating';
```

:::

::: fw flutter

```dart
enum MawyFrame { box, floating }
```

:::

- `box` — 기본값. 자기 배경이 있고 한쪽 끝을 툴바가 가로지르는 표면입니다. 뷰어가 어디서 시작하고 페이지가 어디서 끝나는지 보입니다. 더 큰 페이지 _안에서_ 들여다보는 문서가 원하는 모습입니다.
- `floating` — 문서를 감싸는 것이 없습니다. 테두리도 끝을 가로지르는 바도 없고, 툴바는 글 위에 뜬 둥근 묶음이 됩니다. 휴대폰이 컨트롤을 대상 위에 올려놓는 방식과 같습니다. 문서가 곧 페이지인 경우를 위한 값입니다. 글, 게시물, README처럼 본문을 감싼 상자가 화면 전체를 감싼 상자가 되어 아무 말도 하지 않는 자리입니다.

문서가 놓인 바탕은 어느 쪽이든 그대로입니다. 글자에는 닿고 글자가 놓인 자리에는 닿지 않는 팔레트는 반쪽짜리이고, 문서를 자기 바탕에 놓고 싶은 애플리케이션은 <Fw react="--mawy-bg: transparent" flutter="copyWith(background: Colors.transparent)" code />로 그렇게 말하면 됩니다.

본문 둘레의 여백도 프레임을 따라갑니다. 자기 여백을 가진 페이지는 그 안에 여백이 한 벌 더 있기를 바라지 않기 때문입니다. 얼마나 둘지는 <Fw react="--mawy-doc-padding" flutter="padding" code />가 정하고, 어느 쪽이든 그렇습니다.

## `MawyToolbarPlacement`

::: fw react

```ts
type MawyToolbarPlacement = 'top' | 'bottom';
```

:::

::: fw flutter

```dart
enum MawyToolbarPlacement { top, bottom }
```

:::

툴바가 표면의 어느 끝에 있을지. `box`에서는 선이 반대쪽에 그어진 바가 되고, `floating`에서는 둥근 바가 어느 가장자리 위에 뜰지가 됩니다. `bottom`은 휴대폰에서 엄지가 닿는 자리이고, `top`은 포인터가 툴바를 기대하는 자리입니다.

찾기 바도 함께 갑니다. 한쪽 끝의 찾기 바와 반대쪽 끝의 툴바는 아무것에도 속하지 않는 바입니다.

::: fw react

둘 다 읽히는 순서대로 그려집니다. DOM이 화면과 같은 것을 말하고, 키보드도 그 순서로 지나갑니다.

:::

에디터의 상태 줄은 툴바가 아니고 움직이지 않습니다. 어느 쪽이든 에디터의 아래 가장자리입니다.

[프레임](../../guide/viewer#프레임)을 보세요.
