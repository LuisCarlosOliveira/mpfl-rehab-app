# Validation of the body map points (Session and Setup)

Date: 2026-11-09. Task T39. The user said that the skeleton jumps around the image. This file records what I measured and what I repaired. The proof ran in the real built app, with Chromium and a clip as the fake webcam (Method B of `docs/clip-analysis.md`). The build went to a private folder and a private preview port. No clip and no screenshot is in the repository.

## Method

- Clips: 01 heel slide, 02 heel slide with cuts, 03 and 04 straight leg raise, 05 mini squat (side), 06 seated hold. Also 07 mini squat (front) and 08 oblique leg raise. Clip 09 is clip 03 turned left to right (new, to test the mirror).
- Real clicks: protocol file, exercise, red flag check, leg, camera, "Start exercise". The Session opens and shows the map.
- A sampler in the page read the overlay circles on every animation frame. A screenshot of the camera area came each 1.2 s. I read the screenshots with the Read tool (contact sheets of 8).
- Mapping check: the box of the picture (object-fit contain) and the box of the map (view box, meet) were computed for every screenshot. The largest difference is 0.0 px on all clips and all rounds. So the map and the picture use one box and one mirror.
- Jitter: the step of a point between two updates, in percent of the picture width. Only windows of 1 s count where the point moves less than 1 percent.
- Spike: a point that moves more than 2.5 percent and comes back to within 0.4 of that step in the next 2 or 3 updates.
- Text hop: the angle text or the leg text moves more than 5 percent of the width while the knee moves less than 3 percent. A scene cut moves both, so a cut is not a hop.
- The machine was busy (load average 11 to 16, other sessions). The update rate changed between rounds from 6 to 17 each second. So only runs that follow each other (round 1, old against new) are a fair comparison.

## Findings before any repair (round 0, 7 clips)

| Question | Result |
|---|---|
| Is a point on the right joint? | Yes on clips 01, 03, 06, 07, 09 and on the standing frames of clip 05. See the list below for the faults. |
| Is the mapping (mirror, crop, aspect, letterbox) correct? | Yes. 0.0 px difference between the picture box and the map box on every screenshot. |
| Is the raw landmark noisy when the person is still? | No. Mean step 0.10 to 0.26 percent of the width, p95 0.31 to 0.74 percent at 6 updates each second. An offline One Euro filter on the saved landmarks changed the still step from 0.05 to 0.05 percent at 30 fps. Smoothing is not the cause. |
| Does a point leave its place for one update and come back? | Yes. 11 spikes on 7 clips (3 to 15 percent of the width). At a higher rate, 22 spikes on 8 clips. These are the visible jumps. |
| Do the texts hop? | Yes. The angle text "N° estimated angle" moved with the angle of the arc and changed side at the middle of the picture. Without cuts: 16 hops of the angle text and 4 of the leg text on 8 clips (round 1, old build). |
| Do the two texts lie on each other? | Yes, on a level or slanted thigh (clips 01, 04, 06 on the screenshots). |
| Does a point go to the other leg? | The chosen leg sometimes follows the other leg when the legs lie close (clip 04, close-up, the straight leg is drawn while the other knee is up). This is the leg identity of the pose model, not the mapping. I did not repair it. |
| Is the update rate low? | Yes on this busy machine: 6 to 17 updates each second, so a fast lift moves 3 to 5 percent between updates. This looks like jumping. The rate is the speed of the pose loop (`docs/live-test/exercise-flows.md`, frame rate). I did not change the loop. |

## Cause

Not noise and not the mapping. There are three causes. (1) Single-update spikes of the raw landmarks. (2) Texts that change place and side with the angle. (3) Texts that lie on each other. A low update rate adds to the effect.

## Repairs

