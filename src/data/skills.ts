import {
  AIDifficulty,
  SkillCategory,
  SkillDefinition,
  SkillId,
} from '../types/game';

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  RECON: '1. Trinh Sát (20)',
  STRIKE: '2. Tấn Công (20)',
  SUPPORT: '3. Hỗ Trợ & Sửa Chữa (20)',
  TRAP: '4. Bẫy & Mồi Nhử (20)',
  SHIELD: '5. Khiên & Đánh Chặn (20)',
  MOVEMENT: '6. Định Vị & Điều Hướng (20)',
};

export const SKILLS: Record<SkillId, SkillDefinition> = {
  // =========================================================================
  // NHÁNH 1. TRINH SÁT – RECONNAISSANCE (6 Chủ động · 3 Bị động)
  // =========================================================================
  flare_shell: {
    id: 'flare_shell',
    code: 1,
    name: 'Pháo Sáng',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Chọn 1 tọa độ địch: kiểm tra và tiết lộ chính xác phân đoạn tàu đang hoạt động hoặc thủy lôi tại ô đó.',
  },
  sonar_ping: {
    id: 'sonar_ping',
    code: 2,
    name: 'Quét Sonar',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_3X3',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Duyệt vùng 3×3 ô trên lưới địch: trả về Có/Không có tàu hoạt động (không tính đá ngầm và thủy lôi).',
  },
  recon_plane: {
    id: 'recon_plane',
    code: 3,
    name: 'Radar Tầm Xa',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_FULL_LINE',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Duyệt đủ 18 ô theo hàng hoặc cột (R xoay): thông báo chuẩn xác số phân đoạn tàu còn sống.',
  },
  minesweeper: {
    id: 'minesweeper',
    code: 4,
    name: 'Máy Quét Mìn',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'OWN_3X3',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Quét vùng 3×3 trên bản đồ nhà để phát hiện và vô hiệu hóa toàn bộ thủy lôi ẩn (không ảnh hưởng đá ngầm).',
  },
  directional_sonar: {
    id: 'directional_sonar',
    code: 5,
    name: 'Sonar Định Hướng',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CONE',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Quét hình nón/chéo 5 ô theo hướng chỉ định (R xoay 4 hướng): báo Có/Không có phân đoạn tàu.',
  },
  recon_drone: {
    id: 'recon_drone',
    code: 6,
    name: 'Drone Trinh Sát',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_LINE_4',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Quét 4 ô liên tiếp theo hàng/cột (R xoay): tiết lộ chính xác tọa độ phân đoạn tàu & thủy lôi phát hiện.',
  },
  naval_allseeing_eye: {
    id: 'naval_allseeing_eye',
    code: 7,
    name: 'Mắt Thần Hải Quân',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Cứ mỗi 10 lượt của bạn, tự động chọn và tiết lộ 1 ô chưa khai hỏa có tàu địch (hoặc ô trống nếu hết).',
  },
  sweeping_frequency: {
    id: 'sweeping_frequency',
    code: 8,
    name: 'Tần Số Tảo Quét',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi kỹ năng trinh sát phát hiện ≥1 phân đoạn tàu sống, giảm 1 CD các kỹ năng Trinh sát đang hồi.',
  },
  signal_analysis: {
    id: 'signal_analysis',
    code: 9,
    name: 'Phân Tích Tín Hiệu',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Tự động lưu ID tàu và danh sách tọa độ đã phát hiện của tàu mới (giữ nguyên mốc cũ nếu tàu dời chỗ).',
  },

  // =========================================================================
  // NHÁNH 2. TẤN CÔNG – OFFENSIVE (6 Chủ động · 3 Bị động)
  // =========================================================================
  air_strike: {
    id: 'air_strike',
    code: 10,
    name: 'Không Kích (+)',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CROSS',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Tạo vùng chữ thập (+) 5 ô quanh tâm và gây sát thương các phân đoạn tàu hợp lệ (bỏ qua ngoài biên & đá).',
  },
  torpedo_run: {
    id: 'torpedo_run',
    code: 11,
    name: 'Ngư Lôi Xuyên Phá',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_LINE',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Phóng thẳng tối đa 5 ô liên tiếp (R xoay 4 hướng), gây sát thương các tàu gặp phải; bị chặn bởi đá ngầm, không kích mìn.',
  },
  artillery_barrage: {
    id: 'artillery_barrage',
    code: 12,
    name: 'Pháo Kích Tầm Xa',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Tự động chọn ngẫu nhiên 4 ô chưa từng khai hỏa trên bản đồ địch và dội 4 phát pháo.',
  },
  armor_piercing: {
    id: 'armor_piercing',
    code: 13,
    name: 'Đạn Xuyên Giáp',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Bắn 1 ô xuyên qua lớp Khiên Năng Lượng & Vòm, kiểm tra giáp phân đoạn và gây sát thương trực tiếp.',
  },
  incendiary_shell: {
    id: 'incendiary_shell',
    code: 14,
    name: 'Đạn Cháy Nổ Lớn',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Bắn 1 ô; nếu trúng tàu, đánh dấu cháy lan tối đa 2 phân đoạn liền kề cùng tàu gây sát thương vào lượt kế tiếp.',
  },
  heavy_artillery: {
    id: 'heavy_artillery',
    code: 15,
    name: 'Pháo Hạng Nặng Cỡ Lớn',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2X2',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Đánh dấu vùng đỏ 2×2 (Pending): sau 1 lượt đối phương, tự động khai hỏa dội bom vùng này.',
  },
  primary_firepower: {
    id: 'primary_firepower',
    code: 16,
    name: 'Hỏa Lực Sơ Cấp',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi 1 phát bắn thường hợp lệ trúng tàu, có 20% xác suất được thêm 1 phát bắn (tối đa 1 lần/lượt).',
  },
  artillery_expert: {
    id: 'artillery_expert',
    code: 17,
    name: 'Chuyên Gia Pháo Binh',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi dùng Không Kích hoặc Pháo Kích Tầm Xa, có 20% xác suất bắn thêm 1 ô hợp lệ ngẫu nhiên.',
  },
  improved_ammo: {
    id: 'improved_ammo',
    code: 18,
    name: 'Đạn Dược Cải Tiến',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Cứ sau 5 lượt của bạn, phát bắn thường kế tiếp gây +1 sát thương nếu trúng tàu (không cộng dồn).',
  },

  // =========================================================================
  // NHÁNH 3. HỖ TRỢ & SỬA CHỮA – SUPPORT & REPAIR (6 Chủ động · 3 Bị động)
  // =========================================================================
  emergency_repair: {
    id: 'emergency_repair',
    code: 19,
    name: 'Sửa Chữa Khẩn Cấp',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SEGMENT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Chọn phân đoạn/tàu nhà bị thương (chưa chìm hoàn toàn): hồi 1 điểm giáp/HP cho phân đoạn đó.',
  },
  radar_jammer: {
    id: 'radar_jammer',
    code: 20,
    name: 'Trạm Nhiễu Radar',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Gây nhiễu trinh sát: chặn Pháo Sáng, Sonar, Radar Tầm Xa & Drone đối phương ở lượt kế tiếp (không xóa intel cũ).',
  },
  emp_jamming: {
    id: 'emp_jamming',
    code: 21,
    name: 'Gây Nhiễu EMP',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Khóa toàn bộ kỹ năng chủ động của đối phương ở lượt kế tiếp, buộc chỉ bắn thường (không khóa bị động).',
  },
  fire_suppression: {
    id: 'fire_suppression',
    code: 22,
    name: 'Hệ Thống Dập Lửa',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Chọn 1 tàu nhà đang cháy: xóa ngay toàn bộ hiệu ứng cháy trên tàu đó (không hồi HP đã mất).',
  },
  frequency_restore: {
    id: 'frequency_restore',
    code: 23,
    name: 'Khôi Phục Tần Số',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Gỡ ngay trạng thái khóa kỹ năng do EMP của địch gây ra (có thể kích hoạt ngay cả khi đang bị EMP).',
  },
  fleet_maintenance: {
    id: 'fleet_maintenance',
    code: 24,
    name: 'Bảo Trì Hạm Đội',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Giảm 1 lượt CD cho tất cả kỹ năng khác của bản thân đang trong thời gian hồi chiêu.',
  },
  strong_logistics: {
    id: 'strong_logistics',
    code: 25,
    name: 'Hậu Cần Vững Mạnh',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Tự động giảm 1 CD cho mọi kỹ năng nhánh Hỗ Trợ & Sửa Chữa khi bắt đầu lượt của bạn.',
  },
  self_repair_armor: {
    id: 'self_repair_armor',
    code: 26,
    name: 'Giáp Tự Phục Hồi',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Sau 5 lượt liên tiếp không nhận sát thương, tự hồi 1 điểm giáp cho 1 phân đoạn bị thương còn sống.',
  },
  naval_technician: {
    id: 'naval_technician',
    code: 27,
    name: 'Kỹ Thuật Viên Hải Quân',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Có 20% xác suất không bị tính CD khi kích hoạt kỹ năng chủ động nhánh Hỗ Trợ & Sửa Chữa.',
  },

  // =========================================================================
  // NHÁNH 4. BẪY & MỒI NHỬ – TRAPS & DECEPTION (6 Chủ động · 3 Bị động)
  // =========================================================================
  sea_mine: {
    id: 'sea_mine',
    code: 28,
    name: 'Thủy Lôi Ngầm',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Đặt 1 thủy lôi ẩn tại ô trống lưới nhà (tránh đá/tàu/mìn khác); tàu địch dịch chuyển vào hoặc bắn trúng sẽ nổ.',
  },
  salvo_3: {
    id: 'salvo_3',
    code: 29,
    name: 'Mưa Đạn Dồn Dập',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_3_CELLS',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Chọn 3 tọa độ khác nhau trên bản đồ địch để bắn 3 phát liên tiếp độc lập trong cùng lượt.',
  },
  follow_up_shot: {
    id: 'follow_up_shot',
    code: 30,
    name: 'Bắn Bồi',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Kích hoạt trước khi bắn thường: nếu phát bắn thường đầu tiên trúng tàu, lập tức được thêm 1 phát bắn bồi.',
  },
  ghost_fleet: {
    id: 'ghost_fleet',
    code: 31,
    name: 'Hạm Đội Ảo Ảnh',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Tạo cụm 2–3 tín hiệu tàu giả trên lưới nhà trong 2 lượt khiến Sonar/Radar đối phương nhận nhầm.',
  },
  emp_grid: {
    id: 'emp_grid',
    code: 32,
    name: 'Lưới Điện Từ Ngầm',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_2X2',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Đặt bẫy vùng 2×2 trên lưới nhà; đối phương dò hoặc tác động vào vùng bẫy sẽ bị khóa kỹ năng chủ động 1 lượt rồi bẫy tan.',
  },
  info_fog: {
    id: 'info_fog',
    code: 33,
    name: 'Màn Sương Thông Tin',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Trong 2 lượt đối phương, che giấu tọa độ bắn & kết quả diễn biến mới ở góc nhìn đối thủ (không xóa lịch sử gốc).',
  },
  auto_decoy: {
    id: 'auto_decoy',
    code: 34,
    name: 'Mồi Nhử Tự Động',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi phân đoạn tàu trúng đạn lần đầu, tạm ẩn dấu hiệu trên bản đồ nhà 1 lượt đối phương (vẫn báo trúng).',
  },
  counter_mine: {
    id: 'counter_mine',
    code: 35,
    name: 'Thủy Lôi Phản Kích',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi thủy lôi của bạn phát nổ, có 20% xác suất tạo 1 ô nhiễu thông tin liền kề trong lượt kế tiếp.',
  },
  deception_tactics: {
    id: 'deception_tactics',
    code: 36,
    name: 'Chiến Thuật Nghi Binh',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Cứ mỗi 8 lượt của bạn, tự tạo 1 tín hiệu giả trên bản đồ nhà trong 1 lượt để đánh lạc hướng trinh sát.',
  },

  // =========================================================================
  // NHÁNH 5. KHIÊN & ĐÁNH CHẶN – DEFENSE & INTERCEPTION (6 Chủ động · 3 Bị động)
  // =========================================================================
  energy_shield: {
    id: 'energy_shield',
    code: 37,
    name: 'Khiên Năng Lượng',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Bọc khiên cho 1 tàu nhà, hấp thụ trọn vẹn phát bắn hợp lệ đầu tiên (bỏ qua bởi Đạn Xuyên Giáp).',
  },
  smoke_screen: {
    id: 'smoke_screen',
    code: 38,
    name: 'Màn Khói Ngụy Trang',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_3X3',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Rải khói 3×3 trong 2 lượt đối phương: đòn đơn mục tiêu có 30% lệch sang 1 ô trống gần tọa độ nhắm.',
  },
  dome_shield: {
    id: 'dome_shield',
    code: 39,
    name: 'Vòm Phòng Thủ Cục Bộ',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_2X2',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Tạo vùng bảo vệ 2×2 trong lượt đối phương kế tiếp: vô hiệu hóa sát thương Không Kích & Pháo Kích Tầm Xa.',
  },
  missile_interceptor: {
    id: 'missile_interceptor',
    code: 40,
    name: 'Lưới Đánh Chặn Tên Lửa',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Sẵn sàng trong lượt đối phương kế tiếp: hủy hoàn toàn 1 đợt Ngư Lôi Xuyên Phá hoặc Pháo Hạng Nặng bay tới.',
  },
  reflective_shield: {
    id: 'reflective_shield',
    code: 41,
    name: 'Khiên Phản Xạ',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Hấp thụ 1 đòn đơn mục tiêu lên tàu được chọn và phản sát thương ngược lại vào 1 tàu địch xác định.',
  },
  airstrike_jammer: {
    id: 'airstrike_jammer',
    code: 42,
    name: 'Trạm Nhiễu Sóng Không Kích',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_3X3',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Đặt vùng gây nhiễu 3×3 trên lưới nhà trong 1 lượt đối phương: vô hiệu hóa các đòn Không Kích & Pháo Hạng Nặng.',
  },
  ciws: {
    id: 'ciws',
    code: 43,
    name: 'Hệ Thống CIWS',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Cứ mỗi 5 lượt của bạn, sẵn sàng tự động đánh chặn loại bỏ 1 ô sát thương khi nhận Không Kích / Ngư Lôi.',
  },
  reinforced_armor: {
    id: 'reinforced_armor',
    code: 44,
    name: 'Giáp Gia Cường',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Tăng +1 giáp tối đa cho mỗi phân đoạn tàu nhà (không tự hồi HP hiện tại và không cộng dồn).',
  },
  early_warning: {
    id: 'early_warning',
    code: 45,
    name: 'Cảnh Báo Sớm',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi đối phương đánh dấu vùng đỏ Pháo Hạng Nặng, lập tức cảnh báo tọa độ vùng nguy hiểm cho bạn.',
  },

  // =========================================================================
  // NHÁNH 6. ĐỊNH VỊ & ĐIỀU HƯỚNG – NAVIGATION & MANEUVER (6 Chủ động · 3 Bị động)
  // =========================================================================
  tidal_shockwave: {
    id: 'tidal_shockwave',
    code: 46,
    name: 'Sóng Xung Kích',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_FULL_LINE',
    cooldown: 8,
    maxUses: 99,
    shortDesc:
      'Quét 1 hàng/cột đẩy toàn bộ tàu & thủy lôi trên đường đi 1 ô theo hướng chọn (đá ngầm cố định, mìn chạm tàu nổ).',
  },
  rotate_ship: {
    id: 'rotate_ship',
    code: 47,
    name: 'Đổi Góc Hướng Tàu',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Xoay nguyên hình dạng 1 tàu nhà 90° quanh điểm neo nếu hợp lệ (không vượt biên hay chạm đá/tàu khác).',
  },
  strategic_relocation: {
    id: 'strategic_relocation',
    code: 48,
    name: 'Cơ Động Chiến Lược',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP_DIR',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Dịch chuyển nguyên 1 tàu nhà sang 1 ô lân cận (né đá/tàu, reset hiển thị ô cũ, vào thủy lôi sẽ kích nổ).',
  },
  enemy_deviation: {
    id: 'enemy_deviation',
    code: 49,
    name: 'Bẻ Lái Hướng Địch',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_SHIP_DIR',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Chọn phân đoạn tàu địch đã lộ diện và đẩy nguyên con tàu đó trượt 1 ô theo hướng chỉ định (reset ô cũ).',
  },
  formation_swap: {
    id: 'formation_swap',
    code: 50,
    name: 'Tái Lập Đội Hình',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_TWO_SHIPS',
    cooldown: 7,
    maxUses: 99,
    shortDesc:
      'Chọn 2 tàu nhà chưa chìm để hoán đổi nguyên vị trí cho nhau (giữ nguyên hình dạng & sát thương từng phân đoạn).',
  },
  tactical_evasion: {
    id: 'tactical_evasion',
    code: 51,
    name: 'Né Tránh Chiến Thuật',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Gắn trạng thái chống ép dịch chuyển lên 1 tàu nhà trong lượt đối phương kế tiếp (vẫn tự do cơ động chủ động).',
  },
  deep_water_current: {
    id: 'deep_water_current',
    code: 52,
    name: 'Luồng Nước Sâu',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Giảm 1 CD cho tất cả kỹ năng nhánh Định Vị & Điều Hướng khi bắt đầu lượt của bạn.',
  },
  formation_stability: {
    id: 'formation_stability',
    code: 53,
    name: 'Ổn Định Đội Hình',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Toàn bộ tàu nhà miễn nhiễm hoàn toàn với hiệu ứng ép dịch chuyển từ đối phương.',
  },
  hydrographic_map: {
    id: 'hydrographic_map',
    code: 54,
    name: 'Bản Đồ Thủy Văn',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Kiểm tra trước vị trí mới khi dùng kỹ năng dịch chuyển và cảnh báo đá ngầm/vật cản đã biết.',
  },

  // =========================================================================
  // MỞ RỘNG +66 KỸ NĂNG (55–120): 11 KỸ NĂNG MỚI MỖI NHÁNH (8 CHỦ ĐỘNG + 3 BỊ ĐỘNG)
  // =========================================================================

  // --- NHÁNH 1 MỞ RỘNG: TRINH SÁT (55–65) ---
  sonar_2x2: {
    id: 'sonar_2x2',
    code: 55,
    name: 'Quét Sonar 2×2',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2X2',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'Quét nhanh vùng 2×2 trên lưới địch: báo số ô phân đoạn tàu sống trong vùng quét (CD thấp, chính xác góc hẹp).',
  },
  deep_flare: {
    id: 'deep_flare',
    code: 56,
    name: 'Pháo Sáng Xuyên Khói',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Bắn pháo sáng xuyên qua Màn Khói & Nhiễu Radar tại 1 ô địch để làm lộ phân đoạn tàu hoặc thủy lôi tại đó.',
  },
  diagonal_sweep: {
    id: 'diagonal_sweep',
    code: 57,
    name: 'Quét Chéo Chiến Thuật',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_DIAG',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Quét một dải đường chéo 5 ô theo hướng chọn (R xoay 4 góc chéo) và báo số ô tàu địch hiện diện.',
  },
  enemy_mine_detector: {
    id: 'enemy_mine_detector',
    code: 58,
    name: 'Dò Thủy Lôi Địch',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_3X3',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Quét vùng 3×3 trên lưới địch để phát hiện và đánh dấu rõ vị trí các thủy lôi ẩn của đối phương.',
  },
  flagship_tracker: {
    id: 'flagship_tracker',
    code: 59,
    name: 'Định Vị Tàu Chủ Lực',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Dò sóng trọng tải lớn trên bản đồ địch: làm lộ ngay 1 tọa độ chưa trúng của Soái Hạm (hoặc tàu lớn nhất còn sống).',
  },
  edge_patrol: {
    id: 'edge_patrol',
    code: 60,
    name: 'Tuần Tra Đường Biên',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Dùng máy bay tuần thám quét toàn bộ 4 đường biên ngoài cùng của lưới địch, báo tổng số phân đoạn tàu bám biên.',
  },
  triangulate_scan: {
    id: 'triangulate_scan',
    code: 61,
    name: 'Tam Giác Định Vị',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CROSS',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Quét vùng chữ thập (+) 5 ô trên lưới địch; nếu có tàu ẩn bên trong sẽ lập tức làm lộ 1 ô tàu chính xác!',
  },
  satellite_snapshot: {
    id: 'satellite_snapshot',
    code: 62,
    name: 'Ảnh Vệ Tinh Tức Thời',
    category: 'RECON',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2X2',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Chụp ảnh vệ tinh vùng 2×2 trên lưới địch, làm lộ toàn bộ phân đoạn tàu sống trong vùng này (bỏ qua Màn Khói).',
  },
  hit_echo: {
    id: 'hit_echo',
    code: 63,
    name: 'Dư Âm Va Chạm',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi phát bắn thường trúng phân đoạn tàu địch, có 25% xác suất tự động hé lộ thêm 1 ô kề cùng tàu.',
  },
  sink_intel: {
    id: 'sink_intel',
    code: 64,
    name: 'Khai Thác Hộp Đen',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi đánh chìm 1 tàu địch, tự động giải mã tình báo làm lộ 1 ô của tàu địch gần nhất chưa chìm.',
  },
  counter_jam_optics: {
    id: 'counter_jam_optics',
    code: 65,
    name: 'Quang Học Kháng Nhiễu',
    category: 'RECON',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Kỹ năng Trinh Sát của bạn bỏ qua Trạm Nhiễu Radar địch và giảm 50% ảnh hưởng từ Sương Mù Dày Đặc.',
  },

  // --- NHÁNH 2 MỞ RỘNG: TẤN CÔNG (66–76) ---
  carpet_bomb: {
    id: 'carpet_bomb',
    code: 66,
    name: 'Rải Thảm 3×3',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_3X3',
    cooldown: 7,
    maxUses: 99,
    shortDesc:
      'Oanh tạc rải thảm chọn ngẫu nhiên tối đa 5 ô chưa khai hỏa bên trong vùng 3×3 mục tiêu.',
  },
  cross_x_strike: {
    id: 'cross_x_strike',
    code: 67,
    name: 'Không Kích Chữ X',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_X',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Ném bom 5 ô theo hình chữ X (tâm và 4 góc chéo) trên lưới địch, đánh xuyên đội hình dày đặc.',
  },
  railgun_pierce: {
    id: 'railgun_pierce',
    code: 68,
    name: 'Pháo Điện Từ 6 Ô',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_LINE_6',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Bắn tia điện từ 6 ô liên tiếp (R xoay 4 hướng), xuyên qua Khiên Năng Lượng & Vòm, chỉ dừng khi chạm Đá ngầm.',
  },
  cluster_missile: {
    id: 'cluster_missile',
    code: 69,
    name: 'Tên Lửa Chùm 2×2',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2X2',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Phóng tên lửa chùm đánh trực tiếp cả 4 ô trong vùng 2×2 ngay lập tức (có thể bị Đánh Chặn/Vòm/CIWS cản).',
  },
  execute_shot: {
    id: 'execute_shot',
    code: 70,
    name: 'Phát Bắn Kết Liễu',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Bắn 1 ô chính xác; nếu mục tiêu là tàu địch đã bị thương trước đó, gây 2 sát thương (xuyên thêm ô kề).',
  },
  shock_cannon: {
    id: 'shock_cannon',
    code: 71,
    name: 'Pháo Chấn Động',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Bắn 1 ô địch; nếu trúng phân đoạn tàu, làm xáo trộn hệ thống khiến 1 kỹ năng sẵn sàng của địch bị +1 CD.',
  },
  depth_charge: {
    id: 'depth_charge',
    code: 72,
    name: 'Bom Chìm Phá Mìn',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_3X3',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Thả bom chấn động vùng 3×3 địch: phá hủy tối đa 2 thủy lôi địch tại chỗ (không nổ phản) và đánh trúng tâm.',
  },
  rapid_salvo_2: {
    id: 'rapid_salvo_2',
    code: 73,
    name: 'Liên Thanh 2 Phát',
    category: 'STRIKE',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2_CELLS',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Chọn 2 tọa độ bất kỳ trên bản đồ địch để khai hỏa 2 phát bắn độc lập liên tiếp trong cùng lượt.',
  },
  armor_shredder: {
    id: 'armor_shredder',
    code: 74,
    name: 'Đạn Phá Giáp Thuần Túy',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Mọi phát bắn trúng tàu có giáp (Soái Hạm / Giáp Gia Cường) có 35% xác suất phá thêm 1 lớp giáp.',
  },
  incendiary_mastery: {
    id: 'incendiary_mastery',
    code: 75,
    name: 'Chất Cháy Tăng Cường',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Đạn Cháy Nổ Lớn có 40% xác suất cháy lan thêm 1 phân đoạn kề hoặc kéo dài cháy thêm 1 lượt.',
  },
  critical_barrage: {
    id: 'critical_barrage',
    code: 76,
    name: 'Xạ Kích Chí Mạng',
    category: 'STRIKE',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Phát bắn thường trúng vào ô tàu đã bị trinh sát lộ diện có 30% xác suất gây +1 sát thương.',
  },

  // --- NHÁNH 3 MỞ RỘNG: HỖ TRỢ & SỬA CHỮA (77–87) ---
  full_hull_overhaul: {
    id: 'full_hull_overhaul',
    code: 77,
    name: 'Đại Tu Thân Tàu',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 7,
    maxUses: 99,
    shortDesc:
      'Chọn 1 tàu nhà chưa chìm: sửa chữa tổng lực khôi phục tối đa 2 điểm giáp/HP phân đoạn bị thương.',
  },
  flagship_overcharge: {
    id: 'flagship_overcharge',
    code: 78,
    name: 'Tiếp Viện Soái Hạm',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Hồi ngay +1 lớp giáp cho Soái Hạm (hoặc tàu lớn nhất còn sống) và giảm 1 CD cho các kỹ năng nhánh Khiên.',
  },
  rock_demolition: {
    id: 'rock_demolition',
    code: 79,
    name: 'Công Binh Phá Đá',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Chọn 1 ô Đá ngầm trên bản đồ nhà để phá hủy hoàn toàn, mở rộng luồng di chuyển cho hạm đội.',
  },
  cooldown_surge: {
    id: 'cooldown_surge',
    code: 80,
    name: 'Xung Nhịp Hồi Chiêu',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Giảm ngay 2 lượt hồi chiêu (CD) cho kỹ năng đang có thời gian hồi cao nhất của bản thân.',
  },
  ammo_boost: {
    id: 'ammo_boost',
    code: 81,
    name: 'Nạp Đạn Cao Áp',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Nạp đạn đặc biệt cho phát bắn thường kế tiếp trong lượt: gây +1 sát thương nếu trúng mục tiêu.',
  },
  emp_purge_aura: {
    id: 'emp_purge_aura',
    code: 82,
    name: 'Tường Lửa Chống EMP',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Xóa khóa EMP hiện tại và cấp miễn nhiễm hiệu ứng Gây Nhiễu EMP trong 1 lượt đối phương kế tiếp.',
  },
  combat_surge: {
    id: 'combat_surge',
    code: 83,
    name: 'Lệnh Tổng Tiến Công',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Thúc đẩy hỏa lực toàn hạm đội: lập tức cộng thêm +1 phát bắn thường trong lượt hiện tại.',
  },
  sonar_calibration: {
    id: 'sonar_calibration',
    code: 84,
    name: 'Hiệu Chuẩn Radar',
    category: 'SUPPORT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Giảm 1 CD cho toàn bộ kỹ năng nhánh Trinh Sát đang hồi và cắt giảm 1 lượt Trạm Nhiễu Radar của địch.',
  },
  flagship_aegis_passive: {
    id: 'flagship_aegis_passive',
    code: 85,
    name: 'Cơ Khí Soái Hạm',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi Soái Hạm (hoặc tàu lớn nhất) bị bắn vỡ dưới 50% thân tàu, tự động gia cố thêm +1 lớp giáp (1 lần/ván).',
  },
  fireproof_bulkhead: {
    id: 'fireproof_bulkhead',
    code: 86,
    name: 'Vách Ngăn Chống Cháy',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Toàn bộ hạm đội nhà giảm tối đa số ô cháy lan từ Đạn Cháy Nổ Lớn xuống chỉ còn 1 ô.',
  },
  tactical_reserve: {
    id: 'tactical_reserve',
    code: 87,
    name: 'Dự Bị Chiến Thuật',
    category: 'SUPPORT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Mỗi khi 1 tàu nhà bị đánh chìm, tự động giảm 1 lượt hồi chiêu cho toàn bộ kỹ năng đang hồi của bạn.',
  },

  // --- NHÁNH 4 MỞ RỘNG: BẪY & MỒI NHỬ (88–98) ---
  minefield_line: {
    id: 'minefield_line',
    code: 88,
    name: 'Bãi Thủy Lôi 3 Ô',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Thả tối đa 3 quả thủy lôi ngầm liên tiếp trên các ô trống quanh tọa độ chỉ định ở lưới nhà.',
  },
  magnetic_mine: {
    id: 'magnetic_mine',
    code: 89,
    name: 'Thủy Lôi Từ Tính',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_3X3',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Gài ngẫu nhiên 2 thủy lôi ẩn trong vùng 3×3 lưới nhà để bảo vệ tuyến hành lang trọng yếu.',
  },
  decoy_flagship: {
    id: 'decoy_flagship',
    code: 90,
    name: 'Tàu Mồi Soái Hạm',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Tạo cụm 4 tín hiệu giả hình chữ T/vuông trên vùng biển trống nhà tồn tại 3 lượt đánh lừa Sonar địch.',
  },
  emp_mine_single: {
    id: 'emp_mine_single',
    code: 91,
    name: 'Bẫy EMP Đơn Điểm',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Đặt 1 bẫy điện từ ẩn 1×1 tại ô trống lưới nhà; kẻ địch bắn trúng sẽ bị khóa kỹ năng chủ động 1 lượt.',
  },
  false_log_spoof: {
    id: 'false_log_spoof',
    code: 92,
    name: 'Nhiễu Tọa Độ Diễn Biến',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Kích hoạt Màn Sương Thông Tin 1 lượt và tự sinh 1 tín hiệu radar giả trên vùng biển nhà.',
  },
  trap_salvo_2: {
    id: 'trap_salvo_2',
    code: 93,
    name: 'Phục Kích 2 Hướng',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_2_CELLS',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Chọn 2 ô trên lưới địch để bắn; nếu trúng ít nhất 1 ô tàu, tự động thả thêm 1 thủy lôi bảo vệ lưới nhà.',
  },
  siren_beacon: {
    id: 'siren_beacon',
    code: 94,
    name: 'Phao Sóng Giả',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'OWN_2X2',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Rải 2 tín hiệu giả và tạo 2 ô nhiễu thông tin làm lệch đạn đơn bên trong vùng 2×2 lưới nhà.',
  },
  ambush_mark: {
    id: 'ambush_mark',
    code: 95,
    name: 'Đánh Dấu Phục Kích',
    category: 'TRAP',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Bắn 1 ô địch: nếu trúng tàu gây thêm hiệu ứng cháy 1 lượt; nếu là nước trống sẽ hoàn 1 lượt CD cho kỹ năng này.',
  },
  mine_replenish: {
    id: 'mine_replenish',
    code: 96,
    name: 'Tái Tạo Thủy Lôi',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Cứ mỗi 7 lượt của bạn, tự động bổ sung 1 thủy lôi ngầm vào ô trống an toàn trên lưới nhà.',
  },
  phantom_echo_passive: {
    id: 'phantom_echo_passive',
    code: 97,
    name: 'Bóng Ma Ra-đa',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi đối phương bắn trúng tín hiệu giả trên lưới nhà, tự động sinh thêm 1 tín hiệu giả mới lân cận.',
  },
  sabotage_mine: {
    id: 'sabotage_mine',
    code: 98,
    name: 'Thủy Lôi Phá Hoại',
    category: 'TRAP',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi thủy lôi nhà phát nổ phản đòn, đồng thời đẩy +1 CD cho 1 kỹ năng sẵn sàng ngẫu nhiên của địch.',
  },

  // --- NHÁNH 5 MỞ RỘNG: KHIÊN & ĐÁNH CHẶN (99–109) ---
  fleet_smoke_wall: {
    id: 'fleet_smoke_wall',
    code: 99,
    name: 'Bức Tường Khói 5 Ô',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Rải màn khói kéo dài 5 ô liên tiếp trên lưới nhà (R xoay hướng) trong 2 lượt, giúp 30% né đạn đơn mục tiêu.',
  },
  flagship_bunker: {
    id: 'flagship_bunker',
    code: 100,
    name: 'Hầm Bọc Thép Soái Hạm',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Bọc ngay Khiên Năng Lượng cho Soái Hạm (hoặc tàu lớn nhất) kèm Vòm Phòng Thủ 2×2 quanh vị trí tàu đó.',
  },
  aegis_dome_3x3: {
    id: 'aegis_dome_3x3',
    code: 101,
    name: 'Vòm Aegis 3×3',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_3X3',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Dựng vòm phòng thủ rộng 3×3 trên lưới nhà trong 1 lượt đối phương, chặn mọi đòn Không Kích & Pháo Kích.',
  },
  mirror_barrier: {
    id: 'mirror_barrier',
    code: 102,
    name: 'Lớp Giáp Phản Chiếu',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Bọc đồng thời Khiên Năng Lượng và Khiên Phản Xạ cho 1 tàu nhà chưa chìm.',
  },
  torpedo_net: {
    id: 'torpedo_net',
    code: 103,
    name: 'Lưới Chặn Ngư Lôi',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Kích hoạt lưới đánh chặn hủy Ngư Lôi / Pháo Hạng Nặng kế tiếp và giảm 1 CD cho 1 kỹ năng nhánh Khiên khác.',
  },
  reactive_smoke: {
    id: 'reactive_smoke',
    code: 104,
    name: 'Khói Phản Ứng Nhanh',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_2X2',
    cooldown: 3,
    maxUses: 99,
    shortDesc:
      'CD cực ngắn: rải màn khói 2×2 tồn tại 3 lượt đối phương quanh vùng chọn để làm lệch đạn đơn.',
  },
  kevlar_bulkhead: {
    id: 'kevlar_bulkhead',
    code: 105,
    name: 'Gia Cố Giáp Tức Thời',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Tăng trực tiếp +1 lớp giáp chắn sát thương cho 1 tàu nhà chưa chìm.',
  },
  emp_deflector: {
    id: 'emp_deflector',
    code: 106,
    name: 'Màn Chắn Điện Từ',
    category: 'SHIELD',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Miễn nhiễm EMP trong lượt đối phương kế tiếp và kích hoạt sẵn sàng Hệ Thống CIWS chặn 1 ô AoE.',
  },
  first_turn_aegis: {
    id: 'first_turn_aegis',
    code: 107,
    name: 'Sẵn Sàng Chiến Đấu',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Ngay khi vào trận, Soái Hạm (hoặc tàu lớn nhất) tự động được bọc sẵn 1 lớp Khiên Năng Lượng.',
  },
  smoke_affinity: {
    id: 'smoke_affinity',
    code: 108,
    name: 'Chuyên Gia Ngụy Trang',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Mọi kỹ năng tạo Màn Khói trên lưới nhà tự động được cộng thêm +1 lượt duy trì.',
  },
  reactive_hull_passive: {
    id: 'reactive_hull_passive',
    code: 109,
    name: 'Thân Tàu Phản Lực',
    category: 'SHIELD',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi bất kỳ tàu nhà nào trúng đòn lần đầu, có 25% xác suất kích hoạt Lưới Đánh Chặn Tên Lửa.',
  },

  // --- NHÁNH 6 MỞ RỘNG: ĐỊNH VỊ & ĐIỀU HƯỚNG (110–120) ---
  turbo_dash_2: {
    id: 'turbo_dash_2',
    code: 110,
    name: 'Tăng Tốc 2 Ô',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP_DIR',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Dịch chuyển nguyên 1 tàu nhà tiến thẳng 2 ô theo hướng chọn (R xoay 4 hướng), thoát vùng hỏa lực địch tức thì.',
  },
  flip_ship_180: {
    id: 'flip_ship_180',
    code: 111,
    name: 'Xoay Đầu Tàu 180°',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Đảo ngược hướng 1 tàu nhà 180° quanh điểm neo nếu hợp lệ, đánh lạc hướng đoán dáng tàu của đối thủ.',
  },
  fleet_drift_shift: {
    id: 'fleet_drift_shift',
    code: 112,
    name: 'Hải Lưu Dịch Hạm',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 7,
    maxUses: 99,
    shortDesc:
      'Điều động toàn bộ hạm đội nhà đồng loạt trượt 1 ô theo hướng tối ưu (nếu hợp lệ & không vướng vật cản).',
  },
  decoy_swap: {
    id: 'decoy_swap',
    code: 113,
    name: 'Hoán Đổi Ảnh Giả',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_SHIP',
    cooldown: 5,
    maxUses: 99,
    shortDesc:
      'Dịch chuyển 1 tàu nhà tới ô lân cận an toàn trong bán kính 2 ô và để lại 2 tín hiệu giả tại vị trí cũ!',
  },
  crosswind_push: {
    id: 'crosswind_push',
    code: 114,
    name: 'Gió Ngang Đẩy Địch',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'ENEMY_SHIP_DIR',
    cooldown: 7,
    maxUses: 99,
    shortDesc:
      'Chọn phân đoạn tàu địch đã lộ diện để đẩy trượt nguyên con tàu đó tối đa 2 ô theo hướng chỉ định (R xoay).',
  },
  mine_relocate: {
    id: 'mine_relocate',
    code: 115,
    name: 'Dời Thủy Lôi',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'OWN_CELL',
    cooldown: 4,
    maxUses: 99,
    shortDesc:
      'Di dời quả thủy lôi đặt trên lưới nhà gần vị trí chọn nhất tới chính xác tọa độ trống mới (hoặc thả mới nếu chưa có).',
  },
  evasive_maneuver_all: {
    id: 'evasive_maneuver_all',
    code: 116,
    name: 'Báo Động Cơ Động',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Toàn bộ tàu nhà nhận trạng thái Né Tránh Chiến Thuật (miễn nhiễm ép dịch chuyển) trong lượt đối phương kế tiếp.',
  },
  reposition_flagship: {
    id: 'reposition_flagship',
    code: 117,
    name: 'Di Chuyển Khẩn Soái Hạm',
    category: 'MOVEMENT',
    kind: 'ACTIVE',
    targetMode: 'INSTANT',
    cooldown: 6,
    maxUses: 99,
    shortDesc:
      'Tự động cơ động Soái Hạm (hoặc tàu bị thương nặng nhất) sang vị trí lân cận an toàn nhất.',
  },
  afterimage_trail: {
    id: 'afterimage_trail',
    code: 118,
    name: 'Ảnh Ảo Đường Chạy',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Mỗi khi chủ động dịch chuyển hoặc xoay tàu nhà, tự để lại 1 tín hiệu giả tại tọa độ cũ (1 lượt).',
  },
  tailwind_propulsion: {
    id: 'tailwind_propulsion',
    code: 119,
    name: 'Thuận Gió Đẩy Thuyền',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Khi kích hoạt kỹ năng nhánh Định Vị & Điều Hướng, có 30% xác suất được giảm ngay 1 CD cho kỹ năng đó.',
  },
  rock_navigator: {
    id: 'rock_navigator',
    code: 120,
    name: 'Hoa Tiêu Đá Ngầm',
    category: 'MOVEMENT',
    kind: 'PASSIVE',
    targetMode: 'INSTANT',
    cooldown: 0,
    maxUses: 99,
    shortDesc:
      'Bị động: Tàu nhà khi chủ động dịch chuyển hoặc xoay sẽ khéo léo tránh kích nổ thủy lôi do chính phe mình đặt.',
  },
};

