'use client';

import { RevealOnScroll } from './RevealOnScroll';

interface FeatureBlockProps {
  title: string;
  desc: string;
  bullets: string[];
  icon: string;
  reverse?: boolean;
}

export function FeatureBlock({ title, desc, bullets, icon, reverse }: FeatureBlockProps) {
  return (
    <RevealOnScroll>
      <div className={`grid lg:grid-cols-2 gap-16 lg:gap-20 items-center ${reverse ? "lg:[direction:rtl] [&>*]:lg:[direction:ltr]" : ""}`}>
        <div>
          <div className="w-11 h-11 rounded-[10px] bg-emerald/12 text-emerald flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
          </div>
          <h3 className="display text-3xl lg:text-4xl font-bold mt-4 leading-tight">{title}</h3>
          <p className="text-text-secondary mt-3.5 text-base leading-relaxed max-w-[480px]">{desc}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 items-center text-sm text-text-secondary">
                <span className="inline-flex w-[18px] h-[18px] rounded-full bg-emerald/15 text-emerald items-center justify-center flex-shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-graphite-2 border border-graphite-3 rounded-2xl p-6 min-h-[200px] flex items-center justify-center">
          <span className="mono text-xs text-text-tertiary tracking-[.14em]">MOCKUP INTERATIVO</span>
        </div>
      </div>
    </RevealOnScroll>
  );
}