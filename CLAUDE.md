# How an Art School Keeps a City Awake

A RISD data visualization class project, built by two people working in parallel
with Claude Code.

## The project

An interactive web piece about **15 West** (a RISD dorm at 15 Westminster St,
Providence) and the office buildings around it at night. The point: RISD students
working late keep downtown lit and alive, while the offices go dark.

- **Audience:** RISD students.
- **Opening ("Where the Light Falls"):** the background to the story: downtown
  goes dark after work, empty offices, Jane Jacobs' "eyes upon the street", light
  and crime. Context, not a statistics page. Design: "ds3 data vis 1.ai" poster.
- **Core experience (after the opening):** 15 West, big, in the middle of its
  street, with its neighbors either side (DarrowEverett, Textron, US Marshals,
  Barton Gilman, Metropark, Merchants Bank; drawn from the Figma photos, with
  their real window totals and lit counts). When the street scrolls into view
  every building draws itself: outline first, then the windows one by one from
  the bottom floor up, then the dark textured walls fill in. Lit windows then
  glow, the neighbors dimmer than 15 West. The cursor is a flashlight over
  15 West; tapping a lit window that has a story (they flicker) opens one story
  card about that room. One story at a time. A switch (starts on) turns 15 West's
  lights off: the street goes dark and the count drops from 197 to 87 lit
  windows. Every decision should serve that feeling of looking up at the
  building at night.

## Tech rules

- Plain HTML, CSS and JavaScript. No frameworks, no build step, no npm packages.
- Must work on desktop and phone (test at 375px wide). No sideways scrolling.
  Phones have no hover: a tap moves the flashlight, and a second tap opens a window.
- Keep code simple and commented in plain language. Both owners are designers.

## Design rules

- The design lives in Figma (file "DS3 Visualisation", page "website") and story
  cards in Illustrator ("ds3 data vis 2.ai"). Match them closely: colors, fonts,
  spacing, layout.
- Build **one section at a time**. When a section is done, stop and ask for the
  next frame (link or screenshot) instead of inventing a design.
- Visual language: black, magenta, orange and yellow; film grain texture;
  Helvetica Neue for text; Degular Mono (Adobe Fonts, linked in index.html) to
  label data and statistics. Story cards are grainy gradient panels with the
  story in Helvetica and "time · Floor · room" in mono underneath; each card is
  the same color as the window it opens from.
- All colors, fonts, type sizes and spacing come from CSS variables in
  `base.css`. Never hard-code a color or font in another file. If Figma
  uses a value that isn't a variable yet, add it to `base.css` (see shared files).

## File structure and owners

All files sit loose at the top level, with no folders, so they can be uploaded
through the GitHub website (its upload button doesn't keep folders). Keep it
that way.

| File | What it is | Owner |
|---|---|---|
| `index.html` | Page shell: one empty container per section | Shared |
| `base.css` | Colors, fonts, spacing, grain as CSS variables | Shared |
| `lights.json` | Lit-window counts per building | Shared |
| `stories.json` | Stories behind lit 15 West windows | Shared |
| `history.js` | Opening section, "Where the Light Falls" | Not assigned yet |
| `history.css` | Styles for the opening section | Not assigned yet |
| `windows.js` | Facade, flashlight, story card | **Person A** |
| `windows.css` | Styles for the facade and story card | **Person A** |
| `story.js` | Intro, narrative text, legend, credits | **Person B** |
| `story.css` | Styles for the story sections | **Person B** |
| `streetlights.js` | "Buildings' Windows Light in Street Light Equivalent" section | **Anna** |
| `streetlights.css` | Styles for the street-light section | **Anna** |

Person A = [NAME A], Person B = [NAME B]. Replace these with real names.

## Team rules (follow these every time)

1. **Never edit files owned by the other person.** If a change is needed there,
   stop and tell the user what to ask their teammate for.
2. **Shared files** (`index.html`, `base.css`, `lights.json`, `stories.json`): only small, focused
   changes, committed on their own with a clear message, so the teammate can
   review them. Tell the user to give their teammate a heads up.
3. **Work on your own branch**, never directly on `main`. Name branches
   `yourname/what-it-does`, e.g. `maya/window-glow`. Merge into `main` through a
   pull request on GitHub.
4. **Keep commits small:** one idea per commit, with a message that says what
   changed in plain words.
5. Before starting work, pull the latest `main` into your branch.

## Data

**`lights.json`**: real counts of lit windows, counted from photos taken on
Westminster St. One entry per observation: building, day, time (24-hour), number
of windows lit. Each building lists its total windows (`null` = not counted yet).

```json
{ "building": "15west", "day": "Monday", "time": "23:00", "lit": 110 }
```

**`stories.json`**: one entry per story: text, time, floor, room. Each story sits in the lit
window with its exact room number: room 605 = floor 6, position 05.

The facade has 10 floors with room positions 00-21 on each, left to right.
Positions 04, 08 and 16 are solid wall, so 10 x 19 = 190 windows, matching our
count. It shows the Monday 11 PM count (`FACADE` at the top of `windows.js`). We
only know *how many* windows were lit, not exactly which ones, so story windows
are always lit and the rest are spread out at random (the same way on every
visit). Only story windows can be tapped; they flicker so people find them. Never
show placeholder text for windows without a story.

## Running it locally

The page loads the data files, so browsers block it if you just double-click
`index.html`. From this folder run:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000. If the page looks out of date, press Cmd+Shift+R.

## Deploying

GitHub Pages serves `main` from the repo root. Every merge into `main` updates the
live site within a minute or two. Nothing else to configure.
