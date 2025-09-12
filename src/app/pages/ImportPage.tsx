// src/app/pages/ImportPage.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FileDrop from '../components/FileDrop';
import { useLinkMap } from '../hooks/useLinkMap';
import { extractCsvFromFile } from '../utils/extractFromZip';

export default function ImportPage() {
  const {
    raw,
    isLoading,
    loadRaw,
    loadPosts,
    loadInteractions,
    loadInvitations,
  } = useLinkMap();
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
      return;
    }
  }

  async function handleCsvText(t: string) {
    await loadRaw(t);
  }

  return (
    <div>
      <FileDrop
        onText={handleCsvText}
        onFile={handleFile}
        isLoading={isLoading}
      />
    </div>
  );
}
