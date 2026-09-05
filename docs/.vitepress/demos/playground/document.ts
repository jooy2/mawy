import type { MawyLocale } from 'mawy-react';

/**
 * The document the playground opens with, in the page's own language.
 *
 * One document for both panes and both packages: the editor starts on it, the
 * viewer beside it reads it, and the two playground samples in the Flutter
 * gallery are these same two strings. Four documents on a page whose point is
 * that there is one library would be four chances to disagree.
 *
 * It is a file somebody would actually keep — the handbook for a corner of a
 * street, written by the people who look after it — rather than a tour of the
 * editor. A document about the editor teaches the editor nothing. What a table
 * with three alignments or a definition list looks like is the thing worth
 * seeing, and it is worth seeing in the place a real document would have
 * reached for it.
 *
 * Which is the other half of the job: everything the parser reads is in here
 * once. Emphasis, strong, struck through and code; a link written four ways and
 * a picture written two; bullets, numbers and boxes to tick; a table with all
 * three alignments; a quotation and an alert of each of the five kinds; three
 * fences; a definition list; two footnotes, one of them mentioned twice; a
 * character reference; a hard break; a rule; and the three directives this site
 * declares, one of each shape. Type over any of it and the answer is on the
 * other side of the pane, which is the whole of what a playground is for.
 *
 * The two languages are written rather than translated. The pictures are the
 * site's own, from `public/sample`, and every address in it is an
 * `example.org` one, because the garden is not a real place.
 */
