# 0023. Photo boxes and the camera or gallery question

## Context

The capture form had three buttons to add files: take a photo, record a video and choose from the
gallery. They did not show how many places were left, and the three choices competed on screen.

## Decision

- The files area is a grid of dashed boxes: one for every place left (up to 8). The first has a plus
  sign; every one of them is a button. A file added takes a box; a file removed gives it back.
- Tapping a box opens a panel from the bottom asking how to add it: camera (photo), record video, or
  gallery (several files at once). It closes with Cancel, Escape or a tap outside, and the focus starts
  on the first option.
- The three file pickers stay on the page, hidden, and the choice clicks the right one in the same tap,
  because the browser only opens a picker straight from a tap.

## Consequences

- A tap now takes two steps (box, then choice) instead of one; in exchange the screen is quieter and
  shows the limit.
- The video limit (2) is still checked when the file is picked, not shown in the boxes.
