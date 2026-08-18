"use client";

import { useState } from "react";

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items, title }: { items: FaqItem[]; title: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq">
      <h2>{title}</h2>
      {items.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
          <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
            <span>{f.q}</span>
            <span className="faq-toggle">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && <div className="faq-a">{f.a}</div>}
        </div>
      ))}
    </section>
  );
}
