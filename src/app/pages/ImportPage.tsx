// src/app/pages/ImportPage.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FileDrop from '../components/FileDrop';
import { useLinkMap } from '../hooks/useLinkMap';
import { extractCsvFromFile } from '../utils/extractFromZip';

export default function ImportPage() {
  const { raw, isLoading, loadRaw, loadPosts, loadInteractions, loadInvitations } = useLinkMap();
  const navigate = useNavigate();
  const didRouteRef = useRef(false);

  useEffect(() => {
    if (raw.length > 0 && !didRouteRef.current) {
      didRouteRef.current = true;
      navigate('/graph', { replace: true });
    }
  }, [raw.length, navigate]);

  async function handleFile(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.zip')) {
      const got = await extractCsvFromFile(file);
      if (got.connections) await loadRaw(got.connections);
      if (got.shares) await loadPosts(got.shares);
      if (got.comments || got.reactions) {
        await loadInteractions({
          commentsCsv: got.comments ?? null,
          reactionsCsv: got.reactions ?? null,
        });
      }
      if (got.invitations) await loadInvitations();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-md shadow-xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="mt-1 text-sm text-slate-300">
            Drop your LinkedIn export ZIP or paste the Connections CSV. We’ll parse connections,
            posts, comments, reactions, and invitations when present.
          </p>
        </header>

        <FileDrop onText={(t) => loadRaw(t)} onFile={handleFile} isLoading={isLoading} />

        <p className="mt-4 text-xs text-slate-400">
          Tip: LinkedIn → Settings &amp; Privacy → Data privacy → Get a copy of your data → choose
          <em> Connections</em> (and Posts/Comments/Reactions for richer graphs).
        </p>
      </div>
    </div>
  );
}
