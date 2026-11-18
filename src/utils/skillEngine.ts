import { GRID_SIZE } from '../data/nationsAndFleets';
import { SKILLS } from '../data/skills';
import {
  CardinalDirection,
  Coord,
  PlacedShip,
  PlayerBattleState,
  ShotResultStatus,
  SkillId,
} from '../types/game';
import {
  canPlaceShip,
  coordKey,
  formatCoordLabel,
  rotateOffsetsCW,
} from './fleetLogic';

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

export function directionDelta(dir: CardinalDirection): { dr: number; dc: number } {
  switch (dir) {
    case 'UP':
      return { dr: -1, dc: 0 };
    case 'DOWN':
      return { dr: 1, dc: 0 };
    case 'LEFT':
      return { dr: 0, dc: -1 };
    case 'RIGHT':
      return { dr: 0, dc: 1 };
  }
}

export function dirLabelVi(dir: CardinalDirection): string {
  switch (dir) {
    case 'UP':
      return 'Lên';
    case 'DOWN':
      return 'Xuống';
    case 'LEFT':
      return 'Trái';
    case 'RIGHT':
      return 'Phải';
  }
}

export function clampBoxOrigin(
  r: number,
  c: number,
  size: number
): { topR: number; leftC: number } {
  const maxStart = Math.max(0, GRID_SIZE - size);
  return {
    topR: Math.max(0, Math.min(maxStart, r)),
    leftC: Math.max(0, Math.min(maxStart, c)),
  };
}

export function getAreaCells(topR: number, leftC: number, size: number): Coord[] {
  const out: Coord[] = [];
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      const rr = topR + dr;
      const cc = leftC + dc;
      if (inBounds(rr, cc)) out.push({ r: rr, c: cc });
    }
  }
  return out;
}

export function getCrossCells(center: Coord): Coord[] {
  return [
    center,
    { r: center.r - 1, c: center.c },
    { r: center.r + 1, c: center.c },
    { r: center.r, c: center.c - 1 },
    { r: center.r, c: center.c + 1 },
  ].filter((pt) => inBounds(pt.r, pt.c));
}

export function getLineCells(
  start: Coord,
  dir: CardinalDirection,
  maxLen: number
): Coord[] {
  const { dr, dc } = directionDelta(dir);
  const out: Coord[] = [];
  for (let i = 0; i < maxLen; i++) {
    const rr = start.r + dr * i;
    const cc = start.c + dc * i;
    if (!inBounds(rr, cc)) break;
    out.push({ r: rr, c: cc });
  }
  return out;
}

export function getXCells(center: Coord): Coord[] {
  return [
    center,
    { r: center.r - 1, c: center.c - 1 },
    { r: center.r - 1, c: center.c + 1 },
    { r: center.r + 1, c: center.c - 1 },
    { r: center.r + 1, c: center.c + 1 },
  ].filter((pt) => inBounds(pt.r, pt.c));
}

export function getDiagonalLineCells(
  start: Coord,
  dir: CardinalDirection,
  maxLen: number = 5
): Coord[] {
  const step =
    dir === 'UP'
      ? { dr: -1, dc: 1 }
      : dir === 'RIGHT'
        ? { dr: 1, dc: 1 }
        : dir === 'DOWN'
          ? { dr: 1, dc: -1 }
          : { dr: -1, dc: -1 };
  const out: Coord[] = [];
  for (let i = 0; i < maxLen; i++) {
    const rr = start.r + step.dr * i;
    const cc = start.c + step.dc * i;
    if (!inBounds(rr, cc)) break;
    out.push({ r: rr, c: cc });
  }
  return out;
}

/**
 * 05. Sonar Định Hướng: tạo tập hợp 5 ô theo hình nón/chéo từ tọa độ gốc & hướng
 * (Các ô ngoài biên bị bỏ qua, không tự động mở rộng)
 */
