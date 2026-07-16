import { useLayoutEffect, useRef, useState } from "react";
import { categoryTint, type CategoryDto } from "@chaos-coordinator/shared";

interface CategorySelectPillsProps {
  categories: CategoryDto[];
  value: string;
  onChange: (categoryId: string) => void;
}

/** Horizontally scrollable single-select pill list, replacing the plain <select>. Shows a
 * directional arrow at either edge whenever the row overflows the available width, since
 * scrolling here has no other affordance the way a native select's dropdown does. */
export function CategorySelectPills({ categories, value, onChange }: CategorySelectPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useLayoutEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [categories]);

  function scrollByStep(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 160, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center bg-gradient-to-r from-app via-app to-transparent pr-2 text-ink"
        >
          ‹
        </button>
      )}
      <div ref={scrollRef} onScroll={updateArrows} className="flex gap-2 overflow-x-auto">
        {categories.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-bold"
              style={
                selected
                  ? { background: c.color, color: "white" }
                  : { background: categoryTint(c.color), color: c.color }
              }
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center bg-gradient-to-l from-app via-app to-transparent pl-2 text-ink"
        >
          ›
        </button>
      )}
    </div>
  );
}
