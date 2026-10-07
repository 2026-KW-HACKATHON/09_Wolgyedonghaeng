import { useEffect, useState } from 'react';
import { getCachedPrograms, getPrograms, type ProgramsFile } from '../../services/api';

/** 사업 목록. 이미 받아 둔 것이 있으면 바로, 없으면 받아 온다 (오프라인이면 저장해 둔 것). */
export function usePrograms(): { file: ProgramsFile | null; loading: boolean } {
  const [file, setFile] = useState<ProgramsFile | null>(getCachedPrograms());
  const [loading, setLoading] = useState(file === null);
  useEffect(() => {
    if (getCachedPrograms()) return;
    let alive = true;
    getPrograms()
      .then((f) => alive && setFile(f))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  return { file, loading };
}
