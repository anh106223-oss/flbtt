import { GRID_SIZE } from './nationsAndFleets';
import {
  OceanEventDefinition,
  OceanEventId,
  ScheduledOceanEvent,
} from '../types/game';

export const OCEAN_EVENTS: Record<OceanEventId, OceanEventDefinition> = {
  SATELLITE_UPLINK: {
    id: 'SATELLITE_UPLINK',
    name: 'Tín Hiệu Định Vị Vệ Tinh',
    badge: 'Vệ Tinh 6×6',
    shortDesc:
      'Gỡ bỏ sương mù chiến thuật tại một góc 6×6 ngẫu nhiên trong 1 lượt, soi rõ toàn bộ phân đoạn tàu.',
    accentColor: 'cyan',
  },
  MAELSTROM_VORTEX: {
    id: 'MAELSTROM_VORTEX',
    name: 'Vùng Nước Xoáy Ngầm',
    badge: 'Xoáy Tử Thần',
    shortDesc:
      'Từ lượt 10+, tạo hố xoáy tử thần; tàu nằm trên hoặc đi qua chịu 1 sát thương trực tiếp và bị đẩy sang ô bên cạnh.',
    accentColor: 'violet',
  },
  FUEL_LEAK: {
    id: 'FUEL_LEAK',
    name: 'Tràn Nhiên Liệu Khẩn Cấp',
    badge: 'Vệt Dầu 2 Ô',
    shortDesc:
      'Một tàu ngẫu nhiên bị rò rỉ nhiên liệu, để lộ vệt sáng cảnh báo kéo dài 2 ô liền kề trong lượt hiện tại.',
    accentColor: 'amber',
  },
  DENSE_FOG: {
    id: 'DENSE_FOG',
    name: 'Sương Mù Dày Đặc Ban Đêm',
    badge: 'Sương Mù 2 Lượt',
    shortDesc:
      'Phủ toàn bàn cờ trong 2 lượt liên tiếp: tăng +1 CD tất cả kỹ năng chủ động của hai bên và giảm hiệu quả trinh sát.',
    accentColor: 'slate',
  },
  SUDDEN_STORM: {
    id: 'SUDDEN_STORM',
    name: 'Bão Tụ Đại Dương',
    badge: 'Vùng Bão 5×5',
    shortDesc:
      'Xuất hiện đầu lượt chẵn (≥ 6): tạo bão 5×5 trong 2 lượt; Pháo kích, Không kích & Quét Sonar vào vùng bão đều trượt.',
    accentColor: 'indigo',
  },
  SOLAR_FLARE_EMP: {
    id: 'SOLAR_FLARE_EMP',
    name: 'Bão Điện Từ Mặt Trời',
    badge: 'Khóa Skill EMP',
    shortDesc:
      'Bức xạ mặt trời quét qua chiến trường qua nửa trận: khóa cứng toàn bộ kỹ năng chủ động cả 2 bên trong lượt hiện tại.',
    accentColor: 'rose',
  },
  CURRENT_DRIFT: {
    id: 'CURRENT_DRIFT',
    name: 'Dòng Hải Lưu Cuốn Trôi',
    badge: 'Trôi Thủy Lôi/Mồi',
    shortDesc:
      'Toàn bộ Thủy lôi ngầm và Tín hiệu giả trên bản đồ bị cuốn trôi 1 ô sang hướng Đông hoặc Tây.',
    accentColor: 'teal',
  },
};

export const ALL_OCEAN_EVENT_IDS: OceanEventId[] = Object.keys(
  OCEAN_EVENTS
) as OceanEventId[];

/**
 * Lên lịch ngẫu nhiên CẢ 7 sự kiện đại dương trong cùng 1 ván đấu:
 * - Bắt đầu ở lượt ngẫu nhiên trong khoảng 10–20.
 * - Các sự kiện kế tiếp cách nhau ngẫu nhiên 8–15 lượt.
 * - Thứ tự 7 sự kiện được xáo trộn và rải đều trên 2 bàn.
 */
export function scheduleMatchOceanEvents(
  isVsAI: boolean
): ScheduledOceanEvent[] {
  const pool = [...ALL_OCEAN_EVENT_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Luân phiên tác động P1 & P2 cho các sự kiện theo bàn
  const startBoard: 'P1' | 'P2' = Math.random() < 0.5 ? 'P1' : 'P2';
  let nonGlobalCounter = 0;

  let currentTurn = 10 + Math.floor(Math.random() * 11); // 10..20

  return pool.map((id, idx) => {
    if (idx === 0) {
      // Nếu sự kiện đầu là Bão Tụ (lượt chẵn), giữ nằm gọn trong [10..20]
      if (id === 'SUDDEN_STORM' && currentTurn % 2 !== 0) {
        currentTurn = currentTurn < 20 ? currentTurn + 1 : 18;
      }
    } else {
      const allGaps = [8, 9, 10, 11, 12, 13, 14, 15];
      const validGaps =
        id === 'SUDDEN_STORM'
          ? allGaps.filter((g) => (currentTurn + g) % 2 === 0)
          : allGaps;
      const gap = validGaps[Math.floor(Math.random() * validGaps.length)];
      currentTurn += gap;
    }

    const isGlobal = id === 'DENSE_FOG' || id === 'SOLAR_FLARE_EMP';
    let targetBoard: 'P1' | 'P2' | 'BOTH' = 'BOTH';
    if (!isGlobal) {
      targetBoard =
        nonGlobalCounter % 2 === 0
          ? startBoard
          : startBoard === 'P1'
            ? 'P2'
            : 'P1';
      nonGlobalCounter++;
    }

    const triggerSide: 'P1' | 'P2' =
      id === 'SATELLITE_UPLINK'
        ? isVsAI
          ? 'P1'
          : targetBoard === 'P2'
            ? 'P1'
            : 'P2'
        : isGlobal
          ? idx % 2 === 0
            ? 'P1'
            : 'P2'
          : targetBoard === 'P1'
            ? 'P1'
            : 'P2';

    return {
      id,
      triggerTurn: currentTurn,
      triggerSide,
      targetBoard,
      triggered: false,
    };
  });
}

export function randomCorner6x6(): { topR: number; leftC: number } {
  const maxStart = Math.max(0, GRID_SIZE - 6);
  const corners = [
    { topR: 0, leftC: 0 },
    { topR: 0, leftC: maxStart },
    { topR: maxStart, leftC: 0 },
    { topR: maxStart, leftC: maxStart },
    { topR: Math.floor(maxStart / 2), leftC: Math.floor(maxStart / 2) },
  ];
  return corners[Math.floor(Math.random() * corners.length)];
}
