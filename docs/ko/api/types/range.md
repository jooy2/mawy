---
title: MawyRange
order: 20
---

# `MawyRange`

문서의 한 조각이 쓰인 자리입니다. 컴포넌트가 건네받은 마크다운 안의 위치로 나타냅니다.

::: fw flutter

이것은 React 패키지의 것입니다. 같은 두 수가 여기서는 `MdRange`이고, 파싱한 문서의 모든 노드가 그것을 지니고 있습니다. [`MdDocument`](./md-document)를 보세요.

:::

::: fw react

```ts
interface MawyRange {
  start: number;
  end: number;
}
```

모든 엘리먼트가 `data-mawy-range`로 지니는 바로 그 두 수이고, 컴포넌트에는 수로 건넵니다. 지금 이 값을 받는 것은 [`MawyDirectiveProps`](./directives)뿐입니다.

:::
