import { GRID_SIZE, COL_LABELS } from '../data/nationsAndFleets';
import { Coord, PlacedShip, RelativeOffset, ShipTemplate } from '../types/game';

export function coordKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function formatCoordLabel(r: number, c: number): string {
  return `${COL_LABELS[c]}${r + 1}`;
}

export function normalizeOffsets(offsets: RelativeOffset[]): RelativeOffset[] {
  const minR = Math.min(...offsets.map(([r]) => r));
  const minC = Math.min(...offsets.map(([, c]) => c));
  return offsets
    .map(([r, c]): RelativeOffset => [r - minR, c - minC])
    .sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
}

export function rotateOffsetsCW(offsets: RelativeOffset[], times: number = 1): RelativeOffset[] {
  let cur = normalizeOffsets(offsets);
  const steps = ((times % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) {
    cur = normalizeOffsets(cur.map(([r, c]) => [c, -r]));
  }
  return cur;
}

export function getUniqueOrientations(offsets: RelativeOffset[]): RelativeOffset[][] {
  const seen = new Set<string>();
  const result: RelativeOffset[][] = [];
  for (let rot = 0; rot < 4; rot++) {
    const rotated = rotateOffsetsCW(offsets, rot);
    const sig = rotated.map(([r, c]) => `${r}:${c}`).join('|');
    if (!seen.has(sig)) {
      seen.add(sig);
      result.push(rotated);
    }
  }
  return result;
}

export function getShipBounds(offsets: RelativeOffset[]): { rows: number; cols: number } {
  const maxR = Math.max(...offsets.map(([r]) => r));
  const maxC = Math.max(...offsets.map(([, c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}

export function generateRandomHazards(
  rockCount: number = 8,
  mineCount: number = 8
): { rocks: string[]; mapMines: string[] } {
  const allCoords: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      allCoords.push(coordKey(r, c));
    }
  }
  for (let i = allCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
  }
  const rocks = allCoords.slice(0, rockCount);
  const mapMines = allCoords.slice(rockCount, rockCount + mineCount);
  return { rocks, mapMines };
}

export function canPlaceShip(
  offsets: RelativeOffset[],
  anchorR: number,
  anchorC: number,
  existingShips: PlacedShip[],
  noTouch: boolean,
  ignoreInstanceId?: string,
  rocks: string[] = []
): { valid: boolean; cells: Coord[] } {
  const cells: Coord[] = offsets.map(([dr, dc]) => ({
    r: anchorR + dr,
    c: anchorC + dc,
  }));

  const rockSet = new Set(rocks);

  for (const cell of cells) {
    if (cell.r < 0 || cell.r >= GRID_SIZE || cell.c < 0 || cell.c >= GRID_SIZE) {
      return { valid: false, cells };
    }
    if (rockSet.has(coordKey(cell.r, cell.c))) {
      return { valid: false, cells };
    }
  }

  const occupied = new Set<string>();
  for (const ship of existingShips) {
    if (ship.instanceId === ignoreInstanceId) continue;
    for (const c of ship.cells) {
      occupied.add(coordKey(c.r, c.c));
    }
  }

  for (const cell of cells) {
    if (occupied.has(coordKey(cell.r, cell.c))) {
      return { valid: false, cells };
    }
    if (noTouch) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (occupied.has(coordKey(cell.r + dr, cell.c + dc))) {
            return { valid: false, cells };
          }
        }
      }
    }
  }

  return { valid: true, cells };
}

