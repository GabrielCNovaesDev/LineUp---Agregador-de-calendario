"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="display text-3xl font-extrabold">LineUp</span>
            <span className="pulse-dot w-2 h-2 rounded-full bg-emerald shadow-[0_0_10px_var(--emerald)]" />
          </div>
          <p className="text-text-secondary text-sm">Entre na sua conta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mono text-[11px] tracking-[.12em] text-text-tertiary uppercase mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-graphite border border-graphite-3 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-emerald transition-colors"
            />
          </div>
          <div>
            <label className="mono text-[11px] tracking-[.12em] text-text-tertiary uppercase mb-1.5 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-graphite border border-graphite-3 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-emerald transition-colors"
            />
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-xs text-emerald hover:text-emerald-glow transition-colors">
              Esqueci minha senha
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald text-[#04130C] font-semibold text-sm rounded-xl hover:bg-emerald-glow transition-all disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-graphite-3" />
          <span className="text-[11px] text-text-tertiary uppercase">ou</span>
          <span className="flex-1 h-px bg-graphite-3" />
        </div>

        {/* Social login */}
        <div className="flex flex-col gap-3">
          <button className="w-full flex items-center justify-center gap-2.5 py-3 border border-graphite-3 rounded-xl text-sm font-medium text-text-primary hover:bg-graphite-2 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar com Google
          </button>
          <button className="w-full flex items-center justify-center gap-2.5 py-3 border border-graphite-3 rounded-xl text-sm font-medium text-text-primary hover:bg-graphite-2 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continuar com Apple
          </button>
        </div>

        {/* Link to register */}
        <p className="text-center text-sm text-text-secondary mt-8">
          Nao tem conta?{" "}
          <Link href="/cadastro" className="text-emerald font-medium hover:text-emerald-glow transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
