import { GRID_SIZE, SHIP_CATALOG } from '../data/nationsAndFleets';
import { SKILLS } from '../data/skills';
import {
  AIDifficulty,
  BattleGoal,
  CardinalDirection,
  Coord,
  PlacedShip,
  PlayerBattleState,
  ShotResultStatus,
  SkillId,
} from '../types/game';
import { coordKey, getShipBounds, getUniqueOrientations } from './fleetLogic';
import { clampBoxOrigin, directionDelta } from './skillEngine';

export interface AISkillDecision {
  skillId: SkillId;
  targetCoord?: Coord;
  extraCoords?: Coord[];
  axis?: 'ROW' | 'COL';
  direction?: CardinalDirection;
  shipId?: string;
  secondShipId?: string;
}

/**
 * Tính bản đồ mật độ xác suất Bayesian cho bàn cờ 18×18 (Hỗ trợ Săn Soái Hạm, lớp giáp 'armor' & đá ngầm 'rock')
 */
export function computeAIHeatmap(
  level: AIDifficulty,
  shots: Record<string, ShotResultStatus>,
  defenderShips: PlacedShip[],
  noTouch: boolean,
  decoys: string[] = [],
  battleGoal: BattleGoal = 'ANNIHILATION'
): { heatmap: number[][]; pool: Coord[]; activeHits: Coord[] } {
  const available: Coord[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const st = shots[coordKey(r, c)];
      if (!st || st === 'armor') {
        available.push({ r, c });
      }
    }
  }

  const blocked = new Set<string>();
  if (level >= 4 && noTouch) {
    for (const [key, st] of Object.entries(shots)) {
      if (st === 'sunk') {
        const [sr, sc] = key.split(',').map(Number);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = sr + dr;
            const nc = sc + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              blocked.add(coordKey(nr, nc));
            }
          }
        }
      }
    }
  }

  const validTargets = available.filter(
    (cell) => !blocked.has(coordKey(cell.r, cell.c))
  );
  const pool = validTargets.length > 0 ? validTargets : available;

  const activeHits: Coord[] = [];
  const activeHitSet = new Set<string>();
  for (const [key, st] of Object.entries(shots)) {
    if (st === 'hit' || st === 'armor') {
      const [r, c] = key.split(',').map(Number);
      activeHits.push({ r, c });
      activeHitSet.add(key);
    }
  }

  const heatmap: number[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(0)
  );
  const impossible = new Set<string>(blocked);
  for (const [k, st] of Object.entries(shots)) {
    if (st === 'miss' || st === 'sunk' || st === 'rock') {
      impossible.add(k);
    }
  }

  const remainingShips = defenderShips.filter((s) => !s.sunk);
  const shipsForHeatmap =
    battleGoal === 'FLAGSHIP_HUNT'
      ? remainingShips.filter((s) => s.isFlagship || s.cells.length >= 5)
      : remainingShips;
  const evalShips = shipsForHeatmap.length > 0 ? shipsForHeatmap : remainingShips;
  const isAdmiralty = level === 5;

  for (const ship of evalShips) {
    const tpl = SHIP_CATALOG[ship.templateId];
    const baseOffsets = tpl ? tpl.offsets : ship.offsets;
    const orientations = getUniqueOrientations(baseOffsets);
    const flagshipBoost =
      battleGoal === 'FLAGSHIP_HUNT' && ship.isFlagship ? 3.5 : 1;

    for (const shape of orientations) {
      const bounds = getShipBounds(shape);
      for (let topR = 0; topR <= GRID_SIZE - bounds.rows; topR++) {
        for (let leftC = 0; leftC <= GRID_SIZE - bounds.cols; leftC++) {
          let valid = true;
          let hitOverlap = 0;

          for (const [dr, dc] of shape) {
            const rr = topR + dr;
            const cc = leftC + dc;
            const k = coordKey(rr, cc);
            if (impossible.has(k)) {
              valid = false;
              break;
            }
            if (activeHitSet.has(k)) {
              hitOverlap++;
            }
          }

          if (!valid) continue;

          let weight = 1 * flagshipBoost;
          if (activeHits.length > 0) {
            if (hitOverlap === 0) {
              weight = (isAdmiralty ? 0.01 : 0.05) * flagshipBoost;
            } else {
              weight =
                (isAdmiralty ? Math.pow(16, hitOverlap) : 8 * hitOverlap) *
                flagshipBoost;
            }
          }

          for (const [dr, dc] of shape) {
            const rr = topR + dr;
            const cc = leftC + dc;
            const st = shots[coordKey(rr, cc)];
            if (!st || st === 'armor') {
              heatmap[rr][cc] += st === 'armor' ? weight * 4 : weight;
            }
          }
        }
      }
    }
  }

  // Tín hiệu giả đánh lừa bản đồ nhiệt trinh sát của AI
  if (level >= 2 && decoys.length > 0) {
    for (const dk of decoys) {
      if (!shots[dk]) {
        const [dr, dc] = dk.split(',').map(Number);
        if (dr >= 0 && dr < GRID_SIZE && dc >= 0 && dc < GRID_SIZE) {
          heatmap[dr][dc] += level === 5 ? 65 : 120;
        }
      }
    }
  }

  return { heatmap, pool, activeHits };
}

