import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "@wiki/frontend/routes/projects/$projectId/documents/-components/markdown-preview";

function renderMarkdown(markdown: string): string {
  return renderToStaticMarkup(<MarkdownPreview markdown={markdown} />);
}

describe("MarkdownPreview", () => {
  it("renders GitHub-flavored markdown tables, task lists, and standard formatting", () => {
    const html = renderMarkdown(
      [
        "# Plan",
        "",
        "**Bold** and _italic_ and ~~removed~~.",
        "",
        "| Item | Status |",
        "| --- | --- |",
        "| Alpha | Ready |",
        "",
        "- [x] Checked",
        "- [ ] Open"
      ].join("\n")
    );

    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<del>removed</del>");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Item</th>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  it("does not render raw HTML and strips unsafe markdown output", () => {
    const rawHtml = renderMarkdown(
      [
        "Before",
        '<img src="x" onerror="alert(1)">',
        '<script>alert("bad")</script>',
        "After"
      ].join("\n")
    );
    const unsafeMarkdown = renderMarkdown(
      [
        "[unsafe](javascript:alert(1))",
        '![bad](javascript:alert("bad"))'
      ].join("\n")
    );

    expect(rawHtml).not.toContain("<script");
    expect(rawHtml).not.toContain("onerror");
    expect(rawHtml).not.toContain("<img src=\"x\"");
    expect(rawHtml).toContain("Before");
    expect(rawHtml).toContain("After");
    expect(unsafeMarkdown).not.toContain("javascript:");
    expect(unsafeMarkdown).toContain("<a>unsafe</a>");
    expect(unsafeMarkdown).toContain('<img alt="bad"/>');
  });

  it("renders messy AI-generated markdown without throwing", () => {
    const messyMarkdown = [
      "## Mixed output",
      "",
      "1. First item",
      "   - nested bullet",
      "```ts",
      "const value = '<section>not html</section>';",
      "",
      "| half | table |",
      "| --- |",
      "| kept |"
    ].join("\n");

    expect(() => renderMarkdown(messyMarkdown)).not.toThrow();
    expect(renderMarkdown(messyMarkdown)).toContain("Mixed output");
  });
});
