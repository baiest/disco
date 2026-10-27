# 0018. Home screen layout

## Context

The first version of the inventory screen put everything at the same level: a button to add,
a search box with its own button, five filters on three rows, the list, a publish button and a
sign out button at the end. On a phone the main action scrolled away and the secondary ones
took the place of important ones. The owner called the experience poor.

## Decision

- The header has the title and a hamburger menu. The menu holds what is not needed every day:
  publish on Facebook and sign out.
- Search is one field with a magnifier button inside it (Enter also works). The five filters
  sit on one row that scrolls sideways.
- "Add record" is a bar fixed at the bottom, always visible, because it is the main action.
- A notice above the list says how many available records were never posted on Facebook and
  links to the publish screen. It shows only on the plain list, not while searching or filtering.
- Each album is a card with its picture. One copy: the whole card opens it. Several copies:
  the card lists each copy as a link.
- Pictures are the first image of any copy (a video cannot be a thumbnail), as signed links of one
  hour, signed in one call. The list shows at most 50 albums because the pictures are the
  original files, not small versions.

## Consequences

- The pictures use more data than small versions would. Resizing on upload or an image service
  would fix it later.
- A page left open for over an hour shows broken pictures until it is reloaded.
- Drafts are still mixed into the list; a separate drafts view is not built.