export function autoPlaceFleet(
  templates: ShipTemplate[],
  noTouch: boolean,
  rocks: string[] = [],
  avoidMines: string[] = []
): PlacedShip[] {
  // Sort largest / trickiest exotic ships first for reliable placement
  const indexed = templates.map((tpl, idx) => ({ tpl, idx }));
  indexed.sort((a, b) => b.tpl.offsets.length - a.tpl.offsets.length);

  // Precompute orientations once per template
  const orientedCache = indexed.map((entry) => ({
    ...entry,
    orientations: getUniqueOrientations(entry.tpl.offsets),
  }));

  const hardBlockedWithMines =
    avoidMines.length > 0 ? [...rocks, ...avoidMines] : rocks;

  const parseBlockedMask = (blockedCells: string[]): Uint8Array => {
    const mask = new Uint8Array(GRID_SIZE * GRID_SIZE);
    for (const k of blockedCells) {
      const [rs, cs] = k.split(',');
      const r = Number(rs);
      const c = Number(cs);
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        mask[r * GRID_SIZE + c] = 1;
      }
    }
    return mask;
  };

  const tryPlace = (
    blockedCells: string[],
    enforceNoTouch: boolean,
    maxAttempts: number,
    preferCompact: boolean
  ): PlacedShip[] | null => {
    const blockedMask = parseBlockedMask(blockedCells);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const occupiedMask = new Uint8Array(GRID_SIZE * GRID_SIZE);
      const placed: PlacedShip[] = [];
      let failed = false;

      for (const { tpl, idx, orientations } of orientedCache) {
        const candidates: {
          offsets: RelativeOffset[];
          r: number;
          c: number;
          rot: 0 | 90 | 180 | 270;
          cells: Coord[];
        }[] = [];

        outer: for (let oIdx = 0; oIdx < orientations.length; oIdx++) {
          const offsets = orientations[oIdx];
          const rot = ((oIdx * 90) % 360) as 0 | 90 | 180 | 270;
          let maxDr = 0;
          let maxDc = 0;
          for (let k = 0; k < offsets.length; k++) {
            if (offsets[k][0] > maxDr) maxDr = offsets[k][0];
            if (offsets[k][1] > maxDc) maxDc = offsets[k][1];
          }
          const rLimit = GRID_SIZE - maxDr;
          const cLimit = GRID_SIZE - maxDc;

          for (let r = 0; r < rLimit; r++) {
            for (let c = 0; c < cLimit; c++) {
              let valid = true;
              for (let k = 0; k < offsets.length; k++) {
                const cr = r + offsets[k][0];
                const cc = c + offsets[k][1];
                const cellIdx = cr * GRID_SIZE + cc;
                if (blockedMask[cellIdx] || occupiedMask[cellIdx]) {
                  valid = false;
                  break;
                }
                if (enforceNoTouch) {
                  const rMin = cr > 0 ? cr - 1 : 0;
                  const rMax = cr < GRID_SIZE - 1 ? cr + 1 : GRID_SIZE - 1;
                  const cMin = cc > 0 ? cc - 1 : 0;
                  const cMax = cc < GRID_SIZE - 1 ? cc + 1 : GRID_SIZE - 1;
                  for (let nr = rMin; nr <= rMax && valid; nr++) {
                    const rowBase = nr * GRID_SIZE;
                    for (let nc = cMin; nc <= cMax; nc++) {
                      if (occupiedMask[rowBase + nc]) {
                        valid = false;
                        break;
                      }
                    }
                  }
                  if (!valid) break;
                }
              }

              if (valid) {
                const cells = offsets.map(([dr, dc]) => ({ r: r + dr, c: c + dc }));
                candidates.push({ offsets, r, c, rot, cells });
                if (preferCompact) break outer;
              }
            }
          }
        }

        if (candidates.length === 0) {
          failed = true;
          break;
        }

        const pick = preferCompact
          ? candidates[0]
          : candidates[Math.floor(Math.random() * candidates.length)];

        for (const cell of pick.cells) {
          occupiedMask[cell.r * GRID_SIZE + cell.c] = 1;
        }

        placed.push({
          instanceId: `${tpl.id}_${idx}`,
          templateId: tpl.id,
          name: tpl.name,
          offsets: pick.offsets,
          anchor: { r: pick.r, c: pick.c },
          cells: pick.cells,
          rotation: pick.rot,
          hits: [],
          sunk: false,
          isFlagship: Boolean(tpl.isFlagship),
        });
      }

      if (!failed) return placed;
    }
    return null;
  };

  const randomAttempts = templates.length > 24 ? 14 : 35;

  // 1. Try avoiding both rocks and mapMines with requested noTouch
  const clean =
    tryPlace(hardBlockedWithMines, noTouch, randomAttempts, false) ??
    tryPlace(hardBlockedWithMines, noTouch, 1, true);
  if (clean) return clean;

  // 2. Fallback: avoid only rocks (if mines were too dense)
  if (avoidMines.length > 0) {
    const rockOnly =
      tryPlace(rocks, noTouch, randomAttempts, false) ??
      tryPlace(rocks, noTouch, 1, true);
    if (rockOnly) return rockOnly;
  }

  // 3. Fallback without noTouch while still respecting rocks
  if (noTouch) {
    const relaxed =
      tryPlace(rocks, false, randomAttempts, false) ??
      tryPlace(rocks, false, 1, true);
    if (relaxed) return relaxed;
  }

  return [];
}