const CATEGORY_SORT_ORDER: Record<SkillCategory, number> = {
  RECON: 1,
  STRIKE: 2,
  SUPPORT: 3,
  TRAP: 4,
  SHIELD: 5,
  MOVEMENT: 6,
};

export const ALL_SKILLS: SkillDefinition[] = Object.values(SKILLS).sort(
  (a, b) =>
    CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category] ||
    a.code - b.code
);

export const DEFAULT_P1_SKILLS: SkillId[] = [
  'flare_shell',
  'sonar_ping',
  'air_strike',
  'armor_piercing',
  'emergency_repair',
  'sea_mine',
  'energy_shield',
  'ciws',
  'strategic_relocation',
  'sweeping_frequency',
];

export const DEFAULT_P2_SKILLS: SkillId[] = [
  'recon_plane',
  'directional_sonar',
  'torpedo_run',
  'incendiary_shell',
  'radar_jammer',
  'ghost_fleet',
  'smoke_screen',
  'reinforced_armor',
  'rotate_ship',
  'hydrographic_map',
];

export function getRandomSkills(count: number = 10): SkillId[] {
  const pool = [...ALL_SKILLS.map((s) => s.id)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Mỗi cấp độ AI (1–5) mang bộ 10 kỹ năng phù hợp chiến thuật từ kho 120 kỹ năng
 */
export function getAISkillsForDifficulty(level: AIDifficulty): SkillId[] {
  switch (level) {
    case 1:
      // Tân Binh: kỹ năng đơn giản
      return [
        'artillery_barrage',
        'flare_shell',
        'minesweeper',
        'smoke_screen',
        'follow_up_shot',
        'salvo_3',
        'sea_mine',
        'emergency_repair',
        'rotate_ship',
        'naval_allseeing_eye',
      ];
    case 2:
      // Tuần Tra: trinh sát + sửa chữa + thủy lôi
      return [
        'recon_plane',
        'flare_shell',
        'artillery_barrage',
        'emergency_repair',
        'fire_suppression',
        'sea_mine',
        'energy_shield',
        'smoke_screen',
        'tactical_evasion',
        'strong_logistics',
      ];
    case 3:
      // Săn Đuổi: xuyên phá + cháy lan + cơ động
      return [
        'flare_shell',
        'directional_sonar',
        'torpedo_run',
        'incendiary_shell',
        'follow_up_shot',
        'smoke_screen',
        'radar_jammer',
        'strategic_relocation',
        'rotate_ship',
        'primary_firepower',
      ];
    case 4:
      // Chiến Thuật: Sonar + Không kích + EMP + Vòm + Pháo Hạng Nặng
      return [
        'sonar_ping',
        'recon_drone',
        'air_strike',
        'heavy_artillery',
        'emp_jamming',
        'frequency_restore',
        'dome_shield',
        'missile_interceptor',
        'emp_grid',
        'early_warning',
      ];
    case 5:
    default:
      // Đô Đốc: đội hình tối ưu 10 kỹ năng đa lớp
      return [
        'sonar_ping',
        'recon_drone',
        'air_strike',
        'armor_piercing',
        'heavy_artillery',
        'emp_jamming',
        'frequency_restore',
        'ciws',
        'improved_ammo',
        'reinforced_armor',
      ];
  }
}
