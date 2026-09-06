---
layout: home

title: Mawy
titleTemplate: 마크다운 에디터와 뷰어를 한 패키지에
description: 가볍고 빠른 마크다운 뷰어와 에디터를 한 패키지에 담았습니다. 웹 페이지에도 앱에도 그대로 탑재할 수 있고, React와 Flutter가 같은 파서로 문서를 읽습니다.

hero:
  name: Mawy
  text: 웹 및 앱에 탑재하기 가장 적합한 통합 마크다운 뷰어 &amp; 에디터
  tagline: 마크다운 문서를 가장 편하게 보거나 편집할 수 있는 가볍고 빠른 GUI 뷰어와 에디터 환경을 제공합니다. 코드 에디터나 문서 페이지, AI 애플리케이션 어디에나 활용할 수 있으며 여러 언어와 환경에 탑재할 수 있습니다.
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
  - title: 어디에나 탑재됩니다
    details: 코드 에디터, 문서 페이지, AI 애플리케이션처럼 마크다운을 보여줄 자리라면 어디든 들어갑니다. 페이지가 이미 갖고 있는 스타일과 섞이지 않고, React와 Flutter 두 환경에 같은 라이브러리로 올라갑니다.
  - title: 뷰어와 에디터가 하나입니다
    details: 문서를 고치는 화면과 읽는 화면이 같은 파서와 같은 렌더러를 씁니다. 작성자가 보던 화면과 독자가 보는 화면이 줄바꿈 하나까지 같습니다.
    link: /ko/guide/editor
    linkText: 에디터
  - title: 읽기만 하는 자리에는 뷰어만
    details: 편집이 필요 없는 화면에는 뷰어만 올리면 됩니다. 툴바와 테마, 글꼴 설정이 그대로 따라오고 문서는 에디터에서 보던 모습 그대로 그려집니다.
    link: /ko/guide/viewer
    linkText: 뷰어
  - title: 미리 조립할 것이 없습니다
    details: 패키지 하나와 CSS 한 줄이면 됩니다. 테마 파일을 채우거나 빌드에 플러그인을 더하거나 렌더링용 라이브러리를 따로 설치할 필요가 없습니다.
    link: /ko/guide/getting-started
    linkText: 시작하기
---

## 주요 기능

<ul class="mawy-keys">
  <li>뷰어와 에디터를 한 패키지에</li>
  <li>위지윅과 마크다운 원문을 오가며 편집</li>
  <li>React와 Flutter가 같은 파서로 동작</li>
  <li>CommonMark과 GitHub 확장 문법 지원</li>
  <li>다크 모드와 타이포그래피 기본 제공</li>
  <li>한국어와 영어 인터페이스 내장</li>
  <li>페이지의 기존 스타일과 섞이지 않는 렌더링</li>
  <li>모르는 문법은 디렉티브로 확장</li>
</ul>

## 지금 시도해보세요

에디터 단독, 뷰어 단독, 또는 둘을 함께 놓고 여러 방법으로 마크다운 파일을 편집할 수 있습니다. 아래 데모에서 어떻게 쓰는지 살펴보세요.

<div class="mawy-cta">
  <a href="/ko/guide/playground">데모에서 시도해보기</a>
</div>

<MawyDemo name="playground/editor" :flutter="false" :height="460" />
