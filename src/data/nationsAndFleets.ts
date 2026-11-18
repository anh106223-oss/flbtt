import {
  AIDifficulty,
  BattleGoal,
  FiringRule,
  FleetFormationId,
  MapMode,
  NationId,
  NationProfile,
  ShipTemplate,
} from '../types/game';

export const GRID_SIZE = 18;
export const COL_LABELS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
];
export const MAX_CUSTOM_CELLS = 74;
export const MAX_MAP_ROCKS = 8;
export const MAX_MAP_MINES = 8;
export const FLAGSHIP_ARMOR_LAYERS = 3;

export const MAP_MODES: {
  id: MapMode;
  name: string;
  desc: string;
}[] = [
  {
    id: 'OPEN_SEA',
    name: '1. Biển Mở Cổ Điển',
    desc: 'Mặt biển 18×18 thoáng đãng, không đá ngầm và không thủy lôi bản đồ.',
  },
  {
    id: 'CUSTOM_HAZARDS',
    name: '2. Bản Đồ Địa Hình (8 Đá + 8 Thủy Lôi)',
    desc: 'Trước khi xếp tàu, bạn và AI mỗi bên xếp 8 đá (hiển thị) + 8 thủy lôi (ẩn) lên bản đồ đối phương. Đặt tàu đè thủy lôi ẩn sẽ bị bắn trúng khi vào trận!',
  },
];

export const BATTLE_GOALS: {
  id: BattleGoal;
  name: string;
  desc: string;
}[] = [
  {
    id: 'ANNIHILATION',
    name: 'Hủy Diệt Toàn Hạm Đội',
    desc: 'Đánh chìm toàn bộ tàu chiến đối phương để chiến thắng.',
  },
  {
    id: 'FLAGSHIP_HUNT',
    name: 'Săn Soái Hạm (Flagship Hunt)',
    desc: 'Mỗi bên tự chọn 1 tàu làm Soái Hạm (3 lớp giáp dày). Hạ Soái Hạm địch là thắng ngay!',
  },
];

export const AI_MODES: {
  level: AIDifficulty;
  name: string;
  tag: string;
}[] = [
  { level: 1, name: 'Tân Binh', tag: 'Bắn mò · Skill ngẫu nhiên' },
  { level: 2, name: 'Tuần Tra', tag: 'Lưới bàn cờ · Trinh sát cơ bản' },
  { level: 3, name: 'Săn Đuổi', tag: 'Hunt & Target · Ngư lôi & Bắn bồi' },
  { level: 4, name: 'Chiến Thuật', tag: 'Xác suất · Sonar + EMP + CIWS' },
  { level: 5, name: 'Đô Đốc', tag: 'Bayesian · Combo tối ưu' },
];

export const FIRING_RULES: {
  id: FiringRule;
  name: string;
}[] = [
  { id: 'SINGLE', name: 'Phát một (1 phát/lượt)' },
  { id: 'STREAK', name: 'Chuỗi bắn trúng (Trúng bắn tiếp)' },
  { id: 'SALVO_3', name: 'Đạn chùm 3 (3 phát/lượt)' },
  { id: 'SALVO_5', name: 'Loạt đại bác 5 (5 phát/lượt)' },
];

