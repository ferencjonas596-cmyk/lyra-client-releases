import { useEffect, useState } from 'react';
type Manifest = { latest: { release: string; snapshot: string }; versions: { id: string; type: string }[]; cached: boolean; fetchedAt: string };
declare global { interface Window { lyra?: { versions: () => Promise<Manifest>; cloud: () => Promise<import('./cloud').CloudState>; checkUpdate: () => Promise<import('./cloud').CloudState>; installUpdate: () => Promise<boolean> } } }
export function useVersions() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      if (!window.lyra) throw Error('Az automatikus verziófrissítés az asztali alkalmazásban érhető el.');
      setManifest(await window.lyra.versions()); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'A frissítés nem sikerült.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); const id = setInterval(() => void refresh(), 15 * 60 * 1000); return () => clearInterval(id); }, []);
  return { manifest, error, loading, refresh };
}
export function VersionOptions({ manifest, selected }: { manifest: Manifest | null; selected: string }) {
  return <><option value="latest-release">Legújabb stabil{manifest ? ` (${manifest.latest.release})` : ''}</option><option value="latest-snapshot">Legújabb snapshot{manifest ? ` (${manifest.latest.snapshot})` : ''}</option>{!selected.startsWith('latest-') && !manifest?.versions.some(v => v.id === selected) && <option value={selected}>{selected} (nem ellenőrzött)</option>}{['release', 'snapshot', 'old_beta', 'old_alpha'].map(type => <optgroup key={type} label={({ release: 'Stabil kiadások', snapshot: 'Snapshotok / előzetesek', old_beta: 'Régi béta', old_alpha: 'Régi alfa' } as Record<string, string>)[type]}>{manifest?.versions.filter(v => v.type === type).map(v => <option key={v.id} value={v.id}>{v.id}</option>)}</optgroup>)}</>;
}
