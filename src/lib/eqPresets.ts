export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;

export const EQ_PRESET_LABELS: Record<string, string> = {
  flat: 'Flat',
  bass: 'Bass Boost',
  treble: 'Treble',
  vocal: 'Vocal',
  rock: 'Rock',
  electronic: 'Electronic',
  acoustic: 'Acoustic',
};

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0],
  bass: [8, 5, 0, 0, 0],
  treble: [0, 0, 0, 5, 8],
  vocal: [-2, 0, 4, 4, 0],
  rock: [5, 3, -1, 2, 5],
  electronic: [6, 4, 0, 2, 4],
  acoustic: [4, 2, 0, 2, 4],
};