export function getDirectionalConeCells(
  origin: Coord,
  dir: CardinalDirection
): Coord[] {
  let raw: Coord[];
  switch (dir) {
    case 'RIGHT':
      raw = [
        origin,
        { r: origin.r - 1, c: origin.c + 1 },
        { r: origin.r + 1, c: origin.c + 1 },
        { r: origin.r - 2, c: origin.c + 2 },
        { r: origin.r + 2, c: origin.c + 2 },
      ];
      break;
    case 'LEFT':
      raw = [
        origin,
        { r: origin.r - 1, c: origin.c - 1 },
        { r: origin.r + 1, c: origin.c - 1 },
        { r: origin.r - 2, c: origin.c - 2 },
        { r: origin.r + 2, c: origin.c - 2 },
      ];
      break;
    case 'UP':
      raw = [
        origin,
        { r: origin.r - 1, c: origin.c - 1 },
        { r: origin.r - 1, c: origin.c + 1 },
        { r: origin.r - 2, c: origin.c - 2 },
        { r: origin.r - 2, c: origin.c + 2 },
      ];
      break;
    case 'DOWN':
      raw = [
        origin,
        { r: origin.r + 1, c: origin.c - 1 },
        { r: origin.r + 1, c: origin.c + 1 },
        { r: origin.r + 2, c: origin.c - 2 },
        { r: origin.r + 2, c: origin.c + 2 },
      ];
      break;
  }
  return raw.filter((pt) => inBounds(pt.r, pt.c));
}

export function hasPassive(state: PlayerBattleState, id: SkillId): boolean {
  return state.setup.skillIds.includes(id);
}

/**
 * Áp dụng Bị động 08 (Tần Số Tảo Quét): giảm 1 CD cho các kỹ năng Trinh Sát đang hồi
 * Ngoại lệ: không làm kỹ năng vừa dùng trong lượt lập tức về 0 nếu justUsedId được truyền vào.
 */
export function applySweepingFrequency(
  att: PlayerBattleState,
  justUsedId?: SkillId
): PlayerBattleState {
  if (!hasPassive(att, 'sweeping_frequency')) return att;
  const nextCooldowns = { ...att.skillCooldowns };
  let changed = false;
  for (const sid of att.setup.skillIds) {
    if (sid === justUsedId) continue;
    const def = SKILLS[sid];
    if (def?.category === 'RECON' && (nextCooldowns[sid] ?? 0) > 0) {
      nextCooldowns[sid] = Math.max(0, nextCooldowns[sid] - 1);
      changed = true;
    }
  }
  return changed ? { ...att, skillCooldowns: nextCooldowns } : att;
}

/**
 * 09. Phân Tích Tín Hiệu: lưu snapshot ID tàu & tọa độ phát hiện (không tự cập nhật nếu tàu dời chỗ)
 */
export function recordSignalAnalysis(
  att: PlayerBattleState,
  shipId: string,
  cellKey: string
): PlayerBattleState {
  if (!hasPassive(att, 'signal_analysis')) return att;
  const existing = att.signalAnalysisRecords[shipId] ?? [];
  if (existing.includes(cellKey)) return att;
  return {
    ...att,
    signalAnalysisRecords: {
      ...att.signalAnalysisRecords,
      [shipId]: [...existing, cellKey],
    },
  };
}

/**
 * Hồi 1 điểm giáp / HP cho phân đoạn hoặc tàu bị thương (chưa chìm hoàn toàn)
 */
