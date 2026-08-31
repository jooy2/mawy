---
title: 시작하기
order: 1
---

# 시작하기

Mawy는 언어별로 하나의 패키지로 배포됩니다. 지금 존재하는 것은 React이고, Flutter는 계획되어 있으며 나오면 같은 문서 페이지에서 함께 다룹니다.

::: warning 아직 배포 전입니다

`npm install mawy`는 아직 아무것도 받아오지 못합니다. 이 페이지의 내용은 전부 실제로 동작합니다 — 이 사이트가 두 컴포넌트를 모두 그리고 있습니다 — 다만 설치가 아니라 저장소를 빌드해서 닿습니다. [변경 기록](../changelog)을 확인하세요.

:::

## 요구 사항

- **React 18 또는 19**. `react-dom`과 함께 peer dependency입니다.
- 빌드에는 **Node.js 20.19 이상**.
- `contenteditable`과 `Selection`, `beforeinput`을 지원하는 브라우저 — 최신 브라우저는 모두 해당합니다.

## 설치

```bash
npm install mawy
```

`react`와 `react-dom`은 peer dependency입니다. 프로젝트에 이미 있다면 Mawy는 그 사본을 그대로 씁니다.

런타임 의존성은 [`lucide-react`](https://lucide.dev) 하나뿐이고, 툴바 아이콘이 여기서 옵니다. ISC 라이선스이고, 딸려 오는 것이 없으며, 실제로 그리는 열몇 개의 글리프만 남기고 트리셰이킹됩니다.

## 스타일시트 연결

애플리케이션의 CSS 진입점에 한 줄을 더합니다.

```css
@import 'mawy/styles.css';
```

이 스타일시트는 완성된 CSS입니다. 빌드 쪽 설정도, 플러그인도, 구성 파일도 필요 없습니다. 라이브러리가 그리는 모든 값은 `--mawy-*` 커스텀 속성을 거치므로, 테마를 바꾼다는 것은 규칙을 더 높은 우선순위로 덮어쓰는 일이 아니라 토큰을 다시 선언하는 일입니다. 토큰은 상속되므로 바깥 요소에 한 번 선언하면 그 안의 모든 Mawy 화면에 닿습니다.

## 문서 쓰기

```tsx
import { MawyEditor } from 'mawy';

export function Page() {
  return <MawyEditor defaultValue="# 안녕하세요" onChange={save} />;
}
```

문법이 색으로 구분된 마크다운 원문, 그 옆의 실시간 미리보기, 모든 명령이 키보드 단축키이기도 한 서식 툴바, 그리고 세어주는 상태 표시줄. 나머지는 [에디터](./editor)에 있습니다.

## 문서 보여주기

```tsx
import { MawyViewer } from 'mawy';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

이것으로 완성된 읽기 화면입니다. 문서가 그려지고, 독자가 바꾸고 싶어 하는 것들 — 글자 크기, 줄 간격, 테마, 본문 폭 — 을 위한 툴바가 함께 옵니다. 그 어느 것도 문서를 건드리지 않습니다.

## 또는 문서 없이

`value`는 선택입니다. 빼는 것은 빈 상태가 아니라 이 컴포넌트의 나머지 절반입니다. 보여줄 것이 없으면 뷰어 자체가 **파일 선택기**가 됩니다. `.md` 파일을 끌어다 놓거나, 골라서 열면 됩니다.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

## 툴바에 무엇을 둘지 고르기

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

`true`는 전부, `false`는 없음, 배열은 정확히 그 컨트롤들을 정확히 그 순서로. 목록은 [뷰어](./viewer#툴바)에 있습니다.

## 지금 패키지가 내보내는 것

|  |  |
| --- | --- |
| `MawyViewer` | 읽기 전용 뷰어. [가이드](./viewer), [API](../api/#mawyviewer). |
| `mawy/styles.css` | 위의 스타일시트. |
| 타입 | `MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption` |

타입은 `mawy/types`에서도 가져올 수 있습니다. 컴포넌트를 import하지 않고도 애플리케이션의 props에 이 타입을 쓸 수 있게 하기 위한 진입점입니다.

`MawyEditor`는 아직 없습니다 — [에디터](./editor)가 그것이 만들어질 형태입니다.

## 다음

- [**에디터**](./editor) — 위지윅 화면과 원문 화면, 그리고 그 사이의 전환.
- [**뷰어**](./viewer) — 편집 없이 문서를 그리기.
- [**API**](../api/) — 모든 컴포넌트와 모든 옵션.
