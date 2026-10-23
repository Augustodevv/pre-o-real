import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { ADAPTERS } from '../adapters';
import { isCommunityConfigured } from '../community/config';
import { clearAll, exportAll, importAll } from '../core/db';
import { dayKey } from '../core/dates';
import { DEFAULT_SETTINGS, getSettings, settingsItem, type Settings } from '../settings';

interface Props {
  /** No popup o seletor de arquivos pode fechar a janela; lá a importação abre a página de opções. */
  inPopup: boolean;
  onDataChanged?(): void;
}

export function SettingsPanel({ inPopup, onDataChanged }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  async function save(next: Settings) {
    setSettings(next);
    await settingsItem.setValue(next);
  }

  async function exportData() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preco-real-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ text: `Backup gerado com ${data.products.length} produto(s).` });
  }

  async function importData(file: File) {
    try {
      const result = await importAll(JSON.parse(await file.text()));
      setMessage({ text: `Importados ${result.products} produto(s) e ${result.prices} registro(s) de preço.` });
      onDataChanged?.();
    } catch (error) {
      const text = error instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : (error as Error).message;
      setMessage({ text, error: true });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function deleteAll() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await clearAll();
    setConfirmDelete(false);
    setMessage({ text: 'Todos os dados foram apagados.' });
    onDataChanged?.();
  }

  return (
    <div className="space-y-5 p-4 text-sm">
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Na página do produto</h2>
        <Toggle
          label="Mostrar o selo de preço"
          description="O selo aparece perto do preço com a classificação e o histórico."
          checked={settings.showBadge}
          onChange={(showBadge) => save({ ...settings, showBadge })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lojas</h2>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {ADAPTERS.map((a) => (
            <div key={a.id} className="px-3">
              <Toggle
                label={a.name}
                checked={settings.stores[a.id]}
                onChange={(on) => save({ ...settings, stores: { ...settings.stores, [a.id]: on } })}
              />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Lojas desligadas não registram preços nem são verificadas.</p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Histórico compartilhado</h2>
        <Toggle
          label="Participar do histórico compartilhado"
          description={
            isCommunityConfigured()
              ? 'O gráfico já aparece preenchido com os preços vistos por outros usuários. Em troca, enviamos de forma anônima apenas loja, ID do produto, preço e data — nunca seus dados ou seu histórico de navegação.'
              : 'Indisponível nesta versão da extensão.'
          }
          checked={settings.shareHistory && isCommunityConfigured()}
          disabled={!isCommunityConfigured()}
          onChange={(shareHistory) => save({ ...settings, shareHistory })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Seus dados</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData}>Exportar JSON</Button>
          {inPopup ? (
            <Button onClick={() => browser.runtime.openOptionsPage()}>Importar JSON…</Button>
          ) : (
            <>
              <Button onClick={() => fileRef.current?.click()}>Importar JSON</Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
              />
            </>
          )}
          <Button danger onClick={deleteAll}>
            {confirmDelete ? 'Clique de novo para confirmar' : 'Apagar tudo'}
          </Button>
        </div>
        {message && (
          <p className={`mt-2 text-xs ${message.error ? 'text-red-600' : 'text-emerald-700'}`} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        🔒 Seu histórico fica guardado <strong>somente neste navegador</strong>.{' '}
        {settings.shareHistory
          ? 'Como você participa do histórico compartilhado, só loja, ID do produto, preço e data são enviados, de forma anônima.'
          : 'Nada é enviado para servidores.'}{' '}
        <a
          href={browser.runtime.getURL('/privacidade.html')}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald-700 underline"
        >
          Política de privacidade
        </a>
        <span className="mt-1 block text-slate-400">Versão {browser.runtime.getManifest().version}</span>
      </section>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span>
        <span className="font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4"
      />
    </label>
  );
}

function Button({ children, onClick, danger }: { children: React.ReactNode; onClick(): void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
        danger
          ? 'border-red-200 text-red-700 hover:bg-red-50'
          : 'border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
      }`}
    >
      {children}
    </button>
  );
}
