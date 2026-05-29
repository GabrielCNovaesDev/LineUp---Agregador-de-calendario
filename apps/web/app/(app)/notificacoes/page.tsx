"use client";

import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  sport: string;
  sportIcon: string;
  read: boolean;
  type: "result" | "reminder" | "live" | "update";
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", title: "Palmeiras 2 x 1 Flamengo", description: "Brasileirao - Jogo encerrado", time: "14:32", sport: "Futebol", sportIcon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7l3.2 2.4-1.2 3.8h-4L8.8 9.4z", read: false, type: "result" },
  { id: "2", title: "F1 - GP de Monaco em 2h", description: "Largada as 10:00 - Bortoleto P8", time: "08:00", sport: "Automobilismo", sportIcon: "M3 13h2l1.2-3.2A2 2 0 0 1 8 8.5h8a2 2 0 0 1 1.8 1.3L19 13h2v3.5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3z", read: false, type: "reminder" },
  { id: "3", title: "UFC 312 - Ao vivo agora", description: "Card principal comecou", time: "07:45", sport: "MMA", sportIcon: "M7 8a4 4 0 0 1 8 0v3M7 11h11v3a4 4 0 0 1-4 4H10a3 3 0 0 1-3-3z", read: false, type: "live" },
  { id: "4", title: "Joao Fonseca avancou", description: "Roland Garros - Venceu 3 sets a 1", time: "Ontem 18:20", sport: "Tenis", sportIcon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M5 6a13 13 0 0 1 14 12M5 18A13 13 0 0 1 19 6", read: true, type: "result" },
  { id: "5", title: "Lakers 112 x 108 Celtics", description: "NBA - Jogo encerrado", time: "Ontem 00:30", sport: "Basquete", sportIcon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3.2 12h17.6M12 3a11 11 0 0 0 0 18M12 3a11 11 0 0 1 0 18", read: true, type: "result" },
  { id: "6", title: "Novo esporte adicionado", description: "Criquete agora disponivel no LineUp", time: "Seg 10:00", sport: "Sistema", sportIcon: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4", read: true, type: "update" },
];

type Group = { label: string; items: Notification[] };

function groupNotifications(notifications: Notification[]): Group[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const week: Notification[] = [];

  for (const n of notifications) {
    if (n.time.startsWith("Ontem")) yesterday.push(n);
    else if (n.time.includes(":") && !n.time.includes(" ")) today.push(n);
    else week.push(n);
  }

  const groups: Group[] = [];
  if (today.length) groups.push({ label: "Hoje", items: today });
  if (yesterday.length) groups.push({ label: "Ontem", items: yesterday });
  if (week.length) groups.push({ label: "Esta semana", items: week });
  return groups;
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupNotifications(notifications);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function clearAll() {
    setNotifications([]);
  }

  if (notifications.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="display text-2xl lg:text-[28px] font-extrabold leading-none">Alertas</h1>
            <p className="text-text-secondary text-[13px] mt-1.5">
              {unreadCount > 0 ? (
                <><span className="mono text-emerald-glow font-semibold">{unreadCount}</span>{" "}nao {unreadCount === 1 ? "lida" : "lidas"}</>
              ) : (
                "Tudo em dia"
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-emerald font-medium px-3 py-2 rounded-lg border border-graphite-3 hover:bg-graphite-2 transition-colors">
                Marcar todas
              </button>
            )}
            <button onClick={clearAll} className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-.7 12.5A2 2 0 0 1 16.3 20H7.7a2 2 0 0 1-2-1.5L5 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mono text-[11px] tracking-[.16em] text-text-tertiary uppercase mb-2">{group.label}</div>
            <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
              {group.items.map((n) => (
                <button key={n.id} onClick={() => markRead(n.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-graphite-2/50 transition-colors">
                  <span className={`w-[38px] h-[38px] rounded-full inline-flex items-center justify-center flex-shrink-0 ${n.type === "live" ? "bg-live-red/[.14]" : "bg-emerald/[.10]"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={n.type === "live" ? "text-live-red" : "text-emerald"}>
                      <path d={n.sportIcon} />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm leading-tight ${!n.read ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>
                      {n.title}
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5">{n.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="mono text-[10px] text-text-tertiary">{n.time}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-emerald" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center px-6 py-20">
      <div className="w-[104px] h-[104px] rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-6">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-graphite-3">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" /><path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      </div>
      <h2 className="display text-2xl font-extrabold">Nenhum alerta</h2>
      <p className="text-text-secondary text-sm leading-relaxed mt-2.5 max-w-[300px]">
        Quando seus times jogarem ou eventos comecarem, voce vera os alertas aqui.
      </p>
      <button className="mt-6 bg-emerald text-[#04130C] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
        Configurar alertas
      </button>
    </div>
  );
}
