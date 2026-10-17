import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Component actions share one rail, regardless of the Discord payload format. */
export function NodeToolbar({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  const rail = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState(false);
  const [clearance, setClearance] = useState(0);
  useLayoutEffect(() => {
    const node = rail.current?.closest<HTMLElement>(".editor-node");
    if (!node) return;
    const isRoot = !node.parentElement?.closest(".editor-node");
    setRoot(isRoot);
    const avatar = node
      .closest(".editor-canvas")
      ?.querySelector(".message-canvas > img");
    if (!isRoot || !avatar) return;
    const update = () =>
      setClearance(
        Math.max(
          0,
          avatar.getBoundingClientRect().bottom -
            node.getBoundingClientRect().top +
            8,
        ),
      );
    update();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);
    observer?.observe(node);
    observer?.observe(avatar);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div
      className="node-controls-rail"
      data-root={root || undefined}
      ref={rail}
      style={{ "--author-clearance": `${clearance}px` } as CSSProperties}
    >
      <div className={`node-controls${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    </div>
  );
}