export function repairOneSegmentOnShip(
  state: PlayerBattleState,
  shipId: string,
  preferredKey?: string
): { nextState: PlayerBattleState; repaired: boolean; detail: string } {
  const ship = state.ships.find((s) => s.instanceId === shipId && !s.sunk);
  if (!ship) {
    return {
      nextState: state,
      repaired: false,
      detail: 'Không thể sửa tàu đã chìm hoặc không hợp lệ.',
    };
  }

  // 1. Hồi giáp tổng của tàu (Soái Hạm / Giáp Gia Cường) nếu đang hụt giáp
  if ((ship.armorMax ?? 0) > 0 && (ship.armorRemaining ?? 0) < (ship.armorMax ?? 0)) {
    const nextShots = { ...state.receivedShots };
    for (const c of ship.cells) {
      const k = coordKey(c.r, c.c);
      if (nextShots[k] === 'armor') {
        delete nextShots[k];
      }
    }
    return {
      nextState: {
        ...state,
        receivedShots: nextShots,
        ships: state.ships.map((s) =>
          s.instanceId === ship.instanceId
            ? { ...s, armorRemaining: (s.armorRemaining ?? 0) + 1 }
            : s
        ),
      },
      repaired: true,
      detail: `Hồi +1 lớp giáp cho ${ship.name}!`,
    };
  }

  // 2. Hồi phân đoạn đang mất HP hoặc vết hit trên tàu chưa chìm
  const segHp = { ...(ship.segmentHp ?? {}) };
  const segMax = { ...(ship.segmentMaxHp ?? {}) };
  let healedKey: string | undefined;

  if (preferredKey && ship.cells.some((c) => coordKey(c.r, c.c) === preferredKey)) {
    const cur = segHp[preferredKey] ?? (ship.hits.includes(preferredKey) ? 0 : 1);
    const maxV = segMax[preferredKey] ?? 1;
    if (cur < maxV) {
      healedKey = preferredKey;
    }
  }

  if (!healedKey) {
    for (const c of ship.cells) {
      const k = coordKey(c.r, c.c);
      const cur = segHp[k] ?? (ship.hits.includes(k) ? 0 : 1);
      const maxV = segMax[k] ?? 1;
      if (cur > 0 && cur < maxV) {
        healedKey = k;
        break;
      }
    }
  }

  if (!healedKey && ship.hits.length > 0) {
    // Khôi phục phân đoạn bị thương trên tàu còn sống (chỉ khi tàu chưa chìm)
    healedKey = ship.hits[0];
  }

  if (!healedKey) {
    return {
      nextState: state,
      repaired: false,
      detail: `${ship.name} hiện đang nguyên vẹn giáp.`,
    };
  }

  const nextSegHp = { ...segHp };
  const curVal = nextSegHp[healedKey] ?? (ship.hits.includes(healedKey) ? 0 : 1);
  const maxVal = segMax[healedKey] ?? 1;
  nextSegHp[healedKey] = Math.min(maxVal, curVal + 1);

  const nextHits = ship.hits.filter((h) => h !== healedKey);
  const nextShots = { ...state.receivedShots };
  if (nextShots[healedKey] === 'hit' || nextShots[healedKey] === 'armor') {
    delete nextShots[healedKey];
  }

  const [hr, hc] = healedKey.split(',').map(Number);
  return {
    nextState: {
      ...state,
      receivedShots: nextShots,
      ships: state.ships.map((s) =>
        s.instanceId === ship.instanceId
          ? { ...s, hits: nextHits, segmentHp: nextSegHp }
          : s
      ),
    },
    repaired: true,
    detail: `Sửa chữa khẩn cấp phân đoạn ${formatCoordLabel(hr, hc)} trên ${ship.name}!`,
  };
}

/**
 * Kiểm tra xem người chơi có quyền biết vật cản trước khi dịch chuyển không (54. Bản Đồ Thủy Văn)
 */
export function checkHydrographicHazards(
  state: PlayerBattleState,
  candidateCells: Coord[],
  isEnemyView: boolean
): string[] {
  const warnings: string[] = [];
  const rockSet = new Set(state.rocks);
  const visibleMineSet = isEnemyView
    ? new Set(state.revealedMineCells)
    : new Set(state.mines);

  for (const pt of candidateCells) {
    if (!inBounds(pt.r, pt.c)) {
      warnings.push(`vượt biên ${formatCoordLabel(pt.r, pt.c)}`);
      continue;
    }
    const k = coordKey(pt.r, pt.c);
    if (rockSet.has(k)) {
      warnings.push(`đá ngầm tại ${formatCoordLabel(pt.r, pt.c)}`);
    }
    if (visibleMineSet.has(k)) {
      warnings.push(`thủy lôi đã biết tại ${formatCoordLabel(pt.r, pt.c)}`);
    }
  }
  return warnings;
}