export const SHIP_CATALOG: Record<string, ShipTemplate> = {
  // --- 5 DÁNG THẲNG TRUYỀN THỐNG ---
  patrol_1: {
    id: 'patrol_1',
    name: 'Xuồng Tuần Tra (1 ô)',
    shortName: 'Tuần tra 1',
    category: 'LINEAR',
    offsets: [[0, 0]],
  },
  destroyer_2: {
    id: 'destroyer_2',
    name: 'Tàu Pháo / Ngầm Nhỏ (2 ô)',
    shortName: '2 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
    ],
  },
  frigate_3: {
    id: 'frigate_3',
    name: 'Hộ Vệ Hạm (3 ô)',
    shortName: '3 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
  },
  cruiser_4: {
    id: 'cruiser_4',
    name: 'Khu Trục / Tuần Dương (4 ô)',
    shortName: '4 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  carrier_5: {
    id: 'carrier_5',
    name: 'Hàng Không Mẫu Hạm (5 ô)',
    shortName: '5 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  supercarrier_6: {
    id: 'supercarrier_6',
    name: 'Siêu Mẫu Hạm Dài (6 ô)',
    shortName: '6 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
    ],
  },
  leviathan_7: {
    id: 'leviathan_7',
    name: 'Thiết Giáp Hạm Leviathan (7 ô)',
    shortName: '7 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
    ],
  },
  behemoth_8: {
    id: 'behemoth_8',
    name: 'Đại Soái Hạm Behemoth (8 ô)',
    shortName: '8 ô thẳng',
    category: 'LINEAR',
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
      [0, 7],
    ],
  },

  // --- DÁNG DỊ HÌNH (3 ĐẾN 8 Ô) ---
  v_interceptor_3: {
    id: 'v_interceptor_3',
    name: 'Tàu Tên Lửa Góc V (3 ô)',
    shortName: 'Góc V (3)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
  },
  diagonal_3: {
    id: 'diagonal_3',
    name: 'Cụm Pháo Thang Chéo (3 ô)',
    shortName: 'Chéo (3)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  },
  t_trimaran_4: {
    id: 't_trimaran_4',
    name: 'Tàu Ba Thân Chữ T (4 ô)',
    shortName: 'Chữ T (4)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
  },
  z_stealth_4: {
    id: 'z_stealth_4',
    name: 'Khu Trục Tàng Hình Z (4 ô)',
    shortName: 'Chữ Z (4)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  j_corvette_4: {
    id: 'j_corvette_4',
    name: 'Tàu Ngầm Móc Câu J (4 ô)',
    shortName: 'Chữ J (4)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  },
  bunker_2x2: {
    id: 'bunker_2x2',
    name: 'Boong-ke Vuông 2×2 (4 ô)',
    shortName: 'Vuông 2×2',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  },
  diag_4: {
    id: 'diag_4',
    name: 'Mạng Lưới Xuyên Chéo (4 ô)',
    shortName: 'Chéo (4)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ],
  },
  l_carrier_5: {
    id: 'l_carrier_5',
    name: 'Sân Bay Góc Bẻ Chữ L (5 ô)',
    shortName: 'Chữ L (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
    ],
  },
  u_catamaran_5: {
    id: 'u_catamaran_5',
    name: 'Tàu Hai Thân Chữ U (5 ô)',
    shortName: 'Chữ U (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
  cross_bastion_5: {
    id: 'cross_bastion_5',
    name: 'Pháo Đài Chữ Thập + (5 ô)',
    shortName: 'Chữ Thập +',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
  },
  w_step_5: {
    id: 'w_step_5',
    name: 'Tuần Dương Bậc Thang W (5 ô)',
    shortName: 'Chữ W (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
  },
  f_flagship_5: {
    id: 'f_flagship_5',
    name: 'Kỳ Hạm Bất Đối Xứng F (5 ô)',
    shortName: 'Chữ F (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  p_bastion_5: {
    id: 'p_bastion_5',
    name: 'Pháo Hạm Đảo Nổi P (5 ô)',
    shortName: 'Chữ P (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  },
  y_trident_5: {
    id: 'y_trident_5',
    name: 'Chiến Hạm Đinh Ba Y (5 ô)',
    shortName: 'Đinh Ba Y',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  x_wing_5: {
    id: 'x_wing_5',
    name: 'Phi Hạm Cánh Chéo X (5 ô)',
    shortName: 'Cánh X (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
  },
  lightning_5: {
    id: 'lightning_5',
    name: 'Khu Trục Tia Chớp (5 ô)',
    shortName: 'Tia Chớp (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  t_long_5: {
    id: 't_long_5',
    name: 'Tàu Chỉ Huy T Dài (5 ô)',
    shortName: 'T Dài (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
  },
  c_hook_5: {
    id: 'c_hook_5',
    name: 'Vịnh Neo Tàu Chữ C (5 ô)',
    shortName: 'Chữ C (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
  },

  // --- TÀU DỊ DẠNG 6 Ô ---
  pincer_dread_6: {
    id: 'pincer_dread_6',
    name: 'Quái Hạm Càng Cua (6 ô)',
    shortName: 'Càng Cua (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
  },
  dock_carrier_6: {
    id: 'dock_carrier_6',
    name: 'Siêu Sân Bay Đôi 2×3 (6 ô)',
    shortName: 'Sân Bay 2×3',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
  axe_dread_6: {
    id: 'axe_dread_6',
    name: 'Thiết Giáp Rìu Thép (6 ô)',
    shortName: 'Rìu Thép (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  },
  scorpion_6: {
    id: 'scorpion_6',
    name: 'Chiến Hạm Bọ Cạp (6 ô)',
    shortName: 'Bọ Cạp (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
  },
  anchor_6: {
    id: 'anchor_6',
    name: 'Pháo Đài Mỏ Neo (6 ô)',
    shortName: 'Mỏ Neo (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 1],
    ],
  },
  snake_6: {
    id: 'snake_6',
    name: 'Tàu Rắn Ziczac (6 ô)',
    shortName: 'Rắn Ziczac (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
    ],
  },
  twin_wing_6: {
    id: 'twin_wing_6',
    name: 'Mẫu Hạm Song Dực (6 ô)',
    shortName: 'Song Dực (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  ring_c_6: {
    id: 'ring_c_6',
    name: 'Căn Cứ Vòng Cung (6 ô)',
    shortName: 'Vòng Cung (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
    ],
  },

  // --- TÀU DỊ DẠNG TỐI ĐA 7 Ô ---
  twin_hull_7: {
    id: 'twin_hull_7',
    name: 'Siêu Hạm Song Thân H (7 ô)',
    shortName: 'Song Thân H (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 2],
    ],
  },
  trident_7: {
    id: 'trident_7',
    name: 'Đại Đinh Ba Hải Thần (7 ô)',
    shortName: 'Đại Đinh Ba (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [3, 1],
    ],
  },
  cross_heavy_7: {
    id: 'cross_heavy_7',
    name: 'Pháo Đài Thập Tự Đại (7 ô)',
    shortName: 'Thập Tự (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [3, 0],
      [3, 2],
    ],
  },
  spiral_7: {
    id: 'spiral_7',
    name: 'Chiến Hạm Xoắn Ốc (7 ô)',
    shortName: 'Xoắn Ốc (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  },
  fortress_wing_7: {
    id: 'fortress_wing_7',
    name: 'Siêu Mẫu Hạm Cánh Dơi (7 ô)',
    shortName: 'Cánh Dơi (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 2],
      [3, 1],
    ],
  },

  // --- MỞ RỘNG NHIỀU DÁNG DỊ HÌNH MỚI (4–7 Ô) ---
  diag_zig_4: {
    id: 'diag_zig_4',
    name: 'Tàu Xung Kích Gãy Chéo (4 ô)',
    shortName: 'Gãy Chéo (4)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 1],
      [1, 2],
      [2, 3],
    ],
  },
  fork_5: {
    id: 'fork_5',
    name: 'Tàu Ngầm Chĩa Ba (5 ô)',
    shortName: 'Chĩa Ba (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  claw_5: {
    id: 'claw_5',
    name: 'Hộ Vệ Càng Kẹp (5 ô)',
    shortName: 'Càng Kẹp (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 2],
    ],
  },
  wing_v_5: {
    id: 'wing_v_5',
    name: 'Phi Hạm Cánh V Rộng (5 ô)',
    shortName: 'Cánh V (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [1, 1],
      [2, 2],
      [1, 3],
      [0, 4],
    ],
  },
  arrow_5: {
    id: 'arrow_5',
    name: 'Tàu Mũi Tên Xuyên Phá (5 ô)',
    shortName: 'Mũi Tên (5)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 2],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
  },
  hammer_6: {
    id: 'hammer_6',
    name: 'Thiết Giáp Búa Tạ (6 ô)',
    shortName: 'Búa Tạ (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  diamond_6: {
    id: 'diamond_6',
    name: 'Tàu Giáp Kim Cương (6 ô)',
    shortName: 'Kim Cương (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 2],
    ],
  },
  cross_asym_6: {
    id: 'cross_asym_6',
    name: 'Khu Trục Thập Lệch (6 ô)',
    shortName: 'Thập Lệch (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 2],
    ],
  },
  s_curve_6: {
    id: 's_curve_6',
    name: 'Tàu Ngầm Uốn S (6 ô)',
    shortName: 'Uốn S (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
      [3, 0],
      [3, 1],
    ],
  },
  arch_gate_6: {
    id: 'arch_gate_6',
    name: 'Pháo Đài Vòm Cổng (6 ô)',
    shortName: 'Vòm Cổng (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 3],
      [2, 0],
      [2, 3],
    ],
  },
  pinwheel_6: {
    id: 'pinwheel_6',
    name: 'Tuần Dương Chong Chóng (6 ô)',
    shortName: 'Chong Chóng (6)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ],
  },
  manta_7: {
    id: 'manta_7',
    name: 'Siêu Hạm Cá Đuối Manta (7 ô)',
    shortName: 'Cá Đuối (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 2],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 0],
      [2, 2],
      [2, 4],
    ],
  },
  harbor_7: {
    id: 'harbor_7',
    name: 'Căn Cứ Nổi Chữ U Dài (7 ô)',
    shortName: 'Chữ U Dài (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
    ],
  },
  dragon_7: {
    id: 'dragon_7',
    name: 'Chiến Hạm Rồng Biển (7 ô)',
    shortName: 'Rồng Biển (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 3],
    ],
  },
  bunker_u_7: {
    id: 'bunker_u_7',
    name: 'Pháo Đài Móng Ngựa (7 ô)',
    shortName: 'Móng Ngựa (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
  },
  star_7: {
    id: 'star_7',
    name: 'Tàu Hộ Tống Sao Biển (7 ô)',
    shortName: 'Sao Biển (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
      [3, 1],
    ],
  },
  double_z_7: {
    id: 'double_z_7',
    name: 'Thiết Giáp Z Kép (7 ô)',
    shortName: 'Z Kép (7)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
    ],
  },

  // --- SIÊU CHIẾN HẠM DỊ DẠNG TỐI ĐA 8 Ô ---
  double_hull_8: {
    id: 'double_hull_8',
    name: 'Siêu Mẫu Hạm Song Thân 2×4 (8 ô)',
    shortName: 'Song Thân 2×4',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  citadel_ring_8: {
    id: 'citadel_ring_8',
    name: 'Pháo Đài Vòng Khép 3×3 (8 ô)',
    shortName: 'Vòng Khép (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  },
  crown_8: {
    id: 'crown_8',
    name: 'Kỳ Hạm Vương Miện (8 ô)',
    shortName: 'Vương Miện (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 2],
      [0, 4],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },
  super_cross_8: {
    id: 'super_cross_8',
    name: 'Đại Thập Tự Kép (8 ô)',
    shortName: 'Thập Tự Kép (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
    ],
  },
  twin_trident_8: {
    id: 'twin_trident_8',
    name: 'Chiến Hạm Hai Đầu H Dài (8 ô)',
    shortName: 'Chữ H Dài (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 0],
      [2, 3],
    ],
  },
  x_dreadnought_8: {
    id: 'x_dreadnought_8',
    name: 'Phi Hạm Cánh X Khổng Lồ (8 ô)',
    shortName: 'Cánh X Đại (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 3],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
      [3, 0],
      [3, 3],
    ],
  },
  scorpion_king_8: {
    id: 'scorpion_king_8',
    name: 'Quái Hạm Vua Bọ Cạp (8 ô)',
    shortName: 'Vua Bọ Cạp (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
    ],
  },
  hydra_8: {
    id: 'hydra_8',
    name: 'Chiến Hạm Đa Đầu Hydra (8 ô)',
    shortName: 'Hydra (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
    ],
  },
  anchor_titan_8: {
    id: 'anchor_titan_8',
    name: 'Đại Mỏ Neo Titan (8 ô)',
    shortName: 'Mỏ Neo Đại (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
  },
  phoenix_8: {
    id: 'phoenix_8',
    name: 'Kỳ Hạm Phượng Hoàng Lửa (8 ô)',
    shortName: 'Phượng Hoàng (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 1],
      [2, 3],
    ],
  },
  zigzag_titan_8: {
    id: 'zigzag_titan_8',
    name: 'Mãng Xà Titan (8 ô)',
    shortName: 'Mãng Xà (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 4],
    ],
  },
  arch_fortress_8: {
    id: 'arch_fortress_8',
    name: 'Quân Cảng Vòm Thép (8 ô)',
    shortName: 'Quân Cảng (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 3],
      [2, 0],
      [2, 3],
    ],
  },
  blade_star_8: {
    id: 'blade_star_8',
    name: 'Phi Tiêu Chữ V Kép (8 ô)',
    shortName: 'Phi Tiêu (8)',
    category: 'EXOTIC',
    isExotic: true,
    offsets: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 3],
      [2, 0],
      [2, 3],
      [3, 1],
      [3, 2],
    ],
  },
};

