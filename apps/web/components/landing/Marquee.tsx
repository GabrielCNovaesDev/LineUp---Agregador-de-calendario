"use client";

const ITEMS = [
  "BRASILEIRÃO", "CHAMPIONS LEAGUE", "F1", "UFC", "NBA",
  "ROLAND GARROS", "LIBERTADORES", "LOL WORLDS", "PREMIER LEAGUE",
  "NFL", "MOTOGP", "COPA DO BRASIL", "SERIE A", "LA LIGA",
  "WIMBLEDON", "OLYMPICS", "SUPERLIGA", "CSGO MAJOR",
];

export function Marquee() {
  return (
    <div className="overflow-hidden py-8 border-y border-graphite-3 bg-ink">
      <div
        className="flex w-max gap-0"
        style={{ animation: "marquee 60s linear infinite" }}
      >
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-4 px-4">
            <span className="mono text-sm md:text-base font-medium text-text-tertiary whitespace-nowrap tracking-wide">
              {item}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald flex-shrink-0" />
          </span>
        ))}
      </div>
    </div>
  );
}