/**
 * Dịch chuyển nguyên 1 con tàu sang tọa độ mới:
 * - Bảo toàn hình dạng, sát thương từng phân đoạn, trạng thái cháy
 * - Reset trạng thái hiển thị các ô cũ & xóa vết 'miss' cũ tại các ô mới (không hồi sinh tàu chìm!)
 * - Tự động kích nổ thủy lôi nếu thân tàu mới đè lên ô có thủy lôi
 */
export function relocateShipWithRollback(
  boardOwner: PlayerBattleState,
  ship: PlacedShip,
  newAnchor: Coord,
  newOffsets: PlacedShip['offsets'],
  newCells: Coord[],
  newRotation: PlacedShip['rotation'] = ship.rotation
): {
  nextState: PlayerBattleState;
  detonatedCoords: Coord[];
} {
  if (ship.sunk) {
    return { nextState: boardOwner, detonatedCoords: [] };
  }

  const hitIndices = new Set<number>();
  const oldSegHpByIdx = new Map<number, number>();
  const oldSegMaxByIdx = new Map<number, number>();
  const burningByIdx = new Map<number, { shipId: string; turnsLeft: number }>();

  ship.cells.forEach((cell, idx) => {
    const k = coordKey(cell.r, cell.c);
    if (ship.hits.includes(k)) {
      hitIndices.add(idx);
    }
    if (ship.segmentHp && ship.segmentHp[k] !== undefined) {
      oldSegHpByIdx.set(idx, ship.segmentHp[k]);
    }
    if (ship.segmentMaxHp && ship.segmentMaxHp[k] !== undefined) {
      oldSegMaxByIdx.set(idx, ship.segmentMaxHp[k]);
    }
    if (boardOwner.burningCells[k]) {
      burningByIdx.set(idx, boardOwner.burningCells[k]);
    }
  });

  const nextShots: Record<string, ShotResultStatus> = {
    ...boardOwner.receivedShots,
  };
  const nextHiddenMarks = { ...boardOwner.hiddenHitMarks };
  const nextBurning = { ...boardOwner.burningCells };

  // Reset hiển thị các ô cũ (chỉ với tàu chưa chìm!)
  for (const cell of ship.cells) {
    const ok = coordKey(cell.r, cell.c);
    if (
      nextShots[ok] === 'hit' ||
      nextShots[ok] === 'armor' ||
      nextShots[ok] === 'miss'
    ) {
      delete nextShots[ok];
    }
    delete nextHiddenMarks[ok];
    delete nextBurning[ok];
  }

  const newHits: string[] = [];
  const newSegHp: Record<string, number> = {};
  const newSegMax: Record<string, number> = {};

  newCells.forEach((cell, idx) => {
    const nk = coordKey(cell.r, cell.c);
    // Reset ô 'miss'/'hit'/'armor' bị đè vào ở vị trí mới theo luật Rollback
    if (
      nextShots[nk] === 'miss' ||
      nextShots[nk] === 'hit' ||
      nextShots[nk] === 'armor'
    ) {
      delete nextShots[nk];
    }
    if (hitIndices.has(idx)) {
      newHits.push(nk);
    }
    if (oldSegHpByIdx.has(idx)) {
      newSegHp[nk] = oldSegHpByIdx.get(idx)!;
    }
    if (oldSegMaxByIdx.has(idx)) {
      newSegMax[nk] = oldSegMaxByIdx.get(idx)!;
    }
    if (burningByIdx.has(idx)) {
      nextBurning[nk] = burningByIdx.get(idx)!;
    }
  });

  // Kiểm tra va chạm Thủy Lôi tại vị trí mới -> kích nổ trực tiếp (trừ khi có 120. Hoa Tiêu Đá Ngầm tránh mìn nhà)
  const avoidOwnMines = hasPassive(boardOwner, 'rock_navigator');
  const mineSet = avoidOwnMines ? new Set<string>() : new Set(boardOwner.mines);
  const hiddenMineSet = new Set(boardOwner.hiddenMapMines);
  const detonatedKeys = new Set<string>();
  const detonatedCoords: Coord[] = [];

  for (const cell of newCells) {
    const nk = coordKey(cell.r, cell.c);
    if (mineSet.has(nk) || hiddenMineSet.has(nk)) {
      detonatedKeys.add(nk);
      detonatedCoords.push(cell);
      if (!newHits.includes(nk)) {
        newHits.push(nk);
      }
      newSegHp[nk] = 0;
      nextShots[nk] = 'hit';
    }
  }

  const isNowSunk = newHits.length >= newCells.length;
  if (isNowSunk) {
    for (const sc of newCells) {
      nextShots[coordKey(sc.r, sc.c)] = 'sunk';
    }
  }

  const nextShips = boardOwner.ships.map((s) =>
    s.instanceId === ship.instanceId
      ? {
          ...s,
          anchor: newAnchor,
          offsets: newOffsets,
          cells: newCells,
          rotation: newRotation,
          hits: newHits,
          sunk: isNowSunk,
          segmentHp: Object.keys(newSegHp).length > 0 ? newSegHp : s.segmentHp,
          segmentMaxHp:
            Object.keys(newSegMax).length > 0 ? newSegMax : s.segmentMaxHp,
        }
      : s
  );

  return {
    nextState: {
      ...boardOwner,
      ships: nextShips,
      receivedShots: nextShots,
      hiddenHitMarks: nextHiddenMarks,
      burningCells: nextBurning,
      mines: boardOwner.mines.filter((m) => !detonatedKeys.has(m)),
      hiddenMapMines: boardOwner.hiddenMapMines.filter(
        (m) => !detonatedKeys.has(m)
      ),
      revealedMineCells: boardOwner.revealedMineCells.filter(
        (m) => !detonatedKeys.has(m)
      ),
    },
    detonatedCoords,
  };
}

