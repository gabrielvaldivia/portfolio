# Frontend text colors

Defined in `src/app/(frontend)/globals.css`. Text roles use a `text-` namespace
to avoid colliding with the existing `text-body` **font-size** utility.

| Role | CSS token | Tailwind class | Light / dark opacity |
| --- | --- | --- | --- |
| Strong | `--color-text-strong` | `text-text-strong` | 100% / 100% |
| Body | `--color-text-body` | `text-text-body` | 90% / 80% |
| Muted | `--color-text-muted` | `text-text-muted` | 60% / 60% |
| Subtle | `--color-text-subtle` | `text-text-subtle` | 40% / 40% |

- Strong: headings (including Continue reading), inline reading links, primary labels,
  hover/focus emphasis.
- Body: paragraphs, descriptions, quotes, and standard secondary controls.
- Muted: dates, captions, form placeholders, footer text/icons, secondary navigation,
  and note activity counts (not the icons).
- Subtle: decorative markers, inline Activity timestamps, and de-emphasized inactive items.

For example, `text-body text-text-body` sets both the body font size and body color.
Inherited colors are intentional; children need not repeat their parent's role.
Do not stack static opacity classes on a text role to create another gray.
Visibility animations, disabled states, and whole-card hover transitions can still use opacity.

## Other surfaces and states

`text-inverse-muted` is the 60% muted role for inverse tooltip surfaces.
`text-on-media-*` roles stay white over photography/video; `text-on-light*` stays
black on fixed light surfaces. `text-on-accent`, `text-error`, and `text-like*`
preserve colored-state contrast. Existing `inverse` and `nav-active-text` tokens
still describe text on inverted surfaces. `content` remains available for non-text
surfaces, borders, and focus rings; use a text role for text and icons.

Activity notification icons use `text-like` (red), `text-highlight` (amber, adjusted
for light/dark contrast), and `text-chat` (the existing blue accent).

The CMS admin, email templates, developer toolbar, and decorative effect palettes
are outside this frontend text migration. Editor typography still has its own
theme colors. The design-system page shows all four frontend text roles.

## Verification

- `node --test tests/text-color-tokens.test.mjs`
- Run `tests/text-color-tokens.browser.js` through `agent-browser eval --stdin`
  on a local note, in light and dark themes at mobile and desktop widths.