/**
 * 5-Tier Fleet Battle AI Shot Engine (Decoy & Polyomino Aware)
 */
export function chooseAIShot(
  level: AIDifficulty,
  shots: Record<string, ShotResultStatus>,
  defenderShips: PlacedShip[],
  noTouch: boolean,
  decoys: string[] = [],
  battleGoal: BattleGoal = 'ANNIHILATION'
): Coord {
  const { heatmap, pool, activeHits } = computeAIHeatmap(
    level,
    shots,
    defenderShips,
    noTouch,
    decoys,
    battleGoal
  );
  if (pool.length === 0) return { r: 0, c: 0 };

  if (level === 1) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const armorCells = pool.filter((p) => shots[coordKey(p.r, p.c)] === 'armor');
  if (armorCells.length > 0 && Math.random() < (level >= 4 ? 0.85 : 0.6)) {
    return armorCells[Math.floor(Math.random() * armorCells.length)];
  }

  if (level === 2 || level === 3) {
    const activeDecoy = decoys.find((dk) => !shots[dk]);
    if (activeDecoy && Math.random() < 0.5) {
      const [r, c] = activeDecoy.split(',').map(Number);
      return { r, c };
    }

    const poolSet = new Set(pool.map((p) => coordKey(p.r, p.c)));
    const activeHitSet = new Set(activeHits.map((h) => coordKey(h.r, h.c)));

    if (activeHits.length > 0) {
      if (activeHits.length >= 2) {
        const lineCandidates: Coord[] = [];
        for (const h of activeHits) {
          for (const [dr, dc] of [
            [0, 1],
            [1, 0],
          ]) {
            if (
              activeHitSet.has(coordKey(h.r + dr, h.c + dc)) ||
              activeHitSet.has(coordKey(h.r - dr, h.c - dc))
            ) {
              for (const sign of [-1, 1]) {
                const nr = h.r + sign * dr;
                const nc = h.c + sign * dc;
                const k = coordKey(nr, nc);
                if (poolSet.has(k) && (!shots[k] || shots[k] === 'armor')) {
                  lineCandidates.push({ r: nr, c: nc });
                }
              }
            }
          }
        }
        if (lineCandidates.length > 0) {
          return lineCandidates[Math.floor(Math.random() * lineCandidates.length)];
        }
      }

      const adjCandidates: Coord[] = [];
      for (const h of activeHits) {
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nr = h.r + dr;
          const nc = h.c + dc;
          const k = coordKey(nr, nc);
          if (poolSet.has(k) && (!shots[k] || shots[k] === 'armor')) {
            adjCandidates.push({ r: nr, c: nc });
          }
        }
      }
      if (adjCandidates.length > 0) {
        return adjCandidates[Math.floor(Math.random() * adjCandidates.length)];
      }
    }

    if (level === 2) {
      const checker = pool.filter((p) => (p.r + p.c) % 2 === 0);
      const pickFrom = checker.length > 0 ? checker : pool;
      return pickFrom[Math.floor(Math.random() * pickFrom.length)];
    }

    let maxScore = -1;
    let best: Coord[] = [];
    for (const p of pool) {
      let openNeighbors = 0;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = p.r + dr;
        const nc = p.c + dc;
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          !shots[coordKey(nr, nc)]
        ) {
          openNeighbors++;
        }
      }
      const score = openNeighbors * 2 + ((p.r + p.c) % 2 === 0 ? 1 : 0);
      if (score > maxScore) {
        maxScore = score;
        best = [p];
      } else if (score === maxScore) {
        best.push(p);
      }
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  const remainingShips = defenderShips.filter((s) => !s.sunk);
  const isAdmiralty = level === 5;

  if (isAdmiralty && activeHits.length > 0) {
    for (const h of activeHits) {
      for (const [dr, dc] of [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]) {
        const nr = h.r + dr;
        const nc = h.c + dc;
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          !shots[coordKey(nr, nc)]
        ) {
          heatmap[nr][nc] += 0.5;
        }
      }
    }
  }

  const minShipLen = Math.min(
    ...remainingShips.map((s) => s.offsets.length),
    1
  );

  let bestScore = -1;
  let bestCells: Coord[] = [];
  for (const p of pool) {
    let score = heatmap[p.r][p.c];
    if (isAdmiralty && activeHits.length === 0 && minShipLen >= 2) {
      if ((p.r + p.c) % 2 === 0) {
        score *= 1.08;
      }
    }
    if (score > bestScore + 1e-6) {
      bestScore = score;
      bestCells = [p];
    } else if (Math.abs(score - bestScore) <= 1e-6) {
      bestCells.push(p);
    }
  }

  return bestCells[Math.floor(Math.random() * bestCells.length)];
}

