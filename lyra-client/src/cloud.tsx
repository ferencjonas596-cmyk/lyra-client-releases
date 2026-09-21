import { useEffect, useState } from 'react';
export type CloudState = { server: string; content: null | { title: string; subtitle: string; announcement: string; accent: string; revision: number }; contentError: string; version: string; packaged: boolean; update: { status: string; message: string; progress: number } };
export function useCloud() {
  const [cloud, setCloud] = useState<CloudState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; const refresh = async () => { try { const value = await window.lyra?.cloud(); if (active && value) setCloud(value); } catch { if (active) setError('Az asztali kapcsolat nem érhető el.'); } }; void refresh(); const timer = setInterval(() => void refresh(), 3000); return () => { active = false; clearInterval(timer); }; }, []);
  async function check() { setBusy(true); setError(''); try { if (window.lyra) setCloud(await window.lyra.checkUpdate()); } catch { setError('A frissítés nem sikerült.'); } finally { setBusy(false); } }
  async function install() { try { await window.lyra?.installUpdate(); } catch { setError('A telepítés nem indítható.'); } }
  return { cloud, error, busy, check, install };
}
export function CloudSettings({ service }: { service: ReturnType<typeof useCloud> }) {
  const { cloud, busy, error, check, install } = service;
  return <section className="settings-panel cloud-settings"><h3>Launcherfrissítések</h3><p>A launcher automatikusan a Lyra hivatalos szerveréről tölti le a tartalmat és a frissítéseket.</p><p>lyraclientadatbazis.craftmc.eu</p><div className="cloud-actions"><button disabled={busy || !cloud?.server} onClick={() => void check()}>Frissítés keresése</button>{cloud?.update.status === 'ready' && <button onClick={() => void install()}>Újraindítás és telepítés</button>}</div><p role="status">{busy ? 'Kapcsolódás…' : error || cloud?.update.message || 'A frissítések az asztali alkalmazásban érhetők el.'}</p>{cloud?.update.status === 'downloading' && <progress max="100" value={cloud.update.progress}/>}<p>{cloud?.contentError || (cloud?.content ? `Tartalomváltozat: ${cloud.content.revision} · Automatikus szinkronizálás` : 'A szövegek és színek az adminpanelből szerkeszthetők.')}</p></section>;
}
