---
title: MawyLinkTarget
order: 10
---

# `MawyLinkTarget`

문서가 쓴 링크가 어디에서 열릴지.

::: fw flutter

이것은 React 패키지의 것입니다. 링크를 연다는 것이 무엇인지가 여기서는 `onLinkTap`이 답할 주제 전부이고, 어디에서 열릴지도 애플리케이션이 함께 답하는 것입니다. [`MawyViewer`](../components/mawy-viewer#읽기와-그리기)를 보세요.

:::

::: fw react

```ts
type MawyLinkTarget = 'blank' | 'self';
```

- `'blank'` — 새 탭에서, `rel="noopener noreferrer"`를 달고 엽니다. 기본값입니다. 뷰어는 대개 페이지 자체가 아니라 페이지의 한 조각이기 때문입니다. 문서에서 링크를 따라 나갔다 돌아온 독자는 문서를 두고 간 자리에서 찾아야 하고, 에디터라면 그 링크 뒤에 저장하지 않은 작업이 있습니다.
- `'self'` — 문서가 있는 탭에서 엽니다. 문서를 페이지 _그 자체로_ 보여 주는 애플리케이션이 원하는 값입니다.

문서가 쓴 링크에만 해당합니다. 각주 참조와 거기서 되돌아오는 화살표는 같은 페이지를 가리키므로 영향을 받지 않습니다.

:::
