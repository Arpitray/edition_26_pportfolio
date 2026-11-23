"use client";

import { useEffect, useState } from "react";
import { chapters, person } from "@/content/site";
import { scrollToId } from "@/lib/scroll";

// The fixed index on the left: table of contents and progress in one. The chapter whose
// section crosses the middle of the screen is the active one.
export default function ChapterIndex() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.chapter || e.target.id);
      }),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    // A chapter is its section (by id) plus any extra pieces marked data-chapter="<id>",
    // such as the About opener inside the hero.
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el && !el.dataset.chapter) observer.observe(el);
      document.querySelectorAll(`[data-chapter="${c.id}"]`).forEach((part) => observer.observe(part));
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-44 flex-col justify-between p-5 mix-blend-difference text-white md:flex">
      <a href="#top" className="pointer-events-auto font-display text-[15px] font-semibold leading-[1.05]">
        {person.name}
        <br />
        <span className="font-normal opacity-70">{person.edition}</span>
      </a>
      <nav className="pointer-events-auto">
        <ul className="space-y-[2px]">
          {chapters.map((c) => {
            const on = active === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => scrollToId(c.id)}
                  className={`flex w-full items-baseline justify-between font-display text-[15px] leading-tight transition-opacity duration-300 ${on ? "font-semibold opacity-100" : "opacity-40 hover:opacity-80"}`}
                >
                  <span>{c.label}</span>
                  <span className="text-[10px] tracking-wide">{on ? "······ " : ""}{c.numeral}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
