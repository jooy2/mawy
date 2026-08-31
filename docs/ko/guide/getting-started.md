---
title: 시작하기
order: 1
---

# 시작하기

Mawy는 언어별로 하나의 패키지로 배포됩니다. 지금 존재하는 것은 React이고, Flutter는 계획되어 있으며 나오면 같은 문서 페이지에서 함께 다룹니다.

::: warning 아직 배포 전입니다 이 페이지는 만들어지는 중인 패키지를 설명합니다. `npm install mawy`는 아직 아무것도 받아오지 못하고, 아래 API는 현재 존재하는 부분 — 공용 타입 어휘 — 입니다. 에디터 컴포넌트는 첫 릴리스와 함께 들어옵니다. [변경 기록](../changelog)을 확인하세요. :::

## 요구 사항

- **React 18 또는 19**. `react-dom`과 함께 peer dependency입니다.
- 빌드에는 **Node.js 20.19 이상**.
- `contenteditable`과 `Selection`, `beforeinput`을 지원하는 브라우저 — 최신 브라우저는 모두 해당합니다.

## 설치

```bash
npm install mawy
```

`react`와 `react-dom`은 peer dependency입니다. 프로젝트에 이미 있다면 Mawy는 그 사본을 그대로 씁니다.

## 스타일시트 연결

애플리케이션의 CSS 진입점에 한 줄을 더합니다.

```css
@import 'mawy/styles.css';
```

이 스타일시트는 완성된 CSS입니다. 빌드 쪽 설정도, 플러그인도, 구성 파일도 필요 없습니다. 라이브러리가 그리는 모든 값은 `--mawy-*` 커스텀 속성을 거치므로, 테마를 바꾼다는 것은 규칙을 더 높은 우선순위로 덮어쓰는 일이 아니라 토큰을 다시 선언하는 일입니다. 토큰은 상속되므로 바깥 요소에 한 번 선언하면 그 안의 모든 Mawy 화면에 닿습니다.

## 지금 패키지가 내보내는 것

모든 컴포넌트가 쓰게 될 타입 어휘입니다.

```ts
import type { MawyColorScheme, MawyLocale, MawyMode } from 'mawy';
```

| 타입 | 값 | 무엇인가 |
| --- | --- | --- |
| `MawyMode` | `'wysiwyg'`, `'plain'`, `'preview'` | 문서를 어느 화면으로 보여줄지. [에디터](./editor) 참고. |
| `MawyColorScheme` | `'light'`, `'dark'`, `'system'` | 어느 팔레트로 그릴지. `system`은 `prefers-color-scheme`를 따릅니다. |
| `MawyLocale` | `'en'`, `'ko'` | 에디터 UI 자체의 언어. 문서의 언어가 아닙니다. |

같은 타입을 `mawy/types`에서도 가져올 수 있습니다. 컴포넌트를 import하지 않고도 애플리케이션의 props에 이 타입을 쓸 수 있게 하기 위한 진입점입니다.

## 다음

- [**에디터**](./editor) — 위지윅 화면과 원문 화면, 그리고 그 사이의 전환.
- [**뷰어**](./viewer) — 편집 없이 문서를 그리기.
- [**API**](../api/) — 모든 컴포넌트와 모든 옵션.
