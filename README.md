# RAAKH lyric visualiser

A webapp that turns synced lyrics into vertical lyric videos in the style
of Instagram lyric reels, plus five other looks that are deliberately
unrelated to that style.

## Run it

```sh
npm install
npm run dev
```

`npm run build` typechecks and builds. `npm test` runs the unit tests.

## The six presets are six engines, not six themes

The old set (Swiss Grid, Letterpress, Riso, Analog Tuner, Night Journal,
Acid Kinetic) shared one centred word renderer and only changed palette,
font and frame size. That set is deleted. Every preset below has its own
draw path in `src/lib/render/Visualizer.ts`, its own background in
`src/lib/render/background.ts`, and differs from the other five on layout,
reading unit, motion and type at the same time. A future preset that only
changes a colour does not belong here.

| Preset | Layout | Reading | Motion | Type and background |
| --- | --- | --- | --- | --- |
| Raakh Grunge | One word, dead centre, 9:16 | One word at a time | Hard cut, then glitch | Distressed solid red/white on black, rain on glass over everything |
| Singalong Stage | Full line, bottom third, 16:9 | Whole line, word fill | Colour fill plus sweeping underline | Clean fill under a spotlight, next line faint below |
| Kinetic Collage | Scattered, rotated, overlapping, 1:1 | New word over a word collage | Slam, rotate and settle | Distressed poster type on cream paper with a black and red frame |
| Terminal Scroll | Left aligned scrolling log, 4:5 | Scrolling transcript, 7 lines | Lines scroll up, cursor blinks | Green monospace on black, block progress bar |
| Neon Sign | One word, sign plus reflection, 16:9 | One word, lit | Flicker on, steady glow | Outline only neon over a perspective grid floor |
| Comic Pop | Word inside a speech bubble, 4:5 | One word in a bubble plus caption strip | Pop with overshoot and wobble | Heavy black type in a white bubble over halftone dots |

Rain and glitch are gated to Raakh Grunge in code, not just set to zero
in the other presets. The regression test in
`src/lib/render/themes.test.ts` asserts that layout, reading, motion and
background are all unique across the six presets.

## Notes

- Lyrics come from LRCLIB search, pasted LRC, or manual timing in the app.
- Export captures the live canvas, so the exported video is exactly the
  preset you previewed.
- The Windows now-playing bridge in `bridge/` is optional and only used
  for live detection.
