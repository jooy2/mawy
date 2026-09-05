---
layout: home

title: Mawy
titleTemplate: 마크다운 에디터와 뷰어를 한 패키지에
description: 마크다운 에디터와 뷰어를 한 패키지에 담았습니다. 위지윅 화면과 원문 화면을 오가며 쓰고, 다 쓴 문서는 읽기 전용 뷰어로 그대로 보여줍니다.

hero:
  name: Mawy
  text: 한 문서를 보는 세 가지 방법
  tagline: 마크다운 에디터와 뷰어를 한 패키지에 담았습니다. 완성된 모습 그대로 고치는 위지윅 화면과 마크다운 원문을 다루는 화면을 버튼 하나로 오갈 수 있고, 다 쓴 문서는 읽기 전용 뷰어가 그대로 보여줍니다. 작성자가 보던 화면과 독자가 보는 화면이 같습니다.
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
      text: 직접 써보기
      link: /ko/guide/playground
    - theme: alt
      text: API
      link: /ko/api/
    - theme: alt
      text: GitHub
      link: https://github.com/jooy2/mawy

features:
  - title: 보이는 그대로 씁니다
    details: 위지윅 화면은 쓰는 중인 문서를 완성된 모습으로 보여줍니다. 제목은 실제 크기로, 표는 짜인 모양대로, 이미지는 놓일 자리에 그려집니다. 미리보기를 따로 열 필요가 없습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 원문으로 써도 됩니다
    details: 표가 뜻대로 그려지지 않거나 블록을 통째로 붙여넣고 싶을 때는 원문 화면으로 전환하면 됩니다. 두 화면이 같은 문서를 다루므로 오가는 사이에 잃는 내용이 없습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 독자에게 그대로 건넵니다
    details: 다 쓰고 나면 뷰어가 같은 문서를 그대로 보여줍니다. 독자가 보는 화면은 작성자가 보던 화면과 줄바꿈 하나까지 같습니다.
    link: /ko/guide/viewer
    linkText: 뷰어
  - title: 미리 조립할 것이 없습니다
    details: 패키지 하나와 CSS 한 줄이면 됩니다. 테마 파일을 채우거나 빌드에 플러그인을 더하거나 렌더링용 라이브러리를 따로 설치할 필요가 없습니다.
    link: /ko/guide/getting-started
    linkText: 시작하기
---

## 지금 상태

Mawy는 `1.0.0`입니다. 직접 만든 파서가 CommonMark와 GitHub 확장을 읽고, `MawyViewer`가 그 결과를 그리며, `MawyEditor`는 같은 문자열에 마크다운 원문과 실시간 미리보기, 서식 툴바를 붙입니다. [에디터](./guide/editor)와 [뷰어](./guide/viewer) 페이지의 데모는 실제 컴포넌트를 띄운 것입니다.

패키지는 npm의 [`mawy-react`](https://www.npmjs.com/package/mawy-react)와 pub.dev의 [`mawy`](https://pub.dev/packages/mawy) 두 곳에 올라가 있습니다. 둘은 같은 라이브러리입니다. Dart 파서와 TypeScript 파서가 같은 규칙을 같은 함수로 구현하고, 저장소의 모든 문서로 두 파서의 트리를 맞춰 보는 검사가 돌아갑니다. 양쪽 다 뷰어와 에디터를 갖췄습니다. Flutter 에디터는 화면이 셋이고 React 에디터는 넷인데, 그 이유는 에디터 문서에 적어 두었습니다. 사이드바에서 쓰실 패키지를 고르면 이 사이트의 모든 페이지가 그에 맞춰 바뀝니다.

그려진 문서를 그 자리에서 편집하는 `wysiwyg` 화면은 React 에디터의 기본 화면 목록에 들어 있습니다. 두 패키지 모두 `1.0.0`으로 게시되어 있습니다. 여기서부터 내보내는 API는 유의적 버전(semantic versioning)을 따르므로, 이름이 사라지거나 모양이 바뀌는 변경은 메이저 버전에서만 일어납니다.

지금 쓸 수 있는 것은 [시작하기](./guide/getting-started)에 있습니다. 릴리스마다 무엇이 바뀌었는지는 [변경 기록](./changelog)에 적어 둡니다.