/**
 * 46. Sóng Xung Kích: đẩy tàu (theo thứ tự từ đầu sóng trước để không đụng nhau) & cuốn trôi thủy lôi 1 ô
 */
export function executeTidalShockwaveLine(
  targetState: PlayerBattleState,
  axis: 'ROW' | 'COL',
  lineIndex: number,
  dir: CardinalDirection,
  noTouch: boolean
): {
  nextState: PlayerBattleState;
  movedShipCount: number;
  driftedMinesCount: number;
  mineHits: Coord[];
} {
  let working = { ...targetState };
  const { dr, dc } = directionDelta(dir);

  // Kiểm tra bị động 53. Ổn Định Đội Hình
  const wholeFleetImmune = hasPassive(working, 'formation_stability');

  const lineShips = working.ships.filter(
    (s) =>
      !s.sunk &&
      !wholeFleetImmune &&
      !working.evasionProtectedShipIds.includes(s.instanceId) &&
      s.cells.some((c) => (axis === 'ROW' ? c.r === lineIndex : c.c === lineIndex))
  );

  // Sắp xếp tàu nằm ở đầu hướng đẩy xử lý trước để tránh tự kẹt nhau
  const orderedShips = [...lineShips].sort((a, b) => {
    const scoreA = a.anchor.r * dr + a.anchor.c * dc;
    const scoreB = b.anchor.r * dr + b.anchor.c * dc;
    return scoreB - scoreA;
  });

  let movedShipCount = 0;
  const mineHits: Coord[] = [];

  for (const s of orderedShips) {
    const live = working.ships.find((sh) => sh.instanceId === s.instanceId);
    if (!live || live.sunk) continue;
    const nr = live.anchor.r + dr;
    const nc = live.anchor.c + dc;
    const check = canPlaceShip(
      live.offsets,
      nr,
      nc,
      working.ships,
      noTouch,
      live.instanceId,
      working.rocks
    );
    if (check.valid) {
      const res = relocateShipWithRollback(
        working,
        live,
        { r: nr, c: nc },
        live.offsets,
        check.cells
      );
      working = res.nextState;
      movedShipCount++;
      mineHits.push(...res.detonatedCoords);
    }
  }

  // Cuốn trôi thủy lôi nằm trên hàng/cột sóng quét 1 ô theo hướng sóng
  const rockSet = new Set(working.rocks);
  const shiftMines = (mineList: string[]): { next: string[]; drifted: number } => {
    const out: string[] = [];
    let drifted = 0;
    for (const mk of mineList) {
      const [mr, mc] = mk.split(',').map(Number);
      const onLine = axis === 'ROW' ? mr === lineIndex : mc === lineIndex;
      if (!onLine) {
        out.push(mk);
        continue;
      }
      const nr = mr + dr;
      const nc = mc + dc;
      const nk = coordKey(nr, nc);
      if (!inBounds(nr, nc) || rockSet.has(nk)) {
        out.push(mk);
        continue;
      }
      drifted++;
      // Nếu trôi thẳng vào phân đoạn tàu -> kích hoạt nổ ngay!
      const hitShip = working.ships.find(
        (sh) => !sh.sunk && sh.cells.some((sc) => sc.r === nr && sc.c === nc)
      );
      if (hitShip) {
        mineHits.push({ r: nr, c: nc });
        const nextShots = { ...working.receivedShots };
        working = {
          ...working,
          receivedShots: nextShots,
          ships: working.ships.map((sh) => {
            if (sh.instanceId !== hitShip.instanceId) return sh;
            const uh = sh.hits.includes(nk) ? sh.hits : [...sh.hits, nk];
            const sunk = uh.length >= sh.cells.length;
            if (sunk) {
              for (const sc of sh.cells) nextShots[coordKey(sc.r, sc.c)] = 'sunk';
            } else {
              nextShots[nk] = 'hit';
            }
            return { ...sh, hits: uh, sunk };
          }),
        };
      } else if (!out.includes(nk)) {
        out.push(nk);
      }
    }
    return { next: out, drifted };
  };

  const r1 = shiftMines(working.mines);
  const r2 = shiftMines(working.hiddenMapMines);
  working = {
    ...working,
    mines: r1.next,
    hiddenMapMines: r2.next,
  };

  return {
    nextState: working,
    movedShipCount,
    driftedMinesCount: r1.drifted + r2.drifted,
    mineHits,
  };
}

