"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SPORTS = [
  { id: "futebol", name: "Futebol", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7l3.2 2.4-1.2 3.8h-4L8.8 9.4z" },
  { id: "automobilismo", name: "Automobilismo", icon: "M3 13h2l1.2-3.2A2 2 0 0 1 8 8.5h8a2 2 0 0 1 1.8 1.3L19 13h2v3.5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3z" },
  { id: "mma", name: "MMA", icon: "M7 8a4 4 0 0 1 8 0v3M7 11h11v3a4 4 0 0 1-4 4H10a3 3 0 0 1-3-3z" },
  { id: "basquete", name: "Basquete", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3.2 12h17.6M12 3a11 11 0 0 0 0 18M12 3a11 11 0 0 1 0 18" },
  { id: "tenis", name: "Tenis", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M5 6a13 13 0 0 1 14 12M5 18A13 13 0 0 1 19 6" },
  { id: "volei", name: "Volei", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 3a14 14 0 0 0-6.5 16.5M21 9.5a14 14 0 0 0-15.5 3" },
  { id: "esports", name: "E-sports", icon: "M2.5 8h19v9a4.5 4.5 0 0 1-4.5 4.5h-10A4.5 4.5 0 0 1 2.5 17V8zM7 11.2v2.6M5.7 12.5h2.6" },
  { id: "ciclismo", name: "Ciclismo", icon: "M6 16m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M18 16m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M6 16l4-7h5l3 7" },
  { id: "surfe", name: "Surfe", icon: "M4.5 18.5c4 1.2 8.5-2 12.5-8.5 1.4-2.3 2.6-4.4 3-5-3.4.6-7.6 3-11 7.5-2 2.6-3.4 5.2-4.5 6z" },
];

const TEAMS = [
  { id: "palmeiras", name: "Palmeiras", sport: "Futebol", color: "#0E5C3A", initials: "PAL" },
  { id: "flamengo", name: "Flamengo", sport: "Futebol", color: "#C8102E", initials: "FLA" },
  { id: "redbull", name: "Red Bull Racing", sport: "F1", color: "#1E3A6D", initials: "RBR" },
  { id: "lakers", name: "Lakers", sport: "NBA", color: "#552583", initials: "LAL" },
  { id: "real-madrid", name: "Real Madrid", sport: "La Liga", color: "#FEBE10", initials: "RMA" },
  { id: "fonseca", name: "Joao Fonseca", sport: "Tenis", color: "#E0853C", initials: "JF" },
  { id: "bortoleto", name: "Gabriel Bortoleto", sport: "F1", color: "#10B981", initials: "GB" },
  { id: "bia", name: "Bia Haddad", sport: "Tenis", color: "#10B981", initials: "BH" },
];

const STEPS = ["Boas-vindas", "Modalidades", "Times", "Pronto"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  function toggleSport(id: string) {
    setSelectedSports((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function toggleTeam(id: string) {
    setSelectedTeams((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else router.push("/calendario");
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-graphite-3">
        <div className="h-full bg-emerald transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full">
        {step === 0 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald/[.12] border border-emerald-dim flex items-center justify-center mx-auto mb-6">
              <span className="display text-2xl font-extrabold text-emerald">LU</span>
            </div>
            <h1 className="display text-3xl font-extrabold">Bem-vindo ao LineUp</h1>
            <p className="text-text-secondary text-sm leading-relaxed mt-3 max-w-[320px] mx-auto">
              Seu agregador de calendario esportivo. Vamos personalizar sua experiencia em poucos passos.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="w-full">
            <h2 className="display text-2xl font-extrabold text-center">Escolha suas modalidades</h2>
            <p className="text-text-secondary text-sm text-center mt-2 mb-6">Selecione os esportes que voce acompanha</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SPORTS.map((sport) => {
                const selected = selectedSports.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    onClick={() => toggleSport(sport.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-[14px] border transition-all ${
                      selected ? "bg-emerald/[.08] border-emerald" : "bg-graphite border-graphite-3 hover:border-text-secondary"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04130C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                    )}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={selected ? "text-emerald" : "text-text-secondary"}>
                      <path d={sport.icon} />
                    </svg>
                    <span className="text-xs font-medium">{sport.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full">
            <h2 className="display text-2xl font-extrabold text-center">Escolha times e atletas</h2>
            <p className="text-text-secondary text-sm text-center mt-2 mb-6">Voce pode mudar isso depois</p>
            <div className="flex flex-col gap-2">
              {TEAMS.map((team) => {
                const selected = selectedTeams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      selected ? "bg-emerald/[.06] border-emerald" : "bg-graphite border-graphite-3 hover:border-text-secondary"
                    }`}
                  >
                    <span
                      className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${team.color} 0%, rgba(0,0,0,.4) 135%)` }}
                    >
                      {team.initials}
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold">{team.name}</div>
                      <div className="text-[11px] text-text-tertiary">{team.sport}</div>
                    </div>
                    {selected && (
                      <span className="w-6 h-6 rounded-full bg-emerald flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04130C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald/[.14] border border-emerald flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h1 className="display text-3xl font-extrabold">Tudo pronto!</h1>
            <p className="text-text-secondary text-sm leading-relaxed mt-3 max-w-[300px] mx-auto">
              Seu calendario esta configurado. Voce pode ajustar suas preferencias a qualquer momento.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="mono text-[11px] text-emerald-glow bg-emerald/[.10] border border-emerald-dim px-2.5 py-1 rounded-full">
                {selectedSports.length} modalidades
              </span>
              <span className="mono text-[11px] text-emerald-glow bg-emerald/[.10] border border-emerald-dim px-2.5 py-1 rounded-full">
                {selectedTeams.length} favoritos
              </span>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-10 w-full max-w-xs">
          {step > 0 && (
            <button onClick={back} className="flex-1 py-3 text-sm font-medium border border-graphite-3 rounded-xl text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">
              Voltar
            </button>
          )}
          <button onClick={next} className="flex-1 py-3 text-sm font-semibold bg-emerald text-[#04130C] rounded-xl hover:bg-emerald-glow transition-colors">
            {step === 0 ? "Comecar" : step === STEPS.length - 1 ? "Ir para o calendario" : "Proximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
