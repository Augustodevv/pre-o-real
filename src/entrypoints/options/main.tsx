import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPanel } from '../../popup/SettingsPanel';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="mx-auto my-8 max-w-xl overflow-hidden rounded-xl bg-white font-sans text-slate-800 shadow-sm ring-1 ring-slate-200">
      <header className="flex items-center gap-3 bg-emerald-600 px-5 py-4 text-white">
        <img src="/icon/48.png" alt="" className="h-8 w-8 rounded" />
        <div>
          <h1 className="text-lg font-bold">Preço Real</h1>
          <p className="text-xs opacity-90">Configurações</p>
        </div>
      </header>
      <SettingsPanel inPopup={false} />
    </main>
  </StrictMode>,
);
