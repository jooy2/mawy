---
layout: home

title: Mawy
titleTemplate: 마크다운 에디터와 뷰어를 하나의 패키지로
description: 마크다운 에디터와 뷰어를 하나의 패키지로. 위지윅 편집 화면, 마크다운 원문 편집 화면, 읽기 전용 뷰어가 같은 문서를 두고 하나의 파서와 하나의 렌더러를 공유합니다. React 우선, ESM 전용, 타입 포함.

hero:
  name: Mawy
  text: 하나의 문서를 보는 세 가지 방법
  tagline: 위지윅 에디터와 마크다운 원문 에디터, 그리고 뷰어를 하나의 패키지에, 하나의 값 위에. 화면을 바꾸는 것이지 문서를 바꾸는 것이 아닙니다.
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/guide/getting-started
    - theme: alt
      text: API
      link: /ko/api/
    - theme: alt
      text: GitHub
      link: https://github.com/jooy2/mawy

features:
  - title: 에디터와 뷰어가 같은 라이브러리
    details: 에디터와 다르게 그려지는 뷰어는 "에디터 + 별도 렌더러" 구성이 언젠가 반드시 마주치는 버그입니다. 여기서는 둘이 파서와 렌더러를 공유합니다.
    link: /ko/guide/viewer
    linkText: 뷰어
  - title: 위지윅과 원문이 같은 값
    details: 두 개의 에디터가 아니라 같은 문서를 보는 두 화면입니다. 전환할 때 다른 구현을 거쳐 왕복하지 않으므로, 한쪽이 표현하지 못하는 것이 사라지지 않습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 의존성은 가능한 한 없이
    details: 패키지가 선언한 런타임 의존성은 0개이고, 선언되지 않은 것을 import하면 테스트가 빌드를 실패시킵니다. 직접 만드는 쪽이 더 나쁠 때만, 그리고 관대한 라이선스일 때만 외부 라이브러리를 씁니다.
  - title: 실제로 도는 곳에서 테스트
    details: selection과 range, contenteditable, beforeinput이 에디터의 전부인데 DOM 에뮬레이터는 이것들을 제대로 구현하지 않습니다. 테스트는 Chromium과 Firefox, WebKit에서, 세 가지 OS 위에서 돕니다.
---

## 지금 어디까지 왔나

Mawy는 아직 초기 개발 단계입니다. 저장소의 뼈대 — 패키징, 린트, 실제 브라우저 세 종류에서 도는 테스트, CI, 그리고 이 문서 사이트 — 는 갖춰졌고, 그 위에 에디터를 만들고 있습니다. npm에는 아직 아무것도 올라가 있지 않고 API도 확정되지 않았습니다.

지금 존재하는 것은 [시작하기](./guide/getting-started)에 있습니다. 릴리스마다 무엇이 바뀌었는지는 [변경 기록](./changelog)에 적힙니다.
