# BibleProject Open Source Site

Static documentation site for BibleProject's open source projects, built with [Eleventy](https://www.11ty.dev/) and hosted on GitHub Pages.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

## Running locally

```bash
# Install dependencies
npm install

# Start the dev server with live reload (http://localhost:8080)
npm start

# Build the site to _site/
npm run build
```

## Project structure

```
src/
├── _data/        # Global JSON data (site metadata, repos list, downloads)
├── _includes/    # Nunjucks layouts and partials
│   ├── layouts/  # base.njk, page.njk
│   └── partials/ # header, footer, nav, doc-nav
├── assets/       # CSS, fonts, images (copied as-is to _site/)
├── docs/         # Documentation pages (Markdown)
├── downloads/    # Downloads page
├── repos/        # Repos listing page
└── index.njk     # Homepage
```

## Adding a repository

Edit [src/_data/repos.json](src/_data/repos.json) and add an entry:

```json
{
  "name": "your-repo",
  "description": "What this repo contains.",
  "url": "https://github.com/bibleproject/your-repo",
  "tags": ["tag1", "tag2"]
}
```

## Adding a documentation page

Create a new Markdown file in `src/docs/`:

```markdown
---
title: My New Doc
description: What this page covers
order: 3
---

Your content here.
```

The `order` field controls the position in the sidebar navigation.
The `docs.json` directory data file automatically applies the correct layout and tags.

## Adding a downloadable asset

1. Place the file in `src/assets/downloads/`
2. Add an entry to [src/_data/downloads.json](src/_data/downloads.json)

## Deploying

Pushes to `main` automatically trigger the GitHub Actions workflow at
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the site
and pushes the output to the `gh-pages` branch.

Ensure **GitHub Pages** is configured in your repository settings to serve from the
`gh-pages` branch.

## Adding brand fonts

1. Obtain the official font files from BibleProject's brand assets
2. Place `.woff2` files in `src/assets/fonts/`
3. Add `@font-face` declarations to `src/assets/css/style.css`
4. Update the `--font-sans` custom property to reference the new family

## Contributing

See [CONTRIBUTING](src/docs/contributing.md) or the live docs at `/docs/contributing/`.

---

*Built with [Eleventy](https://www.11ty.dev/).
Content from [BibleProject](https://bibleproject.com) is used in accordance with their [Terms of Use](https://bibleproject.com/terms).*
