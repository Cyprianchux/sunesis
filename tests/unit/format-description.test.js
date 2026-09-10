import { describe, it, expect } from "vitest";

function formatDescription(rawText = "") {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    if (/^([-*•])\s+/.test(trimmed)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.replace(/^([-*•])\s+/, "")}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (trimmed === "") {
      html += "<br>";
    } else {
      html += `<p>${trimmed}</p>`;
    }
  }

  if (inList) html += "</ul>";
  return html;
}

describe("formatDescription", () => {
  it("handles empty input", () => {
    const result = formatDescription("");
    expect(typeof result).toBe("string");
  });

  it("wraps plain text in <p> tags", () => {
    expect(formatDescription("Hello")).toBe("<p>Hello</p>");
  });

  it("handles multiple lines", () => {
    const result = formatDescription("Line 1\nLine 2");
    expect(result).toContain("<p>Line 1</p>");
    expect(result).toContain("<p>Line 2</p>");
  });

  it("converts bullet points starting with - to <ul><li>", () => {
    const result = formatDescription("- Item 1\n- Item 2");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item 1</li>");
    expect(result).toContain("<li>Item 2</li>");
    expect(result).toContain("</ul>");
  });

  it("converts bullet points starting with * to <ul><li>", () => {
    const result = formatDescription("* Bullet A\n* Bullet B");
    expect(result).toContain("<li>Bullet A</li>");
    expect(result).toContain("<li>Bullet B</li>");
  });

  it("converts bullet points starting with unicode bullet", () => {
    const result = formatDescription("• Item X");
    expect(result).toContain("<li>Item X</li>");
  });

  it("handles empty lines as <br>", () => {
    const result = formatDescription("Before\n\nAfter");
    expect(result).toContain("<br>");
    expect(result).toContain("<p>Before</p>");
    expect(result).toContain("<p>After</p>");
  });

  it("handles mixed text and bullets", () => {
    const input = "Title\n\n- Bullet 1\n- Bullet 2\n\nEnd text";
    const result = formatDescription(input);
    expect(result).toContain("<p>Title</p>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Bullet 1</li>");
    expect(result).toContain("<li>Bullet 2</li>");
    expect(result).toContain("<br>");
    expect(result).toContain("<p>End text</p>");
  });

  it("normalizes Windows line endings", () => {
    const result = formatDescription("Line 1\r\nLine 2");
    expect(result).toContain("<p>Line 1</p>");
    expect(result).toContain("<p>Line 2</p>");
  });

  it("strips leading/trailing whitespace", () => {
    const result = formatDescription("  Hello  ");
    expect(result).toBe("<p>Hello</p>");
  });

  it("handles only bullet items (closing ul)", () => {
    const result = formatDescription("- A\n- B\n- C");
    expect(result).toBe("<ul><li>A</li><li>B</li><li>C</li></ul>");
  });
});
