import React, { useEffect, useRef, useState } from "react";
import { extractLayerPalette } from "../processing/adjustColor";
import { useSpriteStore } from "../state";

const CELL = 22;
const GAP = 2;
const STEP = CELL + GAP;
const OVERSCAN = 3;
const MAX_COLORS = 1024;

type PaletteState =
  | { state: "none" }
  | { state: "empty" }
  | { state: "tooMany" }
  | { state: "ok"; colors: string[] };

export function PaletteDisplay(): React.ReactNode {
  const currentSprite = useSpriteStore((s) => s.currentSprite);
  const selectedLayerNames = useSpriteStore((s) => s.selectedLayerNames);

  const [result, setResult] = useState<PaletteState>({ state: "none" });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const layerNames = [...(selectedLayerNames ?? [])];
    if (!currentSprite || layerNames.length === 0) {
      setResult({ state: "none" });
      return;
    }
    let cancelled = false;
    const sheet = currentSprite.sheet.data;
    const sprite = currentSprite.sprite.data;
    const timer = setTimeout(() => {
      extractLayerPalette(sheet, sprite, layerNames, MAX_COLORS).then((r) => {
        if (cancelled) return;
        if (!r) setResult({ state: "none" });
        else if (r.tooMany) setResult({ state: "tooMany" });
        else if (r.colors.length === 0) setResult({ state: "empty" });
        else setResult({ state: "ok", colors: r.colors });
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentSprite, selectedLayerNames]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let body: React.ReactNode;
  if (result.state === "tooMany") {
    body = <div className="palette-msg">no palette detected</div>;
  } else if (result.state === "none") {
    body = (
      <div className="palette-msg">Select layer(s) to view their palette.</div>
    );
  } else if (result.state === "empty") {
    body = <div className="palette-msg">No colors in selection.</div>;
  } else {
    const colors = result.colors;
    const cols = Math.max(1, Math.floor((viewport.width - GAP) / STEP));
    const rowCount = Math.ceil(colors.length / cols);
    const totalHeight = rowCount * STEP;
    const firstRow = Math.max(0, Math.floor(scrollTop / STEP) - OVERSCAN);
    const lastRow = Math.min(
      rowCount,
      Math.ceil((scrollTop + viewport.height) / STEP) + OVERSCAN,
    );
    const cells: React.ReactNode[] = [];
    for (let row = firstRow; row < lastRow; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (i >= colors.length) break;
        const color = colors[i];
        cells.push(
          <div
            key={i}
            title={color}
            style={{
              position: "absolute",
              top: row * STEP,
              left: col * STEP,
              width: CELL,
              height: CELL,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />,
        );
      }
    }
    body = (
      <div style={{ position: "relative", height: totalHeight }}>{cells}</div>
    );
  }

  return (
    <div
      className="palette-display"
      ref={scrollRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {body}
    </div>
  );
}
