import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/es.json";
import { PageSkeleton } from "./page-skeleton";

afterEach(cleanup);

describe("PageSkeleton", () => {
  it("says the page is loading, for screen readers, and shows empty cards in its place", () => {
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <PageSkeleton />
      </NextIntlClientProvider>,
    );
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(messages.common.loading);
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll("li")).toHaveLength(4);
  });
});
