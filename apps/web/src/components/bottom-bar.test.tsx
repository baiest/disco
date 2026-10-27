import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BottomBar } from "./bottom-bar";

type Listener = () => void;

function stubViewport(visualHeight: number) {
  const listeners = new Set<Listener>();
  const viewport = {
    height: visualHeight,
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
  return {
    resize(height: number) {
      viewport.height = height;
      act(() => {
        listeners.forEach((listener) => {
          listener();
        });
      });
    },
    count: () => listeners.size,
  };
}

const bar = () => screen.getByTestId("bottom-bar");

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
});

describe("BottomBar", () => {
  it("sticks to the bottom of the screen", () => {
    stubViewport(800);
    render(
      <BottomBar>
        <button type="button">Guardar</button>
      </BottomBar>,
    );
    expect(bar().className).toContain("fixed");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  it("steps out of the way while the keyboard is open, and comes back", () => {
    const viewport = stubViewport(800);
    render(<BottomBar>x</BottomBar>);
    viewport.resize(450);
    expect(bar().className).not.toContain("fixed");
    expect(screen.getByText("x")).toBeTruthy();
    viewport.resize(800);
    expect(bar().className).toContain("fixed");
  });

  it("is not fooled by turning the phone sideways", () => {
    const viewport = stubViewport(800);
    render(<BottomBar>x</BottomBar>);
    Object.defineProperty(window, "innerWidth", { value: 844, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 390, configurable: true });
    viewport.resize(390);
    expect(bar().className).toContain("fixed");
  });

  it("works where the browser has no visual viewport", () => {
    render(<BottomBar>x</BottomBar>);
    expect(bar().className).toContain("fixed");
  });

  it("stops listening when it goes away", () => {
    const viewport = stubViewport(800);
    const { unmount } = render(<BottomBar>x</BottomBar>);
    expect(viewport.count()).toBeGreaterThan(0);
    unmount();
    expect(viewport.count()).toBe(0);
  });
});
