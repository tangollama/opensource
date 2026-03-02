const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
  // ---------------------------------------------------------------------------
  // Plugins
  // ---------------------------------------------------------------------------

  // Syntax highlighting for code blocks (uses Prism.js under the hood)
  eleventyConfig.addPlugin(syntaxHighlight);

  // ---------------------------------------------------------------------------
  // Passthrough file copies
  // Assets are copied verbatim to _site — no processing by Eleventy
  // ---------------------------------------------------------------------------

  eleventyConfig.addPassthroughCopy("src/assets");

  // ---------------------------------------------------------------------------
  // Markdown configuration
  // markdown-it with table support; markdown-it-anchor adds id="" to headings
  // ---------------------------------------------------------------------------

  const md = markdownIt({
    html: true,       // allow inline HTML in Markdown files
    linkify: true,    // auto-convert URLs to links
    typographer: true // smart quotes and dashes
  })
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink(), // clickable # anchor on headings
      slugify: (s) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
    });

  // Enable Markdown table support (built-in to markdown-it; tables need no plugin)
  md.enable("table");

  eleventyConfig.setLibrary("md", md);

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  // Readable date: turns a Date/ISO string into e.g. "March 2, 2026"
  eleventyConfig.addFilter("dateReadable", (dateStr) => {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  // ---------------------------------------------------------------------------
  // Directory configuration
  // ---------------------------------------------------------------------------

  return {
    // Use Nunjucks to process Markdown front matter and template files
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",

    dir: {
      input: "src",       // source files live here
      output: "_site",    // built site goes here (gitignored)
      includes: "_includes",
      data: "_data"
    }
  };
};