export const ALL_SHIP_TEMPLATES: ShipTemplate[] = Object.values(SHIP_CATALOG);

// 15 Hạm Đội Quốc Gia: Mỗi quốc gia mặc định ~60 ô (~12–13 tàu) với tên tàu thực tế
export const NATIONS: Record<NationId, NationProfile> = {
  VN: {
    id: 'VN',
    name: 'Việt Nam',
    navyName: 'Hải Quân Nhân Dân',
    hullPrimary: '#36536E',
    hullSecondary: '#22364A',
    deckAccent: '#4C6F8F',
    trimColor: '#FACC15',
    stripeColor: '#DC2626',
    signatureFleetName: 'Hạm Đội Biển Đông',
    // 6+6+5+5+5+5+4+4+4+4+3+3+3+2+2 = 60 ô (15 tàu? let's make 13 ships = 60 cells)
    // 7+6+6+5+5+5+4+4+4+4+4+3+3 = 60 ô (13 tàu)
    signatureShipIds: [
      'trident_7',
      'anchor_6',
      'pincer_dread_6',
      'y_trident_5',
      'l_carrier_5',
      'carrier_5',
      't_trimaran_4',
      'z_stealth_4',
      'cruiser_4',
      'bunker_2x2',
      'frigate_3',
      'v_interceptor_3',
      'frigate_3',
      'destroyer_2',
      'patrol_1',
    ], // wait: 7+6+6+5+5+5+4+4+4+4+3+3+3+2+1 = 62 -> drop frigate_3(3)+patrol_1(1)? Wait: 7+6+6+5+5+5+4+4+4+4+3+3+2+2 = 60!
    nationalShipNames: {
      trident_7: 'Kỳ Hạm HQ-015 Đinh Tiên Hoàng',
      anchor_6: 'HQ-016 Quang Trung',
      pincer_dread_6: 'HQ-011 Lý Thái Tổ',
      y_trident_5: 'HQ-012 Trần Hưng Đạo',
      l_carrier_5: 'Tàu Ngầm HQ-182 Hà Nội',
      carrier_5: 'Tàu Ngầm HQ-183 TP.HCM',
      t_trimaran_4: 'HQ-184 Hải Phòng',
      z_stealth_4: 'HQ-185 Khánh Hòa',
      cruiser_4: 'HQ-186 Đà Nẵng',
      bunker_2x2: 'HQ-187 Bà Rịa - Vũng Tàu',
      frigate_3: 'Molniya HQ-381',
      v_interceptor_3: 'Molniya HQ-382',
      destroyer_2: 'Pháo Hạm TT-400TP',
      patrol_1: 'Xuồng Trường Sa',
    },
  },
  US: {
    id: 'US',
    name: 'Hoa Kỳ',
    navyName: 'US Pacific Fleet',
    hullPrimary: '#475569',
    hullSecondary: '#334155',
    deckAccent: '#64748B',
    trimColor: '#38BDF8',
    stripeColor: '#E2E8F0',
    signatureFleetName: 'Nhóm Tác Chiến Nimitz',
    signatureShipIds: [
      'twin_hull_7',
      'dock_carrier_6',
      'dock_carrier_6',
      'u_catamaran_5',
      'carrier_5',
      't_long_5',
      'z_stealth_4',
      'cruiser_4',
      'cruiser_4',
      'j_corvette_4',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'destroyer_2',
    ],
    nationalShipNames: {
      twin_hull_7: 'USS Gerald R. Ford (CVN-78)',
      dock_carrier_6: 'USS Nimitz (CVN-68)',
      u_catamaran_5: 'USS Independence (LCS-2)',
      carrier_5: 'USS Abraham Lincoln (CVN-72)',
      t_long_5: 'USS America (LHA-6)',
      z_stealth_4: 'USS Zumwalt (DDG-1000)',
      cruiser_4: 'USS Ticonderoga (CG-47)',
      j_corvette_4: 'USS Arleigh Burke (DDG-51)',
      frigate_3: 'USS Seawolf (SSN-21)',
      v_interceptor_3: 'USS Virginia (SSN-774)',
      destroyer_2: 'USS Cyclone (PC-1)',
    },
  },
  JP: {
    id: 'JP',
    name: 'Nhật Bản',
    navyName: 'JMSDF Tự Vệ Biển',
    hullPrimary: '#52525B',
    hullSecondary: '#3F3F46',
    deckAccent: '#71717A',
    trimColor: '#F43F5E',
    stripeColor: '#FAFAFA',
    signatureFleetName: 'Hạm Đội Yokosuka',
    signatureShipIds: [
      'fortress_wing_7',
      'twin_wing_6',
      'ring_c_6',
      'l_carrier_5',
      'c_hook_5',
      'f_flagship_5',
      'j_corvette_4',
      't_trimaran_4',
      'cruiser_4',
      'bunker_2x2',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      fortress_wing_7: 'JS Izumo (DDH-183)',
      twin_wing_6: 'JS Kaga (DDH-184)',
      ring_c_6: 'JS Hyuga (DDH-181)',
      l_carrier_5: 'JS Maya (DDG-179)',
      c_hook_5: 'JS Haguro (DDG-180)',
      f_flagship_5: 'JS Atago (DDG-177)',
      j_corvette_4: 'JS Mogami (FFM-1)',
      t_trimaran_4: 'JS Kumano (FFM-2)',
      cruiser_4: 'JS Asahi (DD-119)',
      bunker_2x2: 'JS Taigei (SS-513)',
      frigate_3: 'JS Soryu (SS-501)',
      v_interceptor_3: 'JS Hayabusa (PG-824)',
      destroyer_2: 'JS Otaka (PG-826)',
      patrol_1: 'JS Shirataka (PG-829)',
    },
  },
  RU: {
    id: 'RU',
    name: 'Nga',
    navyName: 'Hạm Đội Phương Bắc',
    hullPrimary: '#3E4C3A',
    hullSecondary: '#2A3427',
    deckAccent: '#556850',
    trimColor: '#EA580C',
    stripeColor: '#E5E7EB',
    signatureFleetName: 'Bão Thép Phương Bắc',
    signatureShipIds: [
      'cross_heavy_7',
      'twin_wing_6',
      'axe_dread_6',
      'cross_bastion_5',
      'p_bastion_5',
      'carrier_5',
      'bunker_2x2',
      'cruiser_4',
      'z_stealth_4',
      'diag_4',
      'frigate_3',
      'diagonal_3',
      'destroyer_2',
      'destroyer_2',
    ],
    nationalShipNames: {
      cross_heavy_7: 'RFS Admiral Kuznetsov',
      twin_wing_6: 'RFS Pyotr Velikiy (Kirov)',
      axe_dread_6: 'RFS Dmitriy Donskoy (Typhoon)',
      cross_bastion_5: 'RFS Admiral Nakhimov',
      p_bastion_5: 'RFS Varyag (Slava)',
      carrier_5: 'RFS Marshal Ustinov',
      bunker_2x2: 'RFS Severodvinsk (Yasen)',
      cruiser_4: 'RFS Admiral Gorshkov',
      z_stealth_4: 'RFS Admiral Kasatonov',
      diag_4: 'RFS Borei Knyaz Vladimir',
      frigate_3: 'RFS Steregushchy',
      diagonal_3: 'RFS Gremyashchiy',
      destroyer_2: 'RFS Buyan-M',
    },
  },
  GB: {
    id: 'GB',
    name: 'Anh Quốc',
    navyName: 'Royal Navy',
    hullPrimary: '#4B5E6D',
    hullSecondary: '#31404C',
    deckAccent: '#687E8F',
    trimColor: '#60A5FA',
    stripeColor: '#EF4444',
    signatureFleetName: 'Hạm Đội Hoàng Gia',
    signatureShipIds: [
      'twin_hull_7',
      'fortress_wing_7',
      'anchor_6',
      'p_bastion_5',
      'u_catamaran_5',
      't_long_5',
      't_trimaran_4',
      'cruiser_4',
      'bunker_2x2',
      'j_corvette_4',
      'frigate_3',
      'frigate_3',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      twin_hull_7: 'HMS Queen Elizabeth (R08)',
      fortress_wing_7: 'HMS Prince of Wales (R09)',
      anchor_6: 'HMS Albion (L14)',
      p_bastion_5: 'HMS Dreadnought',
      u_catamaran_5: 'HMS Vanguard (S28)',
      t_long_5: 'HMS Daring (D32)',
      t_trimaran_4: 'HMS Defender (D36)',
      cruiser_4: 'HMS Diamond (D34)',
      bunker_2x2: 'HMS Astute (S119)',
      j_corvette_4: 'HMS Ambush (S120)',
      frigate_3: 'HMS Iron Duke (F234)',
      destroyer_2: 'HMS River Batch 2',
      patrol_1: 'HMS Cutlass',
    },
  },
  DE: {
    id: 'DE',
    name: 'Đức',
    navyName: 'Deutsche Marine',
    hullPrimary: '#2D3748',
    hullSecondary: '#1A202C',
    deckAccent: '#4A5568',
    trimColor: '#F59E0B',
    stripeColor: '#DC2626',
    signatureFleetName: 'Thiết Giáp Baltic',
    signatureShipIds: [
      'axe_dread_6',
      'axe_dread_6',
      'scorpion_6',
      'w_step_5',
      'lightning_5',
      'cross_bastion_5',
      'bunker_2x2',
      'z_stealth_4',
      'cruiser_4',
      'diag_4',
      'v_interceptor_3',
      'frigate_3',
      'destroyer_2',
      'destroyer_2',
    ],
    nationalShipNames: {
      axe_dread_6: 'FGS Bismarck (Huyền Thoại)',
      scorpion_6: 'FGS Tirpitz',
      w_step_5: 'FGS Baden-Württemberg (F125)',
      lightning_5: 'FGS Sachsen (F219)',
      cross_bastion_5: 'FGS Hamburg (F220)',
      bunker_2x2: 'FGS Hessen (F221)',
      z_stealth_4: 'FGS Brandenburg (F215)',
      cruiser_4: 'FGS Braunschweig (F260)',
      diag_4: 'FGS Magdeburg (F261)',
      v_interceptor_3: 'FGS U-31 (Type 212A)',
      frigate_3: 'FGS U-36 (Type 212A)',
      destroyer_2: 'FGS Gepard',
    },
  },
  FR: {
    id: 'FR',
    name: 'Pháp',
    navyName: 'Marine Nationale',
    hullPrimary: '#43536B',
    hullSecondary: '#2B3749',
    deckAccent: '#5D708E',
    trimColor: '#3B82F6',
    stripeColor: '#F8FAFC',
    signatureFleetName: 'Hạm Đội Địa Trung Hải',
    signatureShipIds: [
      'spiral_7',
      'ring_c_6',
      'twin_wing_6',
      'f_flagship_5',
      'lightning_5',
      'c_hook_5',
      'z_stealth_4',
      't_trimaran_4',
      'cruiser_4',
      'j_corvette_4',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'patrol_1',
      'patrol_1',
    ],
    nationalShipNames: {
      spiral_7: 'FS Charles de Gaulle (R91)',
      ring_c_6: 'FS Mistral (L9013)',
      twin_wing_6: 'FS Tonnerre (L9014)',
      f_flagship_5: 'FS Forbin (D620)',
      lightning_5: 'FS Chevalier Paul (D621)',
      c_hook_5: 'FS Aquitaine (D650)',
      z_stealth_4: 'FS Alsace (D656)',
      t_trimaran_4: 'FS Suffren (S635)',
      cruiser_4: 'FS Lafayette (F710)',
      j_corvette_4: 'FS Surcouf (F711)',
      frigate_3: 'FS Floréal (F730)',
      v_interceptor_3: 'FS L’Adroit (P725)',
      destroyer_2: 'FS Confiance',
      patrol_1: 'FS Résolue',
    },
  },
  KR: {
    id: 'KR',
    name: 'Hàn Quốc',
    navyName: 'ROK Navy Aegis',
    hullPrimary: '#3B4E5E',
    hullSecondary: '#26333E',
    deckAccent: '#536A7E',
    trimColor: '#22D3EE',
    stripeColor: '#F1F5F9',
    signatureFleetName: 'Lá Chắn Sejong',
    signatureShipIds: [
      'trident_7',
      'pincer_dread_6',
      'dock_carrier_6',
      'carrier_5',
      'y_trident_5',
      'l_carrier_5',
      'diag_4',
      'j_corvette_4',
      'z_stealth_4',
      'cruiser_4',
      'frigate_3',
      'diagonal_3',
      'destroyer_2',
      'destroyer_2',
    ],
    nationalShipNames: {
      trident_7: 'ROKS Sejong the Great (DDG-991)',
      pincer_dread_6: 'ROKS Jeongjo the Great (DDG-995)',
      dock_carrier_6: 'ROKS Dokdo (LPH-6111)',
      carrier_5: 'ROKS Marado (LPH-6112)',
      y_trident_5: 'ROKS Yulgok Yi I (DDG-992)',
      l_carrier_5: 'ROKS Seoae Ryu Seong-ryong',
      diag_4: 'ROKS Dosan Ahn Changho (SS-083)',
      j_corvette_4: 'ROKS Chungmugong Yi Sun-sin',
      z_stealth_4: 'ROKS Daegu (FFG-818)',
      cruiser_4: 'ROKS Incheon (FFG-811)',
      frigate_3: 'ROKS Yoon Youngha (PKG-711)',
      diagonal_3: 'ROKS Chamsuri II',
      destroyer_2: 'ROKS Cheonan',
    },
  },
  CN: {
    id: 'CN',
    name: 'Trung Quốc',
    navyName: 'Hạm Đội Nam Hải',
    hullPrimary: '#3F4B5B',
    hullSecondary: '#27303D',
    deckAccent: '#596A80',
    trimColor: '#EF4444',
    stripeColor: '#FACC15',
    signatureFleetName: 'Biên Đội Phúc Kiến',
    signatureShipIds: [
      'trident_7',
      'dock_carrier_6',
      'twin_wing_6',
      't_long_5',
      'carrier_5',
      'u_catamaran_5',
      'cruiser_4',
      'cruiser_4',
      't_trimaran_4',
      'bunker_2x2',
      'frigate_3',
      'frigate_3',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      trident_7: 'CNS Fujian (CV-18)',
      dock_carrier_6: 'CNS Shandong (CV-17)',
      twin_wing_6: 'CNS Liaoning (CV-16)',
      t_long_5: 'CNS Nanchang (Type 055)',
      carrier_5: 'CNS Lhasa (Type 055)',
      u_catamaran_5: 'CNS Hainan (Type 075)',
      cruiser_4: 'CNS Kunming (Type 052D)',
      t_trimaran_4: 'CNS Dalian (Type 055)',
      bunker_2x2: 'CNS Jiangkai II',
      frigate_3: 'CNS Jiangdao (Type 056)',
      destroyer_2: 'Tàu Tên Lửa Type 022',
      patrol_1: 'Tuần Tra Biển Đông',
    },
  },
  IT: {
    id: 'IT',
    name: 'Ý (Italia)',
    navyName: 'Marina Militare',
    hullPrimary: '#3E5B58',
    hullSecondary: '#263937',
    deckAccent: '#577E7A',
    trimColor: '#34D399',
    stripeColor: '#F87171',
    signatureFleetName: 'Hạm Đội Cavour',
    signatureShipIds: [
      'anchor_6',
      'ring_c_6',
      'scorpion_6',
      'l_carrier_5',
      'f_flagship_5',
      'p_bastion_5',
      't_trimaran_4',
      'z_stealth_4',
      'bunker_2x2',
      'j_corvette_4',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      anchor_6: 'ITS Cavour (C550)',
      ring_c_6: 'ITS Trieste (L9890)',
      scorpion_6: 'ITS Giuseppe Garibaldi',
      l_carrier_5: 'ITS Andrea Doria (D553)',
      f_flagship_5: 'ITS Caio Duilio (D554)',
      p_bastion_5: 'ITS Carlo Bergamini',
      t_trimaran_4: 'ITS Virginio Fasan',
      z_stealth_4: 'ITS Paolo Thaon di Revel',
      bunker_2x2: 'ITS Todaro (S526)',
      j_corvette_4: 'ITS Scirè (S527)',
      frigate_3: 'ITS Comandante Cigala',
      v_interceptor_3: 'ITS Cassiopea',
      destroyer_2: 'ITS Esploratore',
      patrol_1: 'ITS Sentinella',
    },
  },
  IN: {
    id: 'IN',
    name: 'Ấn Độ',
    navyName: 'Indian Navy',
    hullPrimary: '#4D475E',
    hullSecondary: '#302C3D',
    deckAccent: '#6A6382',
    trimColor: '#FB923C',
    stripeColor: '#22C55E',
    signatureFleetName: 'Hạm Đội Ấn Độ Dương',
    signatureShipIds: [
      'cross_heavy_7',
      'trident_7',
      'pincer_dread_6',
      'u_catamaran_5',
      'w_step_5',
      'y_trident_5',
      'cruiser_4',
      't_trimaran_4',
      'diag_4',
      'bunker_2x2',
      'frigate_3',
      'diagonal_3',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      cross_heavy_7: 'INS Vikrant (R11)',
      trident_7: 'INS Vikramaditya (R33)',
      pincer_dread_6: 'INS Visakhapatnam (D66)',
      u_catamaran_5: 'INS Kolkata (D63)',
      w_step_5: 'INS Nilgiri (F33)',
      y_trident_5: 'INS Arihant (S2)',
      cruiser_4: 'INS Shivalik (F47)',
      t_trimaran_4: 'INS Talwar (F40)',
      diag_4: 'INS Kalvari (S21)',
      bunker_2x2: 'INS Kamorta (P28)',
      frigate_3: 'INS Kora (P61)',
      diagonal_3: 'INS Saryu (P54)',
      destroyer_2: 'INS Car Nicobar',
      patrol_1: 'INS Tarmugli',
    },
  },
  ES: {
    id: 'ES',
    name: 'Tây Ban Nha',
    navyName: 'Armada Española',
    hullPrimary: '#5A463B',
    hullSecondary: '#3B2D25',
    deckAccent: '#7C6253',
    trimColor: '#FACC15',
    stripeColor: '#DC2626',
    signatureFleetName: 'Hạm Đội Armada',
    signatureShipIds: [
      'scorpion_6',
      'anchor_6',
      'snake_6',
      'c_hook_5',
      'l_carrier_5',
      'p_bastion_5',
      'cruiser_4',
      'bunker_2x2',
      'z_stealth_4',
      'j_corvette_4',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'destroyer_2',
    ],
    nationalShipNames: {
      scorpion_6: 'SPS Juan Carlos I (L-61)',
      anchor_6: 'SPS Galicia (L-51)',
      snake_6: 'SPS Castilla (L-52)',
      c_hook_5: 'SPS Álvaro de Bazán (F-101)',
      l_carrier_5: 'SPS Cristóbal Colón (F-105)',
      p_bastion_5: 'SPS Méndez Núñez (F-104)',
      cruiser_4: 'SPS Santa María (F-81)',
      bunker_2x2: 'SPS Isaac Peral (S-81)',
      z_stealth_4: 'SPS Narciso Monturiol',
      j_corvette_4: 'SPS Meteoro (P-41)',
      frigate_3: 'SPS Rayo (P-42)',
      v_interceptor_3: 'SPS Serviola (P-71)',
      destroyer_2: 'SPS Tarifa (P-64)',
    },
  },
  TR: {
    id: 'TR',
    name: 'Thổ Nhĩ Kỳ',
    navyName: 'Türk Deniz Kuvvetleri',
    hullPrimary: '#523B48',
    hullSecondary: '#35242E',
    deckAccent: '#755567',
    trimColor: '#F43F5E',
    stripeColor: '#FFFFFF',
    signatureFleetName: 'Hạm Đội Anadolu',
    signatureShipIds: [
      'snake_6',
      'ring_c_6',
      'axe_dread_6',
      'f_flagship_5',
      'lightning_5',
      'w_step_5',
      'j_corvette_4',
      't_trimaran_4',
      'bunker_2x2',
      'cruiser_4',
      'diagonal_3',
      'frigate_3',
      'destroyer_2',
      'patrol_1',
      'patrol_1',
    ],
    nationalShipNames: {
      snake_6: 'TCG Anadolu (L-400)',
      ring_c_6: 'TCG Bayraktar (L-402)',
      axe_dread_6: 'TCG Sancaktar (L-403)',
      f_flagship_5: 'TCG Istanbul (F-515)',
      lightning_5: 'TCG Heybeliada (F-511)',
      w_step_5: 'TCG Burgazada (F-513)',
      j_corvette_4: 'TCG Kınalıada (F-514)',
      t_trimaran_4: 'TCG Barbaros (F-244)',
      bunker_2x2: 'TCG Piri Reis (S-330)',
      cruiser_4: 'TCG Hızırreis (S-331)',
      diagonal_3: 'TCG Kılıç (P-330)',
      frigate_3: 'TCG Tuzla (P-1200)',
      destroyer_2: 'TCG Doğan (P-340)',
      patrol_1: 'TCG Yıldız',
    },
  },
  AU: {
    id: 'AU',
    name: 'Úc (Australia)',
    navyName: 'Royal Australian Navy',
    hullPrimary: '#365463',
    hullSecondary: '#223640',
    deckAccent: '#4C7387',
    trimColor: '#38BDF8',
    stripeColor: '#FACC15',
    signatureFleetName: 'Hạm Đội Nam Thái Bình Dương',
    signatureShipIds: [
      'fortress_wing_7',
      'dock_carrier_6',
      'pincer_dread_6',
      'y_trident_5',
      't_long_5',
      'carrier_5',
      'z_stealth_4',
      'cruiser_4',
      'diag_4',
      't_trimaran_4',
      'frigate_3',
      'v_interceptor_3',
      'destroyer_2',
      'patrol_1',
    ],
    nationalShipNames: {
      fortress_wing_7: 'HMAS Canberra (L02)',
      dock_carrier_6: 'HMAS Adelaide (L01)',
      pincer_dread_6: 'HMAS Hobart (DDG-39)',
      y_trident_5: 'HMAS Brisbane (DDG-41)',
      t_long_5: 'HMAS Sydney (DDG-42)',
      carrier_5: 'HMAS Anzac (FFH-150)',
      z_stealth_4: 'HMAS Arunta (FFH-151)',
      cruiser_4: 'HMAS Ballarat (FFH-155)',
      diag_4: 'HMAS Collins (SSG-73)',
      t_trimaran_4: 'HMAS Farncomb (SSG-74)',
      frigate_3: 'HMAS Arafura (OPV-203)',
      v_interceptor_3: 'HMAS Cape Fourcroy',
      destroyer_2: 'HMAS Armidale',
      patrol_1: 'HMAS Bathurst',
    },
  },
  EXO: {
    id: 'EXO',
    name: 'Liên Minh Dị Hình',
    navyName: 'Experimental Syndicate',
    hullPrimary: '#312E59',
    hullSecondary: '#1E1B3A',
    deckAccent: '#4B4684',
    trimColor: '#F97316',
    stripeColor: '#38BDF8',
    signatureFleetName: 'Hạm Đội Siêu Dị Hình',
    signatureShipIds: [
      'spiral_7',
      'cross_heavy_7',
      'fortress_wing_7',
      'pincer_dread_6',
      'scorpion_6',
      'snake_6',
      'x_wing_5',
      'cross_bastion_5',
      'y_trident_5',
      'diag_4',
      'diagonal_3',
    ], // 7+7+7+6+6+6+5+5+5+4+3 = 61 cells
    nationalShipNames: {
      spiral_7: 'X-01 Pháo Đài Xoắn Ốc',
      cross_heavy_7: 'X-02 Thập Tự Chiến',
      fortress_wing_7: 'X-03 Mẫu Hạm Cánh Dơi',
      pincer_dread_6: 'X-04 Quái Hạm Càng Cua',
      scorpion_6: 'X-05 Chiến Hạm Bọ Cạp',
      snake_6: 'X-06 Tàu Rắn Ziczac',
      x_wing_5: 'X-07 Phi Hạm Cánh Chéo',
      cross_bastion_5: 'X-08 Lõi Phản Lực +',
      y_trident_5: 'X-09 Đinh Ba Hải Thần',
      diag_4: 'X-10 Mạng Lưới Chéo',
      diagonal_3: 'X-11 Thang Chéo Nhẹ',
    },
  },
};

