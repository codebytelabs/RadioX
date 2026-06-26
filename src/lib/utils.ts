import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeVolume(vol: unknown): number {
  const n = Number(vol);
  if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}