/**
 * 47. Đổi Góc Hướng Tàu: xoay 90° quanh điểm neo nếu hợp lệ
 */
export function tryRotateOwnShip90(
  owner: PlayerBattleState,
  shipId: string,
  noTouch: boolean
): { nextState: PlayerBattleState; rotated: boolean; reason?: string } {
  const ship = owner.ships.find((s) => s.instanceId === shipId && !s.sunk);
  if (!ship) {
    return { nextState: owner, rotated: false, reason: 'Tàu không hợp lệ hoặc đã chìm.' };
  }
  const rotatedOffsets = rotateOffsetsCW(ship.offsets);
  const nextRotation = ((ship.rotation + 90) % 360) as PlacedShip['rotation'];
  const check = canPlaceShip(
    rotatedOffsets,
    ship.anchor.r,
    ship.anchor.c,
    owner.ships,
    noTouch,
    ship.instanceId,
    owner.rocks
  );
  if (!check.valid) {
    return {
      nextState: owner,
      rotated: false,
      reason: 'Vị trí sau khi xoay bị vướng biên, đá ngầm hoặc tàu khác.',
    };
  }
  const res = relocateShipWithRollback(
    owner,
    ship,
    ship.anchor,
    rotatedOffsets,
    check.cells,
    nextRotation
  );
  return { nextState: res.nextState, rotated: true };
}

/**
 * 111. Xoay Đầu Tàu 180° quanh điểm neo nếu hợp lệ
 */
