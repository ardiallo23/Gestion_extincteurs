import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { StationRegion } from '@/lib/types';

export interface RegionRow {
  region: StationRegion;
  type: string;
  total: number;
  compliant: number;
  non_compliant: number;
}

export function useRegionData() {
  const [data, setData] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('extinguishers_by_region')
        .select('*');
      if (!cancelled) {
        setData((rows as RegionRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
