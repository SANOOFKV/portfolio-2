# Sanoof Padikkal — Portfolio

Personal portfolio site for Sanoof Padikkal, Performance Marketer (Kerala, India).

**Live:** https://sanoofkv.github.io/portfolio/

## Stack

Static HTML + CSS. No build step, no bundler, no package manager.

| Dependency | Loaded from | Purpose |
|---|---|---|
| GSAP 3.12.5 + ScrollTrigger | cdnjs | All animation, scroll-driven timelines |
| Lenis 1.1.18 | jsDelivr | Smooth scrolling |
| Zodiak + Switzer | self-hosted (`assets/fonts/`) | Display + sans typefaces |

## Running locally

Any static server works. Opening `index.html` over `file://` mostly works, but
some browsers block local file requests, so a server is more reliable:

```bash
python -m http.server 5500
```

Then visit http://localhost:5500

## Structure

```
index.html      markup + all animation JS (inlined)
styles.css      layout, @font-face, responsive rules
assets/         portrait, logos, favicon, OG card
assets/fonts/   self-hosted woff2 files
```

## Notes

- **Fonts are self-hosted deliberately.** The Fontshare CDN intermittently
  returns "access temporarily restricted" as an HTTP 200 with a comment body,
  which fails silently to a fallback face.
- **Social meta tags use absolute URLs.** Link preview crawlers fetch the page
  from their own servers and cannot resolve relative paths. If the site moves to
  a custom domain, update `og:url`, `og:image`, `twitter:image` and the
  canonical link in `index.html`.
- Zodiak and Switzer are licensed free for commercial use via
  [Fontshare](https://fontshare.com) (Indian Type Foundry).

## Credits

Built with [Claude Code](https://claude.com/claude-code).