1. A spike filter in `app/src/ui/BodyMap.tsx` for the drawing only. A point that is further than 2 percent of the width from where a steady move puts it waits for at most 2 updates. If the later updates agree, it is drawn. The pipeline, the angle, the counters and the safety rules read the raw landmarks and are not changed. The constants `SPIKE_FRACTION` and `MAX_HOLD` are ENGINEERING values with a comment.
2. The angle text sits on the inner side of the picture at the height of the knee. It changes side only when the knee is 6 percent past the middle.
3. The leg label moves above the angle text when the two boxes cross.
4. The switch "Hide body map" sits on the corner of the camera picture in Session. A first try put it in the header row. At 390 px the title became 0 px wide and the header was 255 px high. A row under the picture pushed the angle under the fixed bar. The layout check caught both. With the switch on the picture, the header is 48 px and the gaps are the same as before the map (see layout below).

## Rounds

Totals for the clips of each round. Spikes use the definition above. Text hops are without cuts. The update rate was not the same in every round.

| Round | Build | Clips | Spikes | Still step p95 (percent of width) | Angle text hops | Leg text hops | Mapping difference |
|---|---|---|---|---|---|---|---|
| 0 | original, 6 to 7 updates each second | 7 | 11 | 0.31 to 0.74 | not measured | not measured | 0.0 px |
| 1 old | original, same hour as 1 new | 8 | 22 | 0.10 to 0.32 | 16 | 4 | 0.0 px |
| 1 new | spike filter 3 percent, 1 update, texts on the inner side | 8 | 15 | 0.13 to 0.41 | 2 | 1 | 0.0 px |
| 2 | spike filter 2 percent, 1 update | 8 | 12 | 0.14 to 0.37 | 2 | 4 | 0.0 px |
| 3 | plus the leg label above the angle text, new clip 09 | 9 | 14 | 0.14 to 0.34 | 3 | 5 | 0.0 px |
| 4 | spike filter 2 percent, up to 2 updates | 9 | 9 | 0.11 to 0.58 | 1 | 6 | 0.0 px |

Round 1, old build against new build, same hour:

| Clip | Spikes old / new | Still step p95 old / new | Angle text hops old / new |
|---|---|---|---|
| 01 | 0 / 0 | 0.22 / 0.22 | 9 / 0 |
| 02 | 8 / 4 | 0.22 / 0.20 | 1 / 1 |
| 03 | 0 / 0 | 0.29 / 0.22 | 0 / 0 |
| 04 | 5 / 0 | 0.32 / 0.41 | 0 / 0 |
| 05 | 3 / 1 | 0.10 / 0.13 | 1 / 0 |
| 06 | 4 / 3 | 0.15 / 0.15 | 4 / 0 |
| 07 | 0 / 0 | 0.23 / 0.29 | 0 / 0 |
| 08 | 2 / 7 | 0.26 / 0.35 | 1 / 1 |

Clip 08 had more spikes with the new build in this pair (7 against 2). The round 4 run of clip 08 had 0.

Round 4, final build:

| Clip | Spikes | Still step mean / p95 | Angle text hops | Leg text hops | Hide and show changes of the chosen leg |
|---|---|---|---|---|---|
| 01 | 3 | 0.07 / 0.27 | 0 | 0 | 6 |
| 02 | 2 | 0.06 / 0.18 | 1 | 3 | 48 |
| 03 | 0 | 0.09 / 0.31 | 0 | 0 | 0 |
| 04 | 0 | 0.10 / 0.34 | 0 | 1 | 12 |
| 05 | 1 | 0.03 / 0.11 | 0 | 1 | 58 |
| 06 | 3 | 0.04 / 0.14 | 0 | 0 | 6 |
| 07 | 0 | 0.11 / 0.37 | 0 | 0 | 0 |
| 08 | 0 | 0.17 / 0.58 | 0 | 0 | 14 |
| 09 | 0 | 0.12 / 0.40 | 0 | 1 | 0 |

## What I read on the screenshots

- Right joint of the right leg: clips 01, 03, 06, 07 (the image-left leg in the front view) and 09. Also the standing frames of clip 05 and the wide frames of clip 04.
- Faults, not repaired. (a) Clip 05, close-up of a squat from behind. The chosen leg is a nearly level line across the picture, not on the leg. (b) Clip 04, close-up: the drawn leg is the straight leg while the other knee is up. (c) Clip 02, close-ups and the top view: points are missing or lie on the wrong part, and the labels "Knee not seen" show. (d) Clip 08. The points follow the raised leg when it is seen. The labels "Knee not seen" and "Ankle not seen" show while the therapist hides the leg.
- The remaining spikes in round 4 are 9. Most lie at a scene cut or at the loop of the clip (clip 01 at 31 s, clip 02 at 12 s). Some are small (3 to 7 percent) on clip 06.
- The remaining leg text hops lie on clip 02 (cuts that move the hip and not the knee).

