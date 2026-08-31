---
layout: home

title: Mawy
titleTemplate: 마크다운 에디터와 뷰어를 하나의 패키지로
description: 마크다운을 쓰고 보여주는 일을 하나로 묶은 에디터. 위지윅 화면과 원문 화면을 오가며 쓰고, 다 쓴 문서는 읽기 전용 뷰어로 그대로 보여줍니다.

hero:
  name: Mawy
  text: 하나의 문서를 보는 세 가지 방법
  tagline: 마크다운 문서를 쓰는 일과 보여주는 일을 하나로 묶은 에디터입니다. 결과물 그대로를 보면서 고치는 위지윅 화면과 마크다운 원문을 직접 다루는 화면이 나란히 있어서 언제든 편한 쪽으로 옮겨 쓸 수 있고, 다 쓴 문서는 읽기 전용 뷰어로 그대로 띄워 독자에게 보여줄 수 있습니다. 쓰면서 본 모습과 독자가 읽는 모습이 어긋나지 않습니다.
  image:
    src: /256x256.png
    alt: Mawy
    width: 200
    height: 200
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
  - title: 보이는 그대로 씁니다
    details: 위지윅 화면은 아직 쓰는 중인 문서를 완성된 모습으로 보여줍니다. 제목은 실제 크기로, 표는 짜인 채로, 이미지는 자리에 놓인 채로. 머릿속으로 그려볼 것도, 미리보기를 한 번 거칠 것도 없습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 원문으로 써도 됩니다
    details: 그려진 화면이 오히려 거치적거릴 때 — 말을 안 듣는 표, 통째로 붙여넣고 싶은 블록 — 원문으로 들어갔다가 다시 나오면 됩니다. 어느 쪽이든 같은 문서라서 오가는 사이에 잃는 것이 없습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 그리고 독자에게 건넵니다
    details: 다 쓰고 나면 뷰어가 같은 문서를 받아 보여주기만 합니다. 독자가 보는 것은 작성자가 눈앞에 두고 있던 것 그대로입니다. 줄바꿈 하나까지.
    link: /ko/guide/viewer
    linkText: 뷰어
  - title: 미리 조립할 것이 없습니다
    details: 패키지 하나와 CSS 한 줄이 전부입니다. 첫 화면이 그럴듯해 보이기까지 채워 넣어야 할 테마 파일도, 빌드 쪽 플러그인도, 쓴 것을 그려줄 별도의 라이브러리도 필요 없습니다.
    link: /ko/guide/getting-started
    linkText: 시작하기
---

## 지금 어디까지 왔나

Mawy는 아직 초기 개발 단계이고, 대부분은 동작합니다. 직접 만든 파서가 CommonMark와 GitHub의 확장을 읽고, `MawyViewer`가 그 결과를 그리며, `MawyEditor`가 같은 문자열 주위에 마크다운 원문과 실시간 미리보기와 서식 툴바를 둘러 놓습니다. [에디터](./guide/editor)와 [뷰어](./guide/viewer) 페이지의 데모가 바로 그 컴포넌트들이 도는 모습입니다.

`wysiwyg` 화면 — 그려진 문서를 그 자리에서 편집하는 것 — 은 일부만 만들어졌습니다. 글자가 들어갈 수 있는 곳이면 어디서나 입력할 수 있고, 보여주는 대신 그려지는 원시 HTML만 어설프게 되는 대신 거절됩니다. npm에는 아직 아무것도 올라가 있지 않고 API도 확정되지 않았습니다.

지금 존재하는 것은 [시작하기](./guide/getting-started)에 있습니다. 릴리스마다 무엇이 바뀌었는지는 [변경 기록](./changelog)에 적힙니다.