export const NATION_LIST: NationProfile[] = Object.values(NATIONS);

export function getFormationShips(
  formationId: FleetFormationId,
  customShipIds: string[],
  nationId: NationId = 'VN',
  bonusShipIds: string[] = []
): ShipTemplate[] {
  const baseDefaultIds =
    NATIONS[nationId]?.signatureShipIds ?? NATIONS.VN.signatureShipIds;
  const ids =
    formationId === 'CUSTOM'
      ? customShipIds
      : [...baseDefaultIds, ...bonusShipIds];

  const nationNames = NATIONS[nationId]?.nationalShipNames ?? {};
  const seenCounts: Record<string, number> = {};

  return ids
    .map((id) => {
      const base = SHIP_CATALOG[id];
      if (!base) return null;
      seenCounts[id] = (seenCounts[id] || 0) + 1;
      const baseTitle = nationNames[id] ?? base.name;
      const finalName =
        seenCounts[id] > 1 ? `${baseTitle} #${seenCounts[id]}` : baseTitle;
      return finalName === base.name ? base : { ...base, name: finalName };
    })
    .filter((t): t is ShipTemplate => Boolean(t));
}

/**
 * Tạo đội hình AI ngẫu nhiên có số lượng tàu VÀ tổng số ô cân bằng sát với Người chơi 1
 */
