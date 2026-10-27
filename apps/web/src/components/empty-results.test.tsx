import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import { EmptyResults } from "./empty-results";

function renderEmpty(query: string, filter: "all" | "sold") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EmptyResults query={query} filter={filter} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("EmptyResults", () => {
  it("says what was searched for and how to find it", () => {
    renderEmpty("ritmo", "all");
    expect(screen.getByRole("status").textContent).toContain("No encontré «ritmo»");
    expect(screen.getByText(messages.inventory.noResultsHint)).toBeTruthy();
  });

  it("does not offer to clear a filter that is not set", () => {
    renderEmpty("ritmo", "all");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers to see everything when a filter hides the result, keeping the search", () => {
    renderEmpty("ritmo", "sold");
    expect(screen.getByRole("link", { name: messages.inventory.noResultsAll }).getAttribute("href")).toBe("/admin?q=ritmo");
  });

  it("explains a filter with nothing in it when nothing was typed", () => {
    renderEmpty("", "sold");
    expect(screen.getByRole("status").textContent).toContain(messages.inventory.noResultsFilter);
    expect(screen.getByRole("link", { name: messages.inventory.noResultsAll }).getAttribute("href")).toBe("/admin");
  });

  it("writes a typed text safely in the address", () => {
    renderEmpty("a&b c", "sold");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin?q=a%26b+c");
  });
});
