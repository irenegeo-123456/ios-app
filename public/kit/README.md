# Kit asset library

Images for prototypes: Slack's photo and illustrated personas, app icons, company logos, file previews,
file-type thumbnails and gallery thumbnails. Browse them at `/?kit=assets`; use them in a prototype through the
helpers in `src/kit/assets.ts` (`persona('zoe-maxwell')`, `appIcon('jira')`, `logo('acme')`, `fileIcon('pdf')`…).
The guide is `docs/prototyping.md`.

## NOTICE: internal only

These are Slack's internal design assets. Use them for prototypes, demos and design reviews inside Slack and
Salesforce. Don't publish them, post them outside the company or ship them in a product.

- **People personas** are Slack's legal-approved persona roster. Don't rename a persona, give a photo a different
  name or edit the photos (Slack's persona guide, "Step 3: Populate with people personas"). Titles are only
  suggestions.
- **Photos are for marketing-style screens.** For screens shown *inside* Slack, the guide asks for illustrated
  personas so viewers don't mistake a persona for a real teammate. Every persona has an illustrated avatar in
  `illustrated/`, and prototypes default to illustrated avatars; photos are opt-in.
- **Company personas**: pick one of the approved companies (Acme Inc., AstroCraft, Welo Inc., LunaLab, Ollie Inc.;
  see `src/data/personas.ts`) and use its designated logo. Don't mix and match.
- Third-party app icons (Asana, Jira, Google, Salesforce…) belong to their owners. They're here so prototypes
  look like a real workspace.

## Where everything came from

| Folder | What | Source |
|---|---|---|
| `personas/` | 9 photo personas, Slack's marketing roster slots A–I (en-US names), 300px (Jagdeep Das 200px) | The Slacky component library in Meghan Uno's local-prototype-kit (slack-github.com/muno/local-prototype-kit), `shared/slacky/avatars/persona-a…i.png`. Names from Slack's persona table (`webapp/marketing/templates/xhp/data/lib_avatars.hack`, slots A–J) |
| `personas/` | 8 localized photo personas, 144px (Nikki Kroll, Arturo García, Sandeep Mishra, Gagan Anand, Geeta Joshi, Marcos López, Rahul Khanna, Mauricio Rodríguez) | The Slack app quick kit (internal), `public/figma/avatars/`, harvested from the Figma library "✅ Objects, Avatars & Personas - Slack". The quick kit's copies of slots A–D and G were skipped (the 300px Slacky versions are kept) |
| `illustrated/` | 27 illustrated personas: every photo persona plus Shruti Vasa (slot J) and the Acme Inc. roster names without photos (Akira Asada, Fathima Parveen, Mamadou Achebe, Carmen Vega, Madhu Sharma, Alfonso Huertas, Suguru Endo, Faisal Hasan, Emily Nishino) | Generated for this kit with DiceBear "notionists" (CC0, the style of the Northstar demo's avatars), seeded with each name. Stand-ins for Slack's own illustrated personas, which live in Figma. Roster names from `webapp/img/avatars/workspace_weaver/acme-inc` and `mock-members` (file names only; those images are Git LFS placeholders) |
| `apps/` | App icons, 144px PNG / 48px SVG: Centro, Claude, DocuVault, Field Service, Google Calendar, Google Drive, Jira, Pipeline Management, Polly, Salesforce, Seamless.AI, Service Cloud | Slack app quick kit, `public/figma/apps/` |
| `apps/` | Sales agent and Sales Cloud chart, 256px | Slack app quick kit, resized from 886×900 (680 KB) and 744×730 |
| `apps/` | Asana, 144px | Slacky, `shared/slacky/avatars/app-asana.png` (512px, resized). Slacky's Google Calendar, Polly and Slackbot avatars were skipped (the kit already has them) |
| `logos/` | Company logos, 360px: Acme Inc. (the approved persona's lowercase *a*), Croissants, Insight Labs, Luminary, PR firm, Spaceship, Test Kitchen | Slack app quick kit, `public/figma/orgs/` |
| `files/previews/` | A slide-deck title slide (1280×720) and a video clip thumbnail (930×520) | Slack app quick kit, `public/figma/files/`, re-encoded as JPEG (they were 955 KB and 638 KB PNGs). Its Google Slides icon was skipped (`files/types/google-slides.svg` is the same mark) |
| `files/types/` | 62 file-type thumbnails, 36px SVG (PDF, Google Docs, Canvas, Lists, Salesforce records…) | The Figma library "✅ Objects, Avatars & Personas - Slack", File Objects page, exported 2026-05-01. Renamed without the `file-thumbnail` prefix and `-new` suffix. The 7 Salesforce component sets (a dashed Figma frame around a light and a dark variant) were split into clean `salesforce-*.svg` and `salesforce-*-dark.svg` icons. Adobe Flash and SWF were dropped |
| `thumbnails/` | 10 gallery thumbnails, 448×312 (the Slack mark on a theme color) | Slacky, `shared/slacky/thumbnails/` |

Not copied from the Slacky kits: `tokens.css`, `components.css`, `shell.css` and `dark.css` (they redefine Slack's
production CSS with older values; this repo uses the real stylesheets in `public/slack/css/`), the fonts (Lato and
Slack-Fractions are already in `public/slack/css/`; Circular isn't used by the client) and the Slackbot sprite
(already in `public/slack/img/`).

## Adding an asset

1. Put the file in the right folder here (keep images small: 144–300px for avatars and icons, JPEG for photos
   and screenshots).
2. Add it to the catalog in `src/kit/assets.ts` (and to `src/data/personas.ts` for a person).
3. Run `npm test`: `src/kit/assets.test.ts` fails if a catalog entry has no file, a file isn't in the catalog, or
   an image's size doesn't match.
4. Add a row to the table above.