export function buildBalancedAIFleet(
  playerShips: ShipTemplate[],
  aiNationId: NationId
): ShipTemplate[] {
  const targetShipCount = Math.max(1, playerShips.length);
  const targetTotalCells = playerShips.reduce(
    (sum, s) => sum + s.offsets.length,
    0
  );

  // Nhóm tàu catalog theo số ô (1..8)
  const bySize: Record<number, ShipTemplate[]> = {};
  for (const tpl of ALL_SHIP_TEMPLATES) {
    const len = tpl.offsets.length;
    if (!bySize[len]) bySize[len] = [];
    bySize[len].push(tpl);
  }

  // Ưu tiên danh sách tàu đặc trưng của quốc gia AI ở các kích thước tương ứng
  const nationIds = NATIONS[aiNationId]?.signatureShipIds ?? [];
  const nationNames = NATIONS[aiNationId]?.nationalShipNames ?? {};
  const nationBySize: Record<number, ShipTemplate[]> = {};
  for (const sid of nationIds) {
    const tpl = SHIP_CATALOG[sid];
    if (!tpl) continue;
    const len = tpl.offsets.length;
    if (!nationBySize[len]) nationBySize[len] = [];
    nationBySize[len].push(tpl);
  }

  // Tạo phân bổ kích thước mục tiêu giống với người chơi (có xáo trộn nhẹ +/-1 giữ tổng bằng targetTotalCells)
  const sizes = playerShips.map((s) => s.offsets.length);
  if (sizes.length >= 2) {
    for (let i = 0; i < Math.floor(sizes.length / 2); i++) {
      const a = Math.floor(Math.random() * sizes.length);
      const b = Math.floor(Math.random() * sizes.length);
      if (a !== b && sizes[a] > 1 && sizes[b] < 8) {
        sizes[a] -= 1;
        sizes[b] += 1;
      }
    }
  }

  const seenCounts: Record<string, number> = {};
  const result: ShipTemplate[] = [];

  for (const len of sizes) {
    const natPool = nationBySize[len];
    const catPool = bySize[len] ?? ALL_SHIP_TEMPLATES;
    const pool =
      natPool && natPool.length > 0 && Math.random() < 0.72
        ? natPool
        : catPool;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    seenCounts[chosen.id] = (seenCounts[chosen.id] || 0) + 1;
    const customName = nationNames[chosen.id];
    const displayName = customName
      ? seenCounts[chosen.id] > 1
        ? `${customName} #${seenCounts[chosen.id]}`
        : customName
      : chosen.name;
    result.push({ ...chosen, name: displayName });
  }

  // Safety check on count/cells
  if (result.length !== targetShipCount) {
    return result.slice(0, targetShipCount);
  }
  const actualCells = result.reduce((s, t) => s + t.offsets.length, 0);
  if (Math.abs(actualCells - targetTotalCells) > 3) {
    // Fallback direct size match
    return playerShips.map((ps) => {
      const pool = bySize[ps.offsets.length] ?? [ps];
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      return chosen;
    });
  }

  return result;
}

