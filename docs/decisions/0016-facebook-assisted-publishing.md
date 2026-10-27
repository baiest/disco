# 0016. Assisted Facebook publishing

## Context

The owner sells by posting on Facebook from a personal profile. An app cannot publish
to a personal profile. A post is the photos and videos plus a free description, like any
Facebook post; the data of each record is for the catalog, not for the post text.

## Decision

- Two ways in: one record (button on its detail screen) and a batch (the records saved in
  the current capture session, or ones picked from `/admin/publish`).
- A post holds at most 30 photos and videos (`MAX_POST_MEDIA`, one constant).
- The text starts empty for a batch and with the suggested text (title in quotes and capitals,
  notes, availability, no price or artist) for a single record; the owner edits it freely.
- Three steps: copy the text, open the phone's share sheet with the files (Facebook ignores the
  text of a share, so it is pasted), then confirm "Ya lo publiqué". The files are downloaded
  when the screen opens so the share sheet opens straight from the tap.
- When the browser cannot share files, the screen lists the files to open and save, and the
  owner attaches them from the gallery.
- Confirming sets `facebook_posted_at` to now and clears `facebook_needs_update` for all the
  records of the post. No database change was needed.

## Consequences

- The owner always taps "Publicar" in Facebook himself; the app cannot know if he did, so the
  confirmation is his word.
- Publishing from the app would need a Facebook Page and a Meta app review. Not planned.
- Only available records can be published.

## Update: the text is copied when the share sheet opens

Facebook ignores the text that another app sends together with files, and no app can fill its
composer. Copying took a separate tap that was easy to skip, so the text showed up empty in Facebook.
The "Abrir Facebook con las fotos" button now copies the text first (the clipboard stops working for a
page once the share sheet is open), then opens the sheet, and tells the owner to paste in Facebook. The
text also goes along in the share for apps that do use it, such as WhatsApp. With no text, nothing is copied.

## Update: no reminder banner on the home screen

The home screen used to show "N discos sin publicar en Facebook" with a "Publicarlos" link. It got in the
way every day, so it was removed (and its extra database query with it). Publishing stays one tap away:
"Publicar en Facebook" is in the menu, a record's page can add it to the batch, and the "Sin publicar en
Facebook" filter still lists what has never been posted.

## Update: one button instead of three steps

Opening the share sheet already copies the text by itself, and the hint shown afterwards says to paste it.
The separate "Copiar el texto" step and the "pega el texto y publica" step were removed; the screen is the
text box and one button, "Abrir Facebook con las fotos".
The grey explanation about Facebook not allowing apps to post was removed too: it only got in the way.

## Update: the publish button at the top right

The button was in the middle of the screen and not obvious. Now both places put "Publicar" at the top
right, next to the title: the home screen (it opens the publish screen, and the menu no longer has that
link) and the publish screen (it copies the text and opens Facebook with the photos). The publish screen
header is shared (`PublishHeader`); the composer draws its button into a slot of that header, so the share
state stays in one component.