## Layout (R3-02 and R3-03 with the map)

Measured with the real build, the same gaps as `e2e/app-session-layout.spec.ts`. A positive gap means above the fixed bar. The build before the map is the commit 2ccb4ad.

| Size and exercise | Header | Gap of the angle, before the map | Gap of the angle, with the map | Sideways scroll |
|---|---|---|---|---|
| 390 x 844, heel slide | 48 px | 79 | 79 | no |
| 390 x 844, straight leg raise | 48 px | 11 | 11 | no |
| 360 x 640, heel slide | 48 px | 79 | 79 | no |
| 360 x 640, straight leg raise | 56 px | 3 | 3 | no |
| 320 x 640, straight leg raise | 56 px | -2 | -2 | no |

The picture stays in the first view. The gap at 320 x 640 is the same as before the map. The picture height is the same too. The e2e spec was not run by me. The numbers come from my own script with the same gaps.

## Gate G1

- Update cost of the map in Chromium, without React state, over saved landmarks of a whole body (5,520 and 3,276 and 7,676 updates). The median is 0.1 to 0.2 ms and the p95 is 0.4 to 0.5 ms. The p99 is 1.6 to 4.4 ms and the maximum is 8.7 to 13.1 ms on a busy machine. The p95 is below 2 ms. The p99 is not.
- The same check in the unit test `tests/ui/bodyMapStable.test.tsx` (jsdom, 300 updates): p95 below 2 ms.
- Pose loop rate with the map on and off, same clip, 3 pairs of 20 s:

| Pair | Map on: mean / median fps, p95 interval | Map off: mean / median fps, p95 interval |
|---|---|---|
| 1 (on first) | 6.0 / 6, 216.7 ms | 8.7 / 8.6, 166.6 ms |
| 2 (off first) | 15.1 / 20, 166.7 ms | 6.3 / 6, 216.7 ms |
| 3 (on first) | 17.1 / 20, 66.8 ms | 20.3 / 20, 66.7 ms |

The load of the machine changed between the runs of a pair, so the rate moved from 6 to 20 each second. Only pair 3 ran in one regime. There the median is the same (20) and the p95 interval is the same (66.8 and 66.7 ms). The mean is 3.2 fps lower with the map. The G1 limit of 1 fps for the median is met in pair 3 and NOT PROVEN in pairs 1 and 2. The cost of one update (above) is the stronger number.

## Not perfect

- NOT PERFECT: 9 spikes remain on 9 clips in round 4 (22 on 8 clips before). They are mostly at cuts and at the loop of a clip. I cannot tell a cut from a spike with landmarks only.
- NOT PERFECT: the still step p95 is above 0.4 percent of the width on clip 08 (0.58) and clip 09 (0.40) in round 4. Both runs had a low update rate, so each step is larger. At the higher rates of rounds 1 to 3, p95 was 0.41 or less on every clip.
- NOT PERFECT: leg text hops stay at 1 to 6 for 9 clips. They come from cuts that move the hip and not the knee.
- The wrong-leg and close-up faults of the pose model are not repaired. The map shows what the model returns.
- The update rate of the pose loop is the main reason for a stepping look on a busy machine. A Worker for the pose loop is the decision of the user (plan section 11).
- The real camera of the user was not used. The clips are public videos with a person who stays in the picture.

## Proposal for the user (not built)

The user asked again for live feedback on whether the form is correct. The guardrails forbid the words correct and incorrect and any score. No source defines a correct form after MPFL surgery. The app already has a neutral cue against the limit that the care team set: "close to your limit" and "stop at your limit". The gauge shows the same limit as a quiet mark. I built nothing new for this.