export function getDefaultFlagshipIndex(templates: ShipTemplate[]): number {
  if (templates.length === 0) return -1;
  for (const targetLen of [8, 7, 6, 5]) {
    const idx = templates.findIndex((t) => t.offsets.length === targetLen);
    if (idx !== -1) return idx;
  }
  let largestIdx = 0;
  templates.forEach((t, idx) => {
    if (t.offsets.length > templates[largestIdx].offsets.length) {
      largestIdx = idx;
    }
  });
  return largestIdx;
}

/**
 * Đảm bảo trong chế độ Săn Soái Hạm, tôn trọng tàu Soái Hạm người chơi đã chọn (hoặc chọn tàu lớn nhất làm mặc định)
 */
export function ensureFlagshipTemplates(
  templates: ShipTemplate[],
  nationId: NationId,
  battleGoal: BattleGoal,
  preferredFlagshipIndex?: number
): ShipTemplate[] {
  if (battleGoal !== 'FLAGSHIP_HUNT') {
    return templates.map((t) => ({ ...t, isFlagship: false }));
  }

  if (
    preferredFlagshipIndex !== undefined &&
    preferredFlagshipIndex >= 0 &&
    preferredFlagshipIndex < templates.length
  ) {
    return templates.map((t, idx) => ({
      ...t,
      isFlagship: idx === preferredFlagshipIndex,
    }));
  }

  // Mặc định ban đầu: ưu tiên tàu lớn nhất (8 -> 7 -> 6 -> 5 ô)
  let flagshipIdx = templates.findIndex((t) => t.offsets.length === 8);
  if (flagshipIdx === -1) {
    flagshipIdx = templates.findIndex((t) => t.offsets.length === 7);
  }
  if (flagshipIdx === -1) {
    flagshipIdx = templates.findIndex((t) => t.offsets.length === 6);
  }
  if (flagshipIdx === -1) {
    flagshipIdx = templates.findIndex((t) => t.offsets.length === 5);
  }

  if (flagshipIdx !== -1) {
    return templates.map((t, idx) => ({
      ...t,
      isFlagship: idx === flagshipIdx,
    }));
  }

  // Nếu đội hình tự chọn không có tàu ≥ 5 ô nào và người chơi chưa chọn riêng, chọn tàu lớn nhất hoặc nâng cấp nếu trống
  if (templates.length > 0) {
    const largestIdx = getDefaultFlagshipIndex(templates);
    return templates.map((t, idx) => ({
      ...t,
      isFlagship: idx === largestIdx,
    }));
  }

  const flagshipBase = SHIP_CATALOG.carrier_5;
  const nationName =
    NATIONS[nationId]?.nationalShipNames?.carrier_5 ??
    'Siêu Soái Hạm Hộ Tống';
  return [
    {
      ...flagshipBase,
      name: `Soái Hạm ${nationName}`,
      isFlagship: true,
    },
  ];
}

export function getDefaultPlayerName(
  nationId: NationId,
  isAI: boolean = false
): string {
  const nat = NATIONS[nationId] ?? NATIONS.VN;
  if (isAI) {
    return `AI · ${nat.name}`;
  }
  return nat.id === 'EXO' ? 'Hạm Đội Dị Hình' : `Hạm Đội ${nat.name}`;
}

export function isDefaultPlayerName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  const legacyNames = new Set([
    'Đô Đốc Việt Nam',
    'Hạm Đội Thái Bình Dương',
    'Đô Đốc AI',
    'Người chơi 1',
    'Người chơi 2',
  ]);
  if (legacyNames.has(trimmed)) return true;
  return NATION_LIST.some(
    (n) =>
      trimmed === getDefaultPlayerName(n.id, false) ||
      trimmed === getDefaultPlayerName(n.id, true)
  );
}
