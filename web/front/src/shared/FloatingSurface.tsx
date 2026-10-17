import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type FloatingPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "left-end"
  | "right-end";

export interface FloatingPoint {
  readonly x: number;
  readonly y: number;
}

type FloatingSurfaceProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  readonly anchorRef?: RefObject<HTMLElement | null>;
  readonly point?: FloatingPoint;
  readonly placement?: FloatingPlacement;
  readonly gap?: number;
  readonly viewportPadding?: number;
  readonly portal?: boolean;
};

/**
 * Positions menus against an element or pointer while keeping the whole surface
 * inside the visible viewport. Individual menus keep their own visual styles;
 * this primitive owns only geometry and viewport updates.
 */
export function FloatingSurface({
  anchorRef,
  children,
  className,
  gap = 8,
  placement = "bottom-start",
  point,
  viewportPadding = 12,
  portal = false,
  ...props
}: Readonly<FloatingSurfaceProps>) {
  const surface = useRef<HTMLDivElement>(null);
  const style = useFloatingSurfacePosition({
    anchorRef,
    gap,
    placement,
    point,
    surface,
    viewportPadding,
  });

  const content = (
    <div
      {...props}
      className={`floating-surface${className ? ` ${className}` : ""}`}
      ref={surface}
      style={style}
    >
      {children}
    </div>
  );
  return portal ? createPortal(content, document.body) : content;
}

function useFloatingSurfacePosition({
  anchorRef,
  gap,
  placement,
  point,
  surface,
  viewportPadding,
}: Readonly<{
  anchorRef?: RefObject<HTMLElement | null>;
  gap: number;
  placement: FloatingPlacement;
  point?: FloatingPoint;
  surface: RefObject<HTMLElement | null>;
  viewportPadding: number;
}>) {
  const [style, setStyle] = useState<CSSProperties>({
    left: 0,
    top: 0,
    position: "fixed",
    visibility: "hidden",
  });
  const pointX = point?.x;
  const pointY = point?.y;

  useLayoutEffect(() => {
    const element = surface.current;
    const anchor = anchorRef?.current;
    if (!element || (!point && !anchor)) return undefined;

    let frame = 0;
    const update = () => {
      const reference = point
        ? { bottom: point.y, left: point.x, right: point.x, top: point.y }
        : anchor!.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.clientHeight;
      const { left, top } = floatingSurfacePosition(
        reference,
        rect,
        { height, width },
        placement,
        gap,
        viewportPadding,
      );
      const above = top < reference.top;
      const below = top >= reference.bottom;
      const available = above
        ? reference.top - gap - viewportPadding
        : below
          ? height - reference.bottom - gap - viewportPadding
          : height - viewportPadding * 2;
      const maxHeight = Math.max(0, Math.floor(available));

      setStyle((current) =>
        current.left === left &&
        current.top === top &&
        current.maxHeight === maxHeight &&
        current.visibility === "visible"
          ? current
          : { left, maxHeight, position: "fixed", top, visibility: "visible" },
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(schedule);
    observer?.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [
    anchorRef,
    gap,
    placement,
    point,
    pointX,
    pointY,
    surface,
    viewportPadding,
  ]);

  return style;
}

export function floatingSurfacePosition(
  reference: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
  surface: Pick<DOMRect, "height" | "width">,
  viewport: Readonly<{ height: number; width: number }>,
  placement: FloatingPlacement,
  gap: number,
  viewportPadding: number,
) {
  const origin = placementOrigin(reference, surface, placement, gap);
  if (placement.startsWith("bottom") || placement.startsWith("top")) {
    const above = reference.top - gap - viewportPadding;
    const below = viewport.height - reference.bottom - gap - viewportPadding;
    const preferTop = placement.startsWith("top");
    const useTop = preferTop
      ? surface.height <= above || above >= below
      : surface.height > below && above > below;
    origin.top = useTop
      ? reference.top - gap - Math.min(surface.height, Math.max(0, above))
      : reference.bottom + gap;
  }
  if (reference.bottom > reference.top) {
    if (
      placement === "left-end" &&
      origin.left < viewportPadding &&
      reference.right + gap + surface.width <= viewport.width - viewportPadding
    ) {
      origin.left = reference.right + gap;
    }
    if (
      placement === "right-end" &&
      origin.left + surface.width > viewport.width - viewportPadding &&
      reference.left - gap - surface.width >= viewportPadding
    ) {
      origin.left = reference.left - gap - surface.width;
    }
  }
  return {
    left: clamp(
      origin.left,
      viewportPadding,
      Math.max(
        viewportPadding,
        viewport.width - surface.width - viewportPadding,
      ),
    ),
    top: clamp(
      origin.top,
      viewportPadding,
      Math.max(
        viewportPadding,
        viewport.height - surface.height - viewportPadding,
      ),
    ),
  };
}

function placementOrigin(
  reference: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
  surface: Pick<DOMRect, "height" | "width">,
  placement: FloatingPlacement,
  gap: number,
) {
  switch (placement) {
    case "bottom-end":
      return {
        left: reference.right - surface.width,
        top: reference.bottom + gap,
      };
    case "top-start":
      return {
        left: reference.left,
        top: reference.top - gap - surface.height,
      };
    case "top-end":
      return {
        left: reference.right - surface.width,
        top: reference.top - gap - surface.height,
      };
    case "left-end":
      return {
        left: reference.left - surface.width - gap,
        top: reference.bottom - surface.height,
      };
    case "right-end":
      return {
        left: reference.right + gap,
        top: reference.bottom - surface.height,
      };
    default:
      return { left: reference.left, top: reference.bottom + gap };
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}