export const PLAYGROUND: Readonly<Record<MawyLocale, string>> = {
  en: `# Maple Court rain garden

The garden takes the roof water off the four houses on the corner and holds it long enough for the ground to drink it. Nobody owns it and everybody looks after it: pull a weed when you walk past, and put anything broken at the bottom of this file with your name against it.

**Where** the corner lot, 12 Maple Court  
**Shed key** number 14, or the box behind the gate  
**Work morning** Saturdays at 08:00, unless it rained in the night

![The corner lot the morning after the March rain](/sample/rain-garden.webp 'Looking north from the steps at number 14')

## The four zones

Water arrives at **A**, slows down through **B**, stands in **C** for a day at most, and leaves at **D**. Everything else is planting.

| Zone | Planting | Checked | Standing depth |
| :--- | :------- | :-----: | -------------: |
| A — inlet | river stone, nothing green | monthly | 5 cm |
| B — swale | sedge, blue flag iris, coneflower | weekly | 25 cm |
| C — basin | soft rush, joe-pye weed | weekly | 60 cm |
| D — overflow | turf only, ~~low shrubs~~ nothing woody | after rain | 10 cm |

> [!IMPORTANT]
> Zone C has to be empty within a day of the rain stopping. Water standing on the second morning means the basin has silted up, and that is the one job here that does not wait for Saturday.

## The list for this month

- [x] Rake the winter grit out of the inlet, and lift the grate to look underneath
- [x] Cut the sedge in B back to a hand's width
- [ ] Two bags of the coarse mulch into C — *not* bark chips, which float
- [ ] Photograph the cracked kerb by the overflow for the district office

::progress{value=60 label="Spring list"}

## Watering

Only the first year's planting is watered, and only in a week with no rain in it.

1. Take it from the barrel at number 14 first. It holds 200 L and it is free.
2. If the barrel is empty, use the standpipe by the shed.
   - The square key, not the round one.
   - Turn it off at the standpipe rather than at the hose.
3. Write the date on the sheet inside the shed door.

> The first year they sleep, the second year they creep, the third year they leap.

:::callout[How much is enough]{kind=note}
Two and a half centimetres a week, out of the sky or out of the hose. A finger pushed into the soil to the second knuckle comes out damp if the week has been wet enough, and comes out clean if it has not.
:::

## The level logger

A logger sits in a pipe at the low end of C and takes a reading every ten minutes. Two AA cells last it a season.

Hold :kbd[SET] until the light blinks twice, plug the cable in, and ask for what it has:

\`\`\`bash
levelbox dump --since 2026-03-01 > march.csv
\`\`\`

What it does between visits is on the card, in \`logger.yml\`:

\`\`\`yaml
site: maple-court-c
interval: 10m
alert:
  depth_cm: 55
  standing_for: 24h
upload:
  when: wifi
  keep_local: true
\`\`\`

If the cable brings nothing back, the card is out or the cells are flat, and the first line it prints says which:

\`\`\`
boot ok
card none
cells 2.9V
\`\`\`

> [!NOTE]
> The clock drifts about a minute a month and is set from a phone whenever the card is swapped. Readings from the end of a long gap are worth what their timestamps are worth.

> [!TIP]
> A reading is a depth in the pipe, not a volume in the basin. The conversion is taped inside the shed door.

## After a storm

![Rain on the kitchen window at number 14][storm]

Walk the garden the morning after anything heavier than 20 mm.

### The walk round

1. The inlet, for a mat of leaves against the grate.
2. The swale, for gravel washed down into the planting.
3. The overflow, for a channel cut through the turf.

#### If the turf has been cut through

Tread it back while the ground is soft and set a stone at the head of the channel. Twice in a season means the overflow is too narrow, which is a district job rather than ours.

> [!WARNING]
> Nobody stands in the basin while it is holding water. The mulch floats, and the bottom is not as firm as it looks from the kerb.

> [!CAUTION]
> The district sprays the kerb line twice a year, in May and September. Nothing that grows here is food, and that includes the mint that has got into B.

## Words this file keeps using

Bioswale
: The planted channel between the inlet and the basin. Its job is to slow the water down, not to keep it.

First flush
: The first few minutes of a downpour, which carry most of what was lying on the roofs.

Ponding time
: How long water stands after the rain stops, measured at C.[^invert]

Mulch
: A coarse layer over bare soil, to hold the soil down.
: Not bark chips. They float, and they end up in the overflow.

---

## Everything else

- The district's stormwater guidance, worth reading before anyone proposes a change: <https://example.org/stormwater>
- What was planted, what it cost and where it came from: [the spring order][order]
- Anything broken, anything missing: [garden@example.com](mailto:garden@example.com)
- The photographs from the last two years live at https://example.org/rain-garden/photos

The layout came out of a workshop the district ran in the autumn of 2024,[^workshop] and the planting is theirs with two changes: nothing woody near the overflow, and rush in the basin instead of cattail, which would have taken the whole of it inside three years.[^invert]

&copy; 2026 the Maple Court neighbours. Take anything here that is useful.

[order]: https://example.org/rain-garden/spring-order 'The spring order, with prices'
[storm]: /sample/storm-window.webp 'The second storm of the month, from number 14'

[^invert]: Measured from the invert of the outlet pipe rather than from the top of the mulch. The two are 8 cm apart, and the difference has fooled us twice.

[^workshop]: District workshop, autumn 2024. The handout is in the shed, in the folder with the receipts.
`,
  ko: `# 은행나무길 빗물 정원

모퉁이 집 네 채의 지붕물을 받아 땅이 마실 시간을 벌어 주는 정원입니다. 주인은 없고 지나가는 사람이 돌봅니다. 잡초는 보이는 대로 뽑고, 고장 난 것은 이 파일 맨 아래에 이름과 함께 적어 둡니다.

**위치** 은행나무길 12, 모퉁이 필지  
**창고 열쇠** 14호, 또는 대문 뒤 상자  
**작업일** 토요일 오전 8시. 밤새 비가 왔으면 쉽니다

![3월 비가 그친 다음 날 아침의 모퉁이 필지](/sample/rain-garden.webp '14호 계단에서 북쪽으로')

## 네 구역

물은 **A**로 들어와 **B**를 지나며 느려지고, **C**에 하루쯤 머물다 **D**로 빠집니다. 나머지는 전부 심은 것입니다.

| 구역 | 심은 것 | 점검 | 고이는 깊이 |
| :--- | :------ | :--: | ----------: |
| A — 유입부 | 강자갈, 식재 없음 | 한 달 | 5 cm |
| B — 수로 | 사초, 꽃창포, 에키네시아 | 매주 | 25 cm |
| C — 저류지 | 골풀, 등골나물 | 매주 | 60 cm |
| D — 월류부 | 잔디만, ~~낮은 관목~~ 목본은 금지 | 비 온 뒤 | 10 cm |

> [!IMPORTANT]
> C는 비가 그친 뒤 하루 안에 비어야 합니다. 이튿날 아침까지 물이 남아 있으면 저류지가 막힌 것이고, 여기서 토요일까지 기다리면 안 되는 일은 그것 하나입니다.

## 이달의 목록

- [x] 유입부의 겨울 모래를 긁어내고, 격자를 들어 아래를 확인하기
- [x] B의 사초를 한 뼘 높이로 자르기
- [ ] C에 거친 멀칭재 두 포대. 물에 뜨는 *바크칩은 안 됩니다*
- [ ] 월류부 옆 갈라진 연석을 찍어 구청에 보내기

::progress{value=60 label="봄 목록"}

## 물 주기

물은 첫해 심은 것에만, 그것도 비가 없는 주에만 줍니다.

1. 14호 빗물통을 먼저 씁니다. 200 L가 들어가고 값도 들지 않습니다.
2. 통이 비면 창고 옆 급수전을 씁니다.
   - 열쇠는 사각이고, 둥근 것이 아닙니다.
   - 잠글 때는 호스가 아니라 급수전에서 잠급니다.
3. 창고 문 안쪽 종이에 날짜를 적습니다.

> 첫해는 자고, 둘째 해는 기고, 셋째 해는 뜁니다.

:::callout[얼마나 주어야 충분한지]{kind=note}
일주일에 2.5 cm입니다. 하늘에서 오든 호스에서 오든 상관없습니다. 손가락을 두 번째 마디까지 흙에 넣었다 빼서 젖어 나오면 그 주는 충분했고, 깨끗하면 모자랐습니다.
:::

## 수위 기록계

C의 낮은 쪽 관 안에 기록계가 들어 있고, 10분마다 한 번씩 잽니다. AA 전지 두 개로 한 철을 납니다.

불이 두 번 깜빡일 때까지 :kbd[SET]을 누르고, 케이블을 꽂은 다음 쌓인 것을 달라고 합니다.

\`\`\`bash
levelbox dump --since 2026-03-01 > march.csv
\`\`\`

사람이 없는 동안 무엇을 하는지는 카드 안 \`logger.yml\`에 적혀 있습니다.

\`\`\`yaml
site: garden-c
interval: 10m
alert:
  depth_cm: 55
  standing_for: 24h
upload:
  when: wifi
  keep_local: true
\`\`\`

케이블로 아무것도 오지 않으면 카드가 빠졌거나 전지가 닳은 것이고, 어느 쪽인지는 첫 줄이 말해 줍니다.

\`\`\`
boot ok
card none
cells 2.9V
\`\`\`

> [!NOTE]
> 시계는 한 달에 1분쯤 밀리고, 카드를 갈 때마다 휴대폰으로 맞춥니다. 오래 비워 둔 뒤의 기록은 그 시각만큼만 믿을 수 있습니다.

> [!TIP]
> 기록계가 재는 것은 관 속의 깊이이지 저류지의 부피가 아닙니다. 환산표는 창고 문 안쪽에 붙어 있습니다.

## 비가 온 다음 날

![14호 부엌 창문의 빗방울][storm]

20 mm보다 많이 온 다음 날 아침에는 한 바퀴 돕니다.

### 도는 순서

1. 유입부. 격자에 낙엽이 눌어붙지 않았는지 봅니다.
2. 수로. 자갈이 식재 쪽으로 쓸려 내려오지 않았는지 봅니다.
3. 월류부. 잔디에 물길이 파이지 않았는지 봅니다.

#### 잔디에 물길이 파였다면

땅이 무를 때 밟아 메우고, 물길 머리에 돌을 하나 놓습니다. 한 철에 두 번 파이면 월류부가 좁은 것이고, 그것은 우리 일이 아니라 구청 일입니다.

> [!WARNING]
> 물이 남아 있는 저류지에는 들어가지 않습니다. 멀칭재가 떠 있어서 바닥이 연석에서 보이는 것만큼 단단하지 않습니다.

> [!CAUTION]
> 구청은 5월과 9월에 연석을 따라 제초제를 뿌립니다. 여기서 자라는 것은 먹지 않습니다. B로 넘어온 박하도 마찬가지입니다.

## 이 파일이 자꾸 쓰는 말

식생수로
: 유입부와 저류지 사이의 심은 물길입니다. 물을 가두는 것이 아니라 늦추는 것이 하는 일입니다.

초기 우수
: 소나기의 첫 몇 분입니다. 지붕에 쌓여 있던 것이 대부분 이때 씻겨 내려옵니다.

체류 시간
: 비가 그친 뒤 물이 남아 있는 시간이고, C에서 잽니다.[^invert]

멀칭
: 맨흙을 덮는 거친 층입니다. 흙이 쓸려 나가지 않게 잡아 줍니다.
: 바크칩은 아닙니다. 물에 떠서 월류부까지 갑니다.

---

## 나머지

- 구청의 빗물 관리 안내입니다. 무엇을 바꾸자고 하기 전에 읽어 볼 만합니다: <https://example.org/stormwater>
- 무엇을 얼마에 어디서 샀는지는 [봄 주문서][order]에 적어 두었습니다
- 고장과 분실은 [garden@example.com](mailto:garden@example.com)으로 알려 주세요
- 지난 두 해의 사진은 https://example.org/rain-garden/photos 에 있습니다

배치는 2024년 가을에 구청이 연 워크숍에서 나왔고,[^workshop] 식재 목록도 그때 받은 것에서 두 가지만 바꿨습니다. 월류부 근처에 목본을 두지 않는 것과, 저류지에 부들 대신 골풀을 심는 것입니다. 부들이었다면 3년 안에 저류지를 다 차지했을 것입니다.[^invert]

&copy; 2026 은행나무길 이웃들. 쓸 만한 것은 가져가세요.

[order]: https://example.org/rain-garden/spring-order '가격이 적힌 봄 주문서'
[storm]: /sample/storm-window.webp '이달 두 번째 비, 14호에서'

[^invert]: 멀칭재 윗면이 아니라 배수관 바닥에서 잽니다. 둘은 8 cm 차이가 나고, 그 차이에 두 번 속았습니다.

[^workshop]: 2024년 가을 구청 워크숍입니다. 유인물은 창고 영수증 폴더에 있습니다.
`
};
