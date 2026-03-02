---
title: Getting Started
description: How to use BibleProject open source fonts and assets in your project
order: 1
---

## Overview

This guide walks through using the BibleProject font package in a web project.
The fonts are self-hosted — no CDN dependency, no tracking.

## Prerequisites

- A web project (any stack)
- Basic familiarity with CSS `@font-face`

## 1. Download the fonts

Go to the [Downloads](/downloads/) page and grab the **BibleProject Brand Fonts** package.
Unzip the archive — you'll find `.woff2` files organized by family and weight.

```
bp-fonts/
├── display/
│   ├── BPDisplay-Regular.woff2
│   ├── BPDisplay-Bold.woff2
│   └── BPDisplay-ExtraBold.woff2
└── body/
    ├── BPBody-Regular.woff2
    ├── BPBody-Medium.woff2
    └── BPBody-Bold.woff2
```

## 2. Place the files

Copy the `.woff2` files into your project's static assets directory, for example:

```
your-project/
└── public/
    └── fonts/
        └── *.woff2
```

## 3. Declare the font faces

Add `@font-face` declarations to your global CSS:

```css
@font-face {
  font-family: "BP Display";
  src: url("/fonts/BPDisplay-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "BP Display";
  src: url("/fonts/BPDisplay-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "BP Body";
  src: url("/fonts/BPBody-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

> **Tip:** `font-display: swap` ensures body text renders immediately in a fallback font
> while the custom font loads, improving perceived performance.

## 4. Apply the fonts

```css
:root {
  --font-heading: "BP Display", system-ui, sans-serif;
  --font-body: "BP Body", system-ui, sans-serif;
}

body {
  font-family: var(--font-body);
}

h1, h2, h3 {
  font-family: var(--font-heading);
}
```

## Attribution

When using BibleProject fonts in a public project, include a note in your documentation
or about page:

> Fonts provided by [BibleProject](https://bibleproject.com).

---

Next: [Contributing](/docs/contributing/)
