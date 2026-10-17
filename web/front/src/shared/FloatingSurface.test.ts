import { describe, expect, it } from "vitest";
import { floatingSurfacePosition } from "./FloatingSurface";

describe("floatingSurfacePosition", () => {
  const viewport = { height: 480, width: 320 };
  const surface = { height: 180, width: 168 };

  it("keeps a pointer menu within every viewport edge", () => {
    const position = floatingSurfacePosition(
      { bottom: 476, left: 318, right: 318, top: 476 },
      surface,
      viewport,
      "bottom-start",
      0,
      12,
    );

    expect(position).toEqual({ left: 140, top: 288 });
  });

  it("opens on the opposite side when an anchored menu has no space", () => {
    const position = floatingSurfacePosition(
      { bottom: 60, left: 18, right: 50, top: 28 },
      surface,
      viewport,
      "left-end",
      8,
      12,
    );

    expect(position).toEqual({ left: 58, top: 12 });
  });

  it("opens above a low trigger instead of covering it", () => {
    const position = floatingSurfacePosition(
      { bottom: 440, top: 416, left: 60, right: 84 },
      surface,
      viewport,
      "bottom-start",
      8,
      12,
    );
    expect(position.top + surface.height).toBeLessThan(416);
    expect(position.left).toBe(60);
  });

  it("keeps a control menu above its trigger when there is room", () => {
    const position = floatingSurfacePosition(
      { bottom: 270, top: 246, left: 60, right: 84 },
      { height: 110, width: 168 },
      viewport,
      "top-start",
      8,
      12,
    );
    expect(position.top + 110).toBeLessThanOrEqual(238);
  });
});