export function tryRotateOwnShip180(
  owner: PlayerBattleState,
  shipId: string,
  noTouch: boolean
): { nextState: PlayerBattleState; rotated: boolean; reason?: string } {
  const ship = owner.ships.find((s) => s.instanceId === shipId && !s.sunk);
  if (!ship) {
    return { nextState: owner, rotated: false, reason: 'Tàu không hợp lệ hoặc đã chìm.' };
  }
  const flippedOffsets = rotateOffsetsCW(rotateOffsetsCW(ship.offsets));
  const nextRotation = ((ship.rotation + 180) % 360) as PlacedShip['rotation'];
  const check = canPlaceShip(
    flippedOffsets,
    ship.anchor.r,
    ship.anchor.c,
    owner.ships,
    noTouch,
    ship.instanceId,
    owner.rocks
  );
  if (!check.valid) {
    return {
      nextState: owner,
      rotated: false,
      reason: 'Vị trí sau khi đảo đầu 180° bị vướng biên, đá ngầm hoặc tàu khác.',
    };
  }
  const res = relocateShipWithRollback(
    owner,
    ship,
    ship.anchor,
    flippedOffsets,
    check.cells,
    nextRotation
  );
  return { nextState: res.nextState, rotated: true };
}

/**
 * 50. Tái Lập Đội Hình: hoán đổi vị trí giữa 2 tàu nhà chưa chìm
 */
export function trySwapTwoOwnShips(
  owner: PlayerBattleState,
  shipAId: string,
  shipBId: string,
  noTouch: boolean
): { nextState: PlayerBattleState; swapped: boolean; reason?: string } {
  if (shipAId === shipBId) {
    return { nextState: owner, swapped: false, reason: 'Phải chọn 2 tàu khác nhau.' };
  }
  const shipA = owner.ships.find((s) => s.instanceId === shipAId && !s.sunk);
  const shipB = owner.ships.find((s) => s.instanceId === shipBId && !s.sunk);
  if (!shipA || !shipB) {
    return { nextState: owner, swapped: false, reason: 'Chỉ được hoán đổi tàu chưa chìm.' };
  }

  // Tạo danh sách tàu tạm thời không gồm A & B để kiểm tra độc lập cả 2 vị trí mới
  const others = owner.ships.filter(
    (s) => s.instanceId !== shipAId && s.instanceId !== shipBId
  );

  const checkAatB = canPlaceShip(
    shipA.offsets,
    shipB.anchor.r,
    shipB.anchor.c,
    others,
    noTouch,
    shipA.instanceId,
    owner.rocks
  );
  if (!checkAatB.valid) {
    return {
      nextState: owner,
      swapped: false,
      reason: `${shipA.name} không vừa tại vị trí của ${shipB.name}.`,
    };
  }

  const fakePlacedA: PlacedShip = {
    ...shipA,
    anchor: shipB.anchor,
    cells: checkAatB.cells,
  };
  const checkBatA = canPlaceShip(
    shipB.offsets,
    shipA.anchor.r,
    shipA.anchor.c,
    [...others, fakePlacedA],
    noTouch,
    shipB.instanceId,
    owner.rocks
  );
  if (!checkBatA.valid) {
    return {
      nextState: owner,
      swapped: false,
      reason: `${shipB.name} không vừa tại vị trí của ${shipA.name} hoặc chạm nhau.`,
    };
  }

  // Thực hiện hoán đổi song song
  const anchorA = { ...shipA.anchor };
  const anchorB = { ...shipB.anchor };
  let working = relocateShipWithRollback(
    owner,
    shipA,
    anchorB,
    shipA.offsets,
    checkAatB.cells,
    shipA.rotation
  ).nextState;

  const liveB = working.ships.find((s) => s.instanceId === shipB.instanceId)!;
  working = relocateShipWithRollback(
    working,
    liveB,
    anchorA,
    liveB.offsets,
    checkBatA.cells,
    liveB.rotation
  ).nextState;

  return { nextState: working, swapped: true };
}
