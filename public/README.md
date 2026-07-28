# public/

Static assets served from the site root.

- `Logo.png` and `Uni.png` are referenced by the sidebar, the chat empty state,
  the auth background and the favicon metadata. If the tab icon is missing, the
  most likely reason is that `Logo.png` is absent from this folder.
- `Logo.svg` is a vector fallback with the same artwork as `app/icon.svg`.
- `app/icon.svg` is picked up automatically by the Next.js App Router as the
  browser tab icon, so the favicon works even without `Logo.png`.
