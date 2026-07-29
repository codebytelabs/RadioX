/**
 * Curated iconic station UUIDs kept for reference / revalidation.
 * Prefer WORLD_TOP_SEEDS from worldTop.ts for Home feeds.
 * Farm detection lives in stationRank.ts.
 */
export { isVoteFarm, farmScore, brandKey } from '@/lib/stationRank';

/** Legacy list — only UUIDs that overlap with verified World Top seeds. */
export const WORLD_STATION_UUIDS: readonly string[] = [
  '98adecf7-2683-4408-9be7-02d3f9098eb8', // BBC World Service
  '1cfb151d-a341-11e9-a787-52543be04c81', // France Info
  '1c3e8be2-5b14-4933-bad3-87cbc227cba4', // Deutschlandfunk
  'fd059cc5-b538-41c1-ae76-b8778a84c3db', // Radio 538
  '240d28b9-7858-48d2-a816-9cf8e1875fe8', // SWR3
  '96185693-0601-11e8-ae97-52543be04c81', // Rai Radio 1
  '5d6b5573-d661-477a-82fc-1d0d03799679', // RNE Radio Nacional
  '96063f25-0601-11e8-ae97-52543be04c81', // Classic FM
  '59e30dda-64bf-11ea-be63-52543be04c81', // Radio ZET
  '960ef35c-0601-11e8-ae97-52543be04c81', // VRT Radio 1
  '961ac56b-0601-11e8-ae97-52543be04c81', // Radio Swiss Jazz
  'e4f6d392-f704-4cf0-8d26-9c931cebeaf6', // Sveriges Radio P3
  'ebc6ab9f-57be-4ee8-9209-327ee71c7a86', // NRK P1
  '7ba4c184-fc2b-11e9-bbf2-52543be04c81', // NPR
  '6a7508a9-27ab-11e8-91bf-52543be04c81', // KEXP
  '96147d8c-0601-11e8-ae97-52543be04c81', // WBUR
  'b81c57c3-eb05-47ac-a0ea-eb01a6960cc4', // LOS 40
  '960c2914-0601-11e8-ae97-52543be04c81', // RFI Afrique
  '9606f727-0601-11e8-ae97-52543be04c81', // 1LIVE
  '96200095-0601-11e8-ae97-52543be04c81', // Capital FM
  '869aed72-cf94-4fb5-868e-a54321c51081', // Radio Paradise
] as const;