const ALL_DIRS: CardinalDirection[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/**
 * AI Tactical Skill Planner — hỗ trợ đầy đủ 120 kỹ năng theo 5 cấp độ thông minh
 */
export function chooseAISkillAction(
  level: AIDifficulty,
  aiState: PlayerBattleState,
  humanState: PlayerBattleState,
  noTouch: boolean,
  battleGoal: BattleGoal = 'ANNIHILATION'
): AISkillDecision | null {
  // Nếu bị khóa EMP, vẫn cho phép dùng Khôi Phục Tần Số hoặc Thanh Tẩy EMP
  if (aiState.empLockedTurns > 0) {
    const canRestore =
      aiState.setup.skillIds.includes('frequency_restore') &&
      (aiState.skillCooldowns.frequency_restore ?? 0) === 0;
    if (canRestore && level >= 2) {
      return { skillId: 'frequency_restore' };
    }
    const canPurge =
      aiState.setup.skillIds.includes('emp_purge_aura') &&
      (aiState.skillCooldowns.emp_purge_aura ?? 0) === 0;
    if (canPurge && level >= 2) {
      return { skillId: 'emp_purge_aura' };
    }
    return null;
  }

  const readySkills = aiState.setup.skillIds.filter((id) => {
    const def = SKILLS[id];
    if (!def || def.kind !== 'ACTIVE') return false;
    const cd = aiState.skillCooldowns[id] ?? 0;
    const left = aiState.skillUsesLeft[id] ?? 1;
    return cd === 0 && left > 0;
  });

  if (readySkills.length === 0) return null;

  const triggerChance = [0, 0.28, 0.45, 0.62, 0.78, 0.9][level] ?? 0.5;
  if (Math.random() > triggerChance) return null;

  const { heatmap, pool, activeHits } = computeAIHeatmap(
    level,
    humanState.receivedShots,
    humanState.ships,
    noTouch,
    humanState.decoys,
    battleGoal
  );
  if (pool.length === 0) return null;

  const ownFlagship = aiState.ships.find((s) => s.isFlagship && !s.sunk);
  const ownDamagedShip =
    (ownFlagship &&
    (ownFlagship.hits.length > 0 ||
      (ownFlagship.armorRemaining ?? 0) < (ownFlagship.armorMax ?? 0))
      ? ownFlagship
      : null) ??
    aiState.ships.find(
      (s) =>
        !s.sunk &&
        (s.hits.length > 0 || (s.armorRemaining ?? 0) < (s.armorMax ?? 0))
    );
  const ownBurningShip = aiState.ships.find(
    (s) =>
      !s.sunk &&
      s.cells.some((c) => Boolean(aiState.burningCells[coordKey(c.r, c.c)]))
  );
  const ownBiggestAlive =
    (ownFlagship && !aiState.shieldedShipIds.includes(ownFlagship.instanceId)
      ? ownFlagship
      : null) ??
    [...aiState.ships]
      .filter((s) => !s.sunk && !aiState.shieldedShipIds.includes(s.instanceId))
      .sort((a, b) => b.cells.length - a.cells.length)[0] ??
    aiState.ships.find((s) => !s.sunk);
  const ownSmallClean = aiState.ships.find(
    (s) => !s.sunk && s.hits.length === 0 && s.cells.length <= 4
  );

  const emptyOwnCells = (): Coord[] => {
    const emptyOwn: Coord[] = [];
    const occupiedOwn = new Set(
      aiState.ships.flatMap((s) => s.cells.map((c) => coordKey(c.r, c.c)))
    );
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const k = coordKey(r, c);
        if (
          !occupiedOwn.has(k) &&
          !aiState.rocks.includes(k) &&
          !aiState.receivedShots[k] &&
          !aiState.mines.includes(k) &&
          !aiState.decoys.includes(k)
        ) {
          emptyOwn.push({ r, c });
        }
      }
    }
    return emptyOwn;
  };

  // Level 1: chọn skill hợp lệ ngẫu nhiên
  if (level === 1) {
    const sid = readySkills[Math.floor(Math.random() * readySkills.length)];
    const def = SKILLS[sid];
    const randEnemy = pool[Math.floor(Math.random() * pool.length)];
    const emptyOwn = emptyOwnCells();
    const randOwn =
      sid === 'rock_demolition' && aiState.rocks.length > 0
        ? (() => {
            const [rr, rc] = aiState.rocks[0].split(',').map(Number);
            return { r: rr, c: rc };
          })()
        : emptyOwn.length > 0
          ? emptyOwn[Math.floor(Math.random() * emptyOwn.length)]
          : {
              r: Math.floor(Math.random() * GRID_SIZE),
              c: Math.floor(Math.random() * GRID_SIZE),
            };
    const extraCoords =
      def.targetMode === 'ENEMY_3_CELLS'
        ? pool.slice(0, Math.min(3, pool.length))
        : def.targetMode === 'ENEMY_2_CELLS'
          ? pool.slice(0, Math.min(2, pool.length))
          : undefined;
    return {
      skillId: sid,
      targetCoord: def.targetMode.startsWith('OWN') ? randOwn : randEnemy,
      extraCoords,
      axis: Math.random() < 0.5 ? 'ROW' : 'COL',
      direction: ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)],
      shipId: ownBiggestAlive?.instanceId,
    };
  }

  // 1. Dập lửa khi đang cháy
  if (readySkills.includes('fire_suppression') && ownBurningShip) {
    return { skillId: 'fire_suppression', shipId: ownBurningShip.instanceId };
  }

  // 2. Sửa chữa lớn & sửa chữa khẩn cấp
  if (readySkills.includes('full_hull_overhaul') && ownDamagedShip) {
    return {
      skillId: 'full_hull_overhaul',
      shipId: ownDamagedShip.instanceId,
      targetCoord: ownDamagedShip.cells[0],
    };
  }
  if (readySkills.includes('flagship_overcharge') && ownDamagedShip) {
    return { skillId: 'flagship_overcharge' };
  }
  if (readySkills.includes('emergency_repair') && ownDamagedShip) {
    return {
      skillId: 'emergency_repair',
      shipId: ownDamagedShip.instanceId,
      targetCoord: ownDamagedShip.cells[0],
    };
  }

  // 3. Giảm CD / Hồi chiêu / Buff đạn / Cộng lượt
  const coolingCount = Object.values(aiState.skillCooldowns).filter(
    (cd) => cd >= 2
  ).length;
  if (readySkills.includes('fleet_maintenance') && coolingCount >= 2) {
    return { skillId: 'fleet_maintenance' };
  }
  if (readySkills.includes('cooldown_surge') && coolingCount >= 1) {
    return { skillId: 'cooldown_surge' };
  }
  if (readySkills.includes('combat_surge')) {
    return { skillId: 'combat_surge' };
  }
  if (readySkills.includes('ammo_boost') && !aiState.improvedAmmoReady) {
    return { skillId: 'ammo_boost' };
  }

  // 4. Khiên / Đánh chặn / Khói / Giáp / Né tránh
  if (
    readySkills.includes('flagship_bunker') &&
    (battleGoal === 'FLAGSHIP_HUNT' || ownDamagedShip || Math.random() < 0.45)
  ) {
    return { skillId: 'flagship_bunker' };
  }
  if (
    readySkills.includes('energy_shield') &&
    ownBiggestAlive &&
    (battleGoal === 'FLAGSHIP_HUNT' || ownDamagedShip || Math.random() < 0.4)
  ) {
    return { skillId: 'energy_shield', shipId: ownBiggestAlive.instanceId };
  }
  if (readySkills.includes('mirror_barrier') && ownBiggestAlive) {
    return { skillId: 'mirror_barrier', shipId: ownBiggestAlive.instanceId };
  }
  if (readySkills.includes('reflective_shield') && ownBiggestAlive) {
    return { skillId: 'reflective_shield', shipId: ownBiggestAlive.instanceId };
  }
  if (readySkills.includes('kevlar_bulkhead') && ownBiggestAlive) {
    return { skillId: 'kevlar_bulkhead', shipId: ownBiggestAlive.instanceId };
  }
  if (
    readySkills.includes('torpedo_net') &&
    !aiState.interceptorReady &&
    Math.random() < 0.55
  ) {
    return { skillId: 'torpedo_net' };
  }
  if (
    readySkills.includes('missile_interceptor') &&
    !aiState.interceptorReady &&
    Math.random() < 0.5
  ) {
    return { skillId: 'missile_interceptor' };
  }
  if (readySkills.includes('emp_deflector') && !aiState.ciwsReady) {
    return { skillId: 'emp_deflector' };
  }
  if (
    readySkills.includes('aegis_dome_3x3') &&
    (ownDamagedShip || ownBiggestAlive)
  ) {
    const tShip = ownDamagedShip ?? ownBiggestAlive!;
    return { skillId: 'aegis_dome_3x3', targetCoord: tShip.cells[0] };
  }
  if (readySkills.includes('dome_shield') && (ownDamagedShip || ownBiggestAlive)) {
    const tShip = ownDamagedShip ?? ownBiggestAlive!;
    const box = clampBoxOrigin(tShip.cells[0].r, tShip.cells[0].c, 2);
    return {
      skillId: 'dome_shield',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (
    readySkills.includes('airstrike_jammer') &&
    (ownDamagedShip || ownBiggestAlive)
  ) {
    const tShip = ownDamagedShip ?? ownBiggestAlive!;
    return { skillId: 'airstrike_jammer', targetCoord: tShip.cells[0] };
  }
  if (
    readySkills.includes('reactive_smoke') &&
    (ownDamagedShip || ownBiggestAlive)
  ) {
    const tShip = ownDamagedShip ?? ownBiggestAlive!;
    const box = clampBoxOrigin(tShip.cells[0].r, tShip.cells[0].c, 2);
    return {
      skillId: 'reactive_smoke',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (
    readySkills.includes('fleet_smoke_wall') &&
    (ownDamagedShip || ownBiggestAlive)
  ) {
    const tShip = ownDamagedShip ?? ownBiggestAlive!;
    return {
      skillId: 'fleet_smoke_wall',
      targetCoord: tShip.cells[0],
      direction: Math.random() < 0.5 ? 'RIGHT' : 'DOWN',
    };
  }
  if (
    readySkills.includes('smoke_screen') &&
    (ownDamagedShip || (ownFlagship && battleGoal === 'FLAGSHIP_HUNT'))
  ) {
    const targetShip = ownDamagedShip ?? ownFlagship ?? ownBiggestAlive;
    if (targetShip) {
      return { skillId: 'smoke_screen', targetCoord: targetShip.cells[0] };
    }
  }

  // Cơ động & Né tránh
  if (readySkills.includes('reposition_flagship') && ownDamagedShip) {
    return { skillId: 'reposition_flagship' };
  }
  if (
    readySkills.includes('turbo_dash_2') &&
    (ownSmallClean || ownDamagedShip)
  ) {
    const sh = ownSmallClean ?? ownDamagedShip!;
    return {
      skillId: 'turbo_dash_2',
      shipId: sh.instanceId,
      direction: ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)],
    };
  }
  if (
    readySkills.includes('strategic_relocation') &&
    (ownSmallClean || ownDamagedShip)
  ) {
    const sh = ownSmallClean ?? ownDamagedShip!;
    const dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
    return { skillId: 'strategic_relocation', shipId: sh.instanceId, direction: dir };
  }
  if (readySkills.includes('decoy_swap') && ownDamagedShip) {
    return { skillId: 'decoy_swap', shipId: ownDamagedShip.instanceId };
  }
  if (readySkills.includes('flip_ship_180') && ownDamagedShip) {
    return { skillId: 'flip_ship_180', shipId: ownDamagedShip.instanceId };
  }
  if (readySkills.includes('evasive_maneuver_all') && Math.random() < 0.35) {
    return { skillId: 'evasive_maneuver_all' };
  }
  if (readySkills.includes('tactical_evasion') && (ownFlagship || ownBiggestAlive)) {
    const sh = ownFlagship ?? ownBiggestAlive!;
    return { skillId: 'tactical_evasion', shipId: sh.instanceId };
  }

  // 5. Gây nhiễu EMP / Radar / Màn sương thông tin / Đánh lạc hướng
  if (level >= 4 && readySkills.includes('emp_jamming') && Math.random() < 0.55) {
    return { skillId: 'emp_jamming' };
  }
  if (level >= 4 && readySkills.includes('radar_jammer') && Math.random() < 0.4) {
    return { skillId: 'radar_jammer' };
  }
  if (
    level >= 3 &&
    readySkills.includes('false_log_spoof') &&
    aiState.infoFogTurns === 0 &&
    Math.random() < 0.4
  ) {
    return { skillId: 'false_log_spoof' };
  }
  if (
    level >= 3 &&
    readySkills.includes('info_fog') &&
    aiState.infoFogTurns === 0 &&
    Math.random() < 0.35
  ) {
    return { skillId: 'info_fog' };
  }

  // 6. Quét mìn nếu nghi có mìn trên lưới nhà
  if (
    readySkills.includes('minesweeper') &&
    aiState.hiddenMapMines.length > 0 &&
    ownBiggestAlive
  ) {
    return { skillId: 'minesweeper', targetCoord: ownBiggestAlive.cells[0] };
  }

  // 7. Khi đang có dấu vết tàu địch
  if (activeHits.length > 0) {
    const sorted = [...pool].sort(
      (a, b) => heatmap[b.r][b.c] - heatmap[a.r][a.c]
    );

    if (readySkills.includes('execute_shot')) {
      const best = chooseAIShot(
        level,
        humanState.receivedShots,
        humanState.ships,
        noTouch,
        humanState.decoys,
        battleGoal
      );
      return { skillId: 'execute_shot', targetCoord: best };
    }

    if (readySkills.includes('salvo_3')) {
      return {
        skillId: 'salvo_3',
        targetCoord: sorted[0],
        extraCoords: sorted.slice(0, Math.min(3, sorted.length)),
      };
    }

    if (readySkills.includes('rapid_salvo_2')) {
      return {
        skillId: 'rapid_salvo_2',
        targetCoord: sorted[0],
        extraCoords: sorted.slice(0, Math.min(2, sorted.length)),
      };
    }

    if (readySkills.includes('trap_salvo_2')) {
      return {
        skillId: 'trap_salvo_2',
        targetCoord: sorted[0],
        extraCoords: sorted.slice(0, Math.min(2, sorted.length)),
      };
    }

    if (readySkills.includes('railgun_pierce')) {
      const h = activeHits[0];
      const dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
      const delta = directionDelta(dir);
      return {
        skillId: 'railgun_pierce',
        targetCoord: {
          r: Math.max(0, Math.min(GRID_SIZE - 1, h.r - delta.dr * 2)),
          c: Math.max(0, Math.min(GRID_SIZE - 1, h.c - delta.dc * 2)),
        },
        direction: dir,
      };
    }

    if (readySkills.includes('armor_piercing')) {
      const best = chooseAIShot(
        level,
        humanState.receivedShots,
        humanState.ships,
        noTouch,
        humanState.decoys,
        battleGoal
      );
      return { skillId: 'armor_piercing', targetCoord: best };
    }

    if (readySkills.includes('shock_cannon')) {
      const best = chooseAIShot(
        level,
        humanState.receivedShots,
        humanState.ships,
        noTouch,
        humanState.decoys,
        battleGoal
      );
      return { skillId: 'shock_cannon', targetCoord: best };
    }

    if (readySkills.includes('incendiary_shell')) {
      const best = chooseAIShot(
        level,
        humanState.receivedShots,
        humanState.ships,
        noTouch,
        humanState.decoys,
        battleGoal
      );
      return { skillId: 'incendiary_shell', targetCoord: best };
    }

    if (readySkills.includes('ambush_mark')) {
      const best = chooseAIShot(
        level,
        humanState.receivedShots,
        humanState.ships,
        noTouch,
        humanState.decoys,
        battleGoal
      );
      return { skillId: 'ambush_mark', targetCoord: best };
    }

    if (readySkills.includes('cluster_missile')) {
      const box = clampBoxOrigin(activeHits[0].r, activeHits[0].c, 2);
      return {
        skillId: 'cluster_missile',
        targetCoord: { r: box.topR, c: box.leftC },
      };
    }

    if (readySkills.includes('heavy_artillery')) {
      const box = clampBoxOrigin(activeHits[0].r, activeHits[0].c, 2);
      return {
        skillId: 'heavy_artillery',
        targetCoord: { r: box.topR, c: box.leftC },
      };
    }

    if (readySkills.includes('carpet_bomb')) {
      return { skillId: 'carpet_bomb', targetCoord: activeHits[0] };
    }

    if (readySkills.includes('cross_x_strike')) {
      return { skillId: 'cross_x_strike', targetCoord: activeHits[0] };
    }

    if (readySkills.includes('depth_charge')) {
      return { skillId: 'depth_charge', targetCoord: activeHits[0] };
    }

    if (readySkills.includes('air_strike')) {
      let bestCrossCoord = activeHits[0];
      let bestSum = -1;
      for (const p of pool) {
        const cross = [
          p,
          { r: p.r - 1, c: p.c },
          { r: p.r + 1, c: p.c },
          { r: p.r, c: p.c - 1 },
          { r: p.r, c: p.c + 1 },
        ];
        const s = cross.reduce(
          (acc, c) =>
            c.r >= 0 &&
            c.r < GRID_SIZE &&
            c.c >= 0 &&
            c.c < GRID_SIZE &&
            !humanState.receivedShots[coordKey(c.r, c.c)]
              ? acc + heatmap[c.r][c.c]
              : acc,
          0
        );
        if (s > bestSum) {
          bestSum = s;
          bestCrossCoord = p;
        }
      }
      return { skillId: 'air_strike', targetCoord: bestCrossCoord };
    }

    if (readySkills.includes('torpedo_run')) {
      const h = activeHits[0];
      const dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
      const delta = directionDelta(dir);
      return {
        skillId: 'torpedo_run',
        targetCoord: {
          r: Math.max(0, Math.min(GRID_SIZE - 1, h.r - delta.dr * 2)),
          c: Math.max(0, Math.min(GRID_SIZE - 1, h.c - delta.dc * 2)),
        },
        direction: dir,
        axis: dir === 'LEFT' || dir === 'RIGHT' ? 'ROW' : 'COL',
      };
    }

    if (readySkills.includes('crosswind_push')) {
      return {
        skillId: 'crosswind_push',
        targetCoord: activeHits[0],
        direction: ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)],
      };
    }

    if (readySkills.includes('enemy_deviation')) {
      return {
        skillId: 'enemy_deviation',
        targetCoord: activeHits[0],
        direction: ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)],
      };
    }
  }

  // 8. Trinh sát mở rộng & bẫy / hỏa lực diện rộng
  if (readySkills.includes('flagship_tracker')) {
    return { skillId: 'flagship_tracker' };
  }
  if (readySkills.includes('sonar_calibration') && aiState.radarJamTurns === 0) {
    return { skillId: 'sonar_calibration' };
  }

  if (readySkills.includes('sonar_ping') || readySkills.includes('triangulate_scan')) {
    let bestCenter = pool[0];
    let bestScore = -1;
    for (let r = 1; r < GRID_SIZE - 1; r++) {
      for (let c = 1; c < GRID_SIZE - 1; c++) {
        let sum = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!humanState.receivedShots[coordKey(r + dr, c + dc)]) {
              sum += heatmap[r + dr][c + dc];
            }
          }
        }
        if (sum > bestScore) {
          bestScore = sum;
          bestCenter = { r, c };
        }
      }
    }
    return {
      skillId: readySkills.includes('sonar_ping')
        ? 'sonar_ping'
        : 'triangulate_scan',
      targetCoord: bestCenter,
    };
  }

  if (readySkills.includes('satellite_snapshot')) {
    const box = clampBoxOrigin(pool[0].r, pool[0].c, 2);
    return {
      skillId: 'satellite_snapshot',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (readySkills.includes('sonar_2x2')) {
    const box = clampBoxOrigin(pool[0].r, pool[0].c, 2);
    return {
      skillId: 'sonar_2x2',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (readySkills.includes('enemy_mine_detector')) {
    return { skillId: 'enemy_mine_detector', targetCoord: pool[0] };
  }
  if (readySkills.includes('diagonal_sweep')) {
    return {
      skillId: 'diagonal_sweep',
      targetCoord: pool[0],
      direction: ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)],
    };
  }
  if (readySkills.includes('directional_sonar')) {
    const dir = ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)];
    return { skillId: 'directional_sonar', targetCoord: pool[0], direction: dir };
  }
  if (readySkills.includes('recon_drone')) {
    const best = chooseAIShot(
      level,
      humanState.receivedShots,
      humanState.ships,
      noTouch,
      humanState.decoys,
      battleGoal
    );
    return {
      skillId: 'recon_drone',
      targetCoord: best,
      direction: Math.random() < 0.5 ? 'RIGHT' : 'DOWN',
    };
  }
  if (readySkills.includes('recon_plane')) {
    let bestAxis: 'ROW' | 'COL' = 'ROW';
    let bestIndex = 0;
    let bestSum = -1;
    for (let r = 0; r < GRID_SIZE; r++) {
      const s = heatmap[r].reduce((a, b) => a + b, 0);
      if (s > bestSum) {
        bestSum = s;
        bestAxis = 'ROW';
        bestIndex = r;
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let s = 0;
      for (let r = 0; r < GRID_SIZE; r++) s += heatmap[r][c];
      if (s > bestSum) {
        bestSum = s;
        bestAxis = 'COL';
        bestIndex = c;
      }
    }
    return {
      skillId: 'recon_plane',
      axis: bestAxis,
      targetCoord: {
        r: bestAxis === 'ROW' ? bestIndex : 0,
        c: bestAxis === 'COL' ? bestIndex : 0,
      },
    };
  }
  if (readySkills.includes('deep_flare') || readySkills.includes('flare_shell')) {
    const best = chooseAIShot(
      level,
      humanState.receivedShots,
      humanState.ships,
      noTouch,
      humanState.decoys,
      battleGoal
    );
    return {
      skillId: readySkills.includes('deep_flare') ? 'deep_flare' : 'flare_shell',
      targetCoord: best,
    };
  }
  if (readySkills.includes('edge_patrol')) {
    return { skillId: 'edge_patrol' };
  }

  // Đặt bẫy trên lưới nhà
  const ownTrapSkills: SkillId[] = [
    'sea_mine',
    'minefield_line',
    'magnetic_mine',
    'ghost_fleet',
    'decoy_flagship',
    'emp_grid',
    'emp_mine_single',
    'siren_beacon',
    'mine_relocate',
  ];
  const readyTrap = ownTrapSkills.find((s) => readySkills.includes(s));
  if (readyTrap) {
    const emptyOwn = emptyOwnCells();
    if (emptyOwn.length > 0) {
      const picked = emptyOwn[Math.floor(Math.random() * emptyOwn.length)];
      const needsBox2 =
        readyTrap === 'emp_grid' || readyTrap === 'siren_beacon';
      return {
        skillId: readyTrap,
        targetCoord: needsBox2
          ? {
              r: clampBoxOrigin(picked.r, picked.c, 2).topR,
              c: clampBoxOrigin(picked.r, picked.c, 2).leftC,
            }
          : picked,
      };
    }
  }

  // Fallback chung cho các kỹ năng còn lại (hỗ trợ / tấn công diện rộng / cơ động)
  if (readySkills.includes('follow_up_shot')) return { skillId: 'follow_up_shot' };
  if (readySkills.includes('artillery_barrage')) return { skillId: 'artillery_barrage' };
  if (readySkills.includes('carpet_bomb')) {
    return { skillId: 'carpet_bomb', targetCoord: pool[0] };
  }
  if (readySkills.includes('cluster_missile')) {
    const box = clampBoxOrigin(pool[0].r, pool[0].c, 2);
    return {
      skillId: 'cluster_missile',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (readySkills.includes('heavy_artillery')) {
    const box = clampBoxOrigin(pool[0].r, pool[0].c, 2);
    return {
      skillId: 'heavy_artillery',
      targetCoord: { r: box.topR, c: box.leftC },
    };
  }
  if (readySkills.includes('salvo_3')) {
    const sorted = [...pool].sort(
      (a, b) => heatmap[b.r][b.c] - heatmap[a.r][a.c]
    );
    return {
      skillId: 'salvo_3',
      targetCoord: sorted[0],
      extraCoords: sorted.slice(0, Math.min(3, sorted.length)),
    };
  }
  if (readySkills.includes('rapid_salvo_2')) {
    const sorted = [...pool].sort(
      (a, b) => heatmap[b.r][b.c] - heatmap[a.r][a.c]
    );
    return {
      skillId: 'rapid_salvo_2',
      targetCoord: sorted[0],
      extraCoords: sorted.slice(0, Math.min(2, sorted.length)),
    };
  }
  if (readySkills.includes('tidal_shockwave')) {
    return {
      skillId: 'tidal_shockwave',
      axis: 'ROW',
      direction: 'RIGHT',
      targetCoord: pool[0],
    };
  }

  return null;
}
