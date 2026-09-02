import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-sky-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed w-full z-50 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <span className="text-sky-400">PokeX</span>Finder
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <a href="#features" className="hover:text-sky-400 transition">Recursos</a>
            <a href="#pricing" className="hover:text-sky-400 transition">Preços</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
            Pare de perder tempo.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
              Encontre o loot perfeito.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            A ferramenta definitiva para caçadores e exploradores no PokeXGames. 
            Mapeie coordenadas, triangule interseções e eleve seu farm ao próximo nível.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#" className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition shadow-lg shadow-sky-500/25">
              Baixar para Windows
            </a>
            <a href="#features" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">
              Saiba Mais
            </a>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-900 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white mb-16">Por que usar o Finder?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center mb-6 text-xl">
                📍
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Triangulação Exata</h3>
              <p className="text-slate-400 leading-relaxed">
                Insira as distâncias do radar e veja instantaneamente a área exata de intersecção desenhada no mapa usando geoprocessamento real.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6 text-xl">
                📊
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Painel BI e Estatísticas</h3>
              <p className="text-slate-400 leading-relaxed">
                Acompanhe o seu progresso, histórico de baús encontrados e otimize as suas rotas diárias com dados visuais fáceis de ler.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-6 text-xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Ultra Rápido (Nativo)</h3>
              <p className="text-slate-400 leading-relaxed">
                Desenvolvido em Rust e Tauri. Diga adeus ao lag. O aplicativo consome menos de 50MB de RAM enquanto você joga sem gargalos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800 text-center text-slate-500">
        <p>© 2026 PokeX Finder. Não somos afiliados à PokeXGames.</p>
      </footer>
    </div>
  );
}
