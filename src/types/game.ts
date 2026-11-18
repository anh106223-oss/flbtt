export type GameScreen = 'TITLE' | 'SETUP' | 'PLACEMENT' | 'BATTLE' | 'VICTORY';

export type GameMode = 'VS_AI' | 'PASS_AND_PLAY';

export type BattleGoal = 'ANNIHILATION' | 'FLAGSHIP_HUNT';

export type AIDifficulty = 1 | 2 | 3 | 4 | 5;

export type AIPlacementMode = 'RANDOM' | 'MANUAL';

export type FiringRule = 'SINGLE' | 'STREAK' | 'SALVO_3' | 'SALVO_5';

export type NationId =
  | 'VN'
  | 'US'
  | 'JP'
  | 'RU'
  | 'GB'
  | 'DE'
  | 'FR'
  | 'KR'
  | 'CN'
  | 'IT'
  | 'IN'
  | 'ES'
  | 'TR'
  | 'AU'
  | 'EXO';

export type FleetFormationId = 'NATIONAL' | 'CUSTOM';

export type ShapeCategory = 'LINEAR' | 'EXOTIC';

export type SkillCategory =
  | 'RECON'
  | 'STRIKE'
  | 'SUPPORT'
  | 'TRAP'
  | 'SHIELD'
  | 'MOVEMENT';

export type SkillId =
  // === 1. TRINH SÁT – RECONNAISSANCE (6 Chủ động · 3 Bị động) ===
  | 'flare_shell'           // 01. Pháo Sáng (CD 3)
  | 'sonar_ping'            // 02. Quét Sonar 3x3 (CD 4)
  | 'recon_plane'           // 03. Radar Tầm Xa (CD 5)
  | 'minesweeper'           // 04. Máy Quét Mìn 3x3 (CD 3)
  | 'directional_sonar'     // 05. Sonar Định Hướng 5 ô (CD 4)
  | 'recon_drone'           // 06. Drone Trinh Sát 4 ô (CD 4)
  | 'naval_allseeing_eye'   // 07. Mắt Thần Hải Quân (Bị động)
  | 'sweeping_frequency'    // 08. Tần Số Tảo Quét (Bị động)
  | 'signal_analysis'       // 09. Phân Tích Tín Hiệu (Bị động)

  // === 2. TẤN CÔNG – OFFENSIVE (6 Chủ động · 3 Bị động) ===
  | 'air_strike'            // 10. Không Kích (+) (CD 4)
  | 'torpedo_run'           // 11. Ngư Lôi Xuyên Phá 5 ô (CD 5)
  | 'artillery_barrage'     // 12. Pháo Kích Tầm Xa 4 ô (CD 4)
  | 'armor_piercing'        // 13. Đạn Xuyên Giáp (CD 5)
  | 'incendiary_shell'      // 14. Đạn Cháy Nổ Lớn (CD 4)
  | 'heavy_artillery'       // 15. Pháo Hạng Nặng Cỡ Lớn 2x2 Pending (CD 6)
  | 'primary_firepower'     // 16. Hỏa Lực Sơ Cấp (Bị động)
  | 'artillery_expert'      // 17. Chuyên Gia Pháo Binh (Bị động)
  | 'improved_ammo'         // 18. Đạn Dược Cải Tiến (Bị động)

  // === 3. HỖ TRỢ & SỬA CHỮA – SUPPORT & REPAIR (6 Chủ động · 3 Bị động) ===
  | 'emergency_repair'      // 19. Sửa Chữa Khẩn Cấp (CD 5)
  | 'radar_jammer'          // 20. Trạm Nhiễu Radar (CD 4)
  | 'emp_jamming'           // 21. Gây Nhiễu EMP (CD 5)
  | 'fire_suppression'      // 22. Hệ Thống Dập Lửa (CD 3)
  | 'frequency_restore'     // 23. Khôi Phục Tần Số (CD 4)
  | 'fleet_maintenance'     // 24. Bảo Trì Hạm Đội (CD 6)
  | 'strong_logistics'      // 25. Hậu Cần Vững Mạnh (Bị động)
  | 'self_repair_armor'     // 26. Giáp Tự Phục Hồi (Bị động)
  | 'naval_technician'      // 27. Kỹ Thuật Viên Hải Quân (Bị động)

  // === 4. BẪY & MỒI NHỬ – TRAPS & DECEPTION (6 Chủ động · 3 Bị động) ===
  | 'sea_mine'              // 28. Thủy Lôi Ngầm (CD 3)
  | 'salvo_3'               // 29. Mưa Đạn Dồn Dập 3 ô (CD 5)
  | 'follow_up_shot'        // 30. Bắn Bồi (CD 3)
  | 'ghost_fleet'           // 31. Hạm Đội Ảo Ảnh (CD 5)
  | 'emp_grid'              // 32. Lưới Điện Từ Ngầm 2x2 (CD 4)
  | 'info_fog'              // 33. Màn Sương Thông Tin (CD 6)
  | 'auto_decoy'            // 34. Mồi Nhử Tự Động (Bị động)
  | 'counter_mine'          // 35. Thủy Lôi Phản Kích (Bị động)
  | 'deception_tactics'     // 36. Chiến Thuật Nghi Binh (Bị động)

  // === 5. KHIÊN & ĐÁNH CHẶN – DEFENSE & INTERCEPTION (6 Chủ động · 3 Bị động) ===
  | 'energy_shield'         // 37. Khiên Năng Lượng (CD 4)
  | 'smoke_screen'          // 38. Màn Khói Ngụy Trang 3x3 (CD 4)
  | 'dome_shield'           // 39. Vòm Phòng Thủ Cục Bộ 2x2 (CD 4)
  | 'missile_interceptor'   // 40. Lưới Đánh Chặn Tên Lửa (CD 5)
  | 'reflective_shield'     // 41. Khiên Phản Xạ (CD 6)
  | 'airstrike_jammer'      // 42. Trạm Nhiễu Sóng Không Kích 3x3 (CD 5)
  | 'ciws'                  // 43. Hệ Thống CIWS (Bị động)
  | 'reinforced_armor'      // 44. Giáp Gia Cường (Bị động)
  | 'early_warning'         // 45. Cảnh Báo Sớm (Bị động)

  // === 6. ĐỊNH VỊ & ĐIỀU HƯỚNG – NAVIGATION & MANEUVER (6 Chủ động · 3 Bị động) ===
  | 'tidal_shockwave'       // 46. Sóng Xung Kích (CD 8)
  | 'rotate_ship'           // 47. Đổi Góc Hướng Tàu (CD 3)
  | 'strategic_relocation'  // 48. Cơ Động Chiến Lược (CD 5)
  | 'enemy_deviation'       // 49. Bẻ Lái Hướng Địch (CD 6)
  | 'formation_swap'        // 50. Tái Lập Đội Hình (CD 7)
  | 'tactical_evasion'      // 51. Né Tránh Chiến Thuật (CD 4)
  | 'deep_water_current'    // 52. Luồng Nước Sâu (Bị động)
  | 'formation_stability'   // 53. Ổn Định Đội Hình (Bị động)
  | 'hydrographic_map'      // 54. Bản Đồ Thủy Văn (Bị động)

  // === NÂNG CẤP +66 KỸ NĂNG (55–120): 11 KỸ NĂNG MỚI MỖI NHÁNH (8 CHỦ ĐỘNG + 3 BỊ ĐỘNG) ===
  // Nhánh 1 Mở rộng (55–65)
  | 'sonar_2x2'             // 55. Quét Sonar 2x2
  | 'deep_flare'            // 56. Pháo Sáng Xuyên Khói
  | 'diagonal_sweep'        // 57. Quét Chéo Chiến Thuật
  | 'enemy_mine_detector'   // 58. Dò Thủy Lôi Địch
  | 'flagship_tracker'      // 59. Định Vị Soái Hạm / Tàu Lớn
  | 'edge_patrol'           // 60. Tuần Tra Đường Biên
  | 'triangulate_scan'      // 61. Tam Giác Định Vị
  | 'satellite_snapshot'    // 62. Ảnh Vệ Tinh Tức Thời
  | 'hit_echo'              // 63. Dư Âm Va Chạm (Bị động)
  | 'sink_intel'            // 64. Khai Thác Hộp Đen (Bị động)
  | 'counter_jam_optics'    // 65. Quang Học Kháng Nhiễu (Bị động)

  // Nhánh 2 Mở rộng (66–76)
  | 'carpet_bomb'           // 66. Rải Thảm 3x3
  | 'cross_x_strike'        // 67. Không Kích Chữ X
  | 'railgun_pierce'        // 68. Pháo Điện Từ 6 Ô
  | 'cluster_missile'       // 69. Tên Lửa Chùm 2x2
  | 'execute_shot'          // 70. Phát Bắn Kết Liễu
  | 'shock_cannon'          // 71. Pháo Chấn Động
  | 'depth_charge'          // 72. Bom Chìm Phá Mìn
  | 'rapid_salvo_2'         // 73. Liên Thanh 2 Phát
  | 'armor_shredder'        // 74. Đạn Phá Giáp Thuần Túy (Bị động)
  | 'incendiary_mastery'    // 75. Chất Cháy Tăng Cường (Bị động)
  | 'critical_barrage'      // 76. Xạ Kích Chí Mạng (Bị động)

  // Nhánh 3 Mở rộng (77–87)
  | 'full_hull_overhaul'    // 77. Đại Tu Thân Tàu
  | 'flagship_overcharge'   // 78. Tiếp Viện Soái Hạm
  | 'rock_demolition'       // 79. Công Binh Phá Đá
  | 'cooldown_surge'        // 80. Xung Nhịp Hồi Chiêu
  | 'ammo_boost'            // 81. Nạp Đạn Cao Áp
  | 'emp_purge_aura'        // 82. Tường Lửa Chống EMP
  | 'combat_surge'          // 83. Lệnh Tổng Tiến Công
  | 'sonar_calibration'     // 84. Hiệu Chuẩn Radar
  | 'flagship_aegis_passive'// 85. Cơ Khí Soái Hạm (Bị động)
  | 'fireproof_bulkhead'    // 86. Vách Ngăn Chống Cháy (Bị động)
  | 'tactical_reserve'      // 87. Dự Bị Chiến Thuật (Bị động)

  // Nhánh 4 Mở rộng (88–98)
  | 'minefield_line'        // 88. Bãi Thủy Lôi 3 Ô
  | 'magnetic_mine'         // 89. Thủy Lôi Từ Tính
  | 'decoy_flagship'        // 90. Tàu Mồi Soái Hạm
  | 'emp_mine_single'       // 91. Bẫy EMP Đơn Điểm
  | 'false_log_spoof'       // 92. Nhiễu Tọa Độ Diễn Biến
  | 'trap_salvo_2'          // 93. Phục Kích 2 Hướng
  | 'siren_beacon'          // 94. Phao Sóng Giả
  | 'ambush_mark'           // 95. Đánh Dấu Phục Kích
  | 'mine_replenish'        // 96. Tái Tạo Thủy Lôi (Bị động)
  | 'phantom_echo_passive'  // 97. Bóng Ma Ra-đa (Bị động)
  | 'sabotage_mine'         // 98. Thủy Lôi Phá Hoại (Bị động)

  // Nhánh 5 Mở rộng (99–109)
  | 'fleet_smoke_wall'      // 99. Bức Tường Khói 5 Ô
  | 'flagship_bunker'       // 100. Hầm Bọc Thép Soái Hạm
  | 'aegis_dome_3x3'        // 101. Vòm Aegis 3x3
  | 'mirror_barrier'        // 102. Lớp Giáp Phản Chiếu
  | 'torpedo_net'           // 103. Lưới Chặn Ngư Lôi
  | 'reactive_smoke'        // 104. Khói Phản Ứng Nhanh
  | 'kevlar_bulkhead'       // 105. Gia Cố Giáp Tức Thời
  | 'emp_deflector'         // 106. Màn Chắn Điện Từ
  | 'first_turn_aegis'      // 107. Sẵn Sàng Chiến Đấu (Bị động)
  | 'smoke_affinity'        // 108. Chuyên Gia Ngụy Trang (Bị động)
  | 'reactive_hull_passive' // 109. Thân Tàu Phản Lực (Bị động)

  // Nhánh 6 Mở rộng (110–120)
  | 'turbo_dash_2'          // 110. Tăng Tốc 2 Ô
  | 'flip_ship_180'         // 111. Xoay Đầu Tàu 180°
  | 'fleet_drift_shift'     // 112. Hải Lưu Dịch Hạm
  | 'decoy_swap'            // 113. Hoán Đổi Ảnh Giả
  | 'crosswind_push'        // 114. Gió Ngang Đẩy Địch
  | 'mine_relocate'         // 115. Dời Thủy Lôi
  | 'evasive_maneuver_all'  // 116. Báo Động Cơ Động
  | 'reposition_flagship'   // 117. Di Chuyển Khẩn Soái Hạm
  | 'afterimage_trail'      // 118. Ảnh Ảo Đường Chạy (Bị động)
  | 'tailwind_propulsion'   // 119. Thuận Gió Đẩy Thuyền (Bị động)
  | 'rock_navigator';       // 120. Hoa Tiêu Đá Ngầm (Bị động)

export type SkillTargetMode =
  | 'INSTANT'
  | 'ENEMY_CELL'
  | 'ENEMY_2_CELLS'
  | 'ENEMY_3_CELLS'
  | 'ENEMY_2X2'
  | 'ENEMY_CROSS'
  | 'ENEMY_X'
  | 'ENEMY_3X3'
  | 'ENEMY_CONE'
  | 'ENEMY_DIAG'
  | 'ENEMY_LINE'
  | 'ENEMY_LINE_4'
  | 'ENEMY_LINE_6'
  | 'ENEMY_FULL_LINE'
  | 'ENEMY_SHIP_DIR'
  | 'OWN_CELL'
  | 'OWN_2X2'
  | 'OWN_3X3'
  | 'OWN_SHIP'
  | 'OWN_SEGMENT'
  | 'OWN_SHIP_DIR'
  | 'OWN_TWO_SHIPS';

export type CardinalDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface SkillDefinition {
  id: SkillId;
  code: number; // 1..120
  name: string;
  category: SkillCategory;
  kind: 'ACTIVE' | 'PASSIVE';
  targetMode: SkillTargetMode;
  cooldown: number;
  maxUses: number;
  shortDesc: string;
}

export interface Coord {
  r: number;
  c: number;
}

export type RelativeOffset = [number, number]; // [dr, dc]

export interface ShipTemplate {
  id: string;
  name: string;
  shortName: string;
  category: ShapeCategory;
  offsets: RelativeOffset[];
  isExotic?: boolean;
  isFlagship?: boolean;
}

export interface NationProfile {
  id: NationId;
  name: string;
  navyName: string;
  hullPrimary: string;
  hullSecondary: string;
  deckAccent: string;
  trimColor: string;
  stripeColor: string;
  signatureFleetName: string;
  signatureShipIds: string[];
  nationalShipNames: Record<string, string>;
}

export interface PlacedShip {
  instanceId: string;
  templateId: string;
  name: string;
  offsets: RelativeOffset[]; // rotated offsets normalized to (0,0)
  anchor: Coord;
  cells: Coord[];
  rotation: 0 | 90 | 180 | 270;
  hits: string[]; // "r,c" keys of destroyed segments
  sunk: boolean;
  isFlagship?: boolean;
  armorMax?: number;
  armorRemaining?: number;
  segmentHp?: Record<string, number>; // "r,c" -> remaining HP per segment
  segmentMaxHp?: Record<string, number>; // "r,c" -> max HP per segment
}

export type ShotResultStatus = 'miss' | 'hit' | 'armor' | 'sunk' | 'rock';

export type MapMode = 'OPEN_SEA' | 'CUSTOM_HAZARDS';

export interface PlayerSetup {
  id: 'P1' | 'P2';
  name: string;
  nationId: NationId;
  formationId: FleetFormationId;
  customShipIds: string[];
  bonusShipIds?: string[]; // Tàu phụ thêm tự do vào đội hình Mặc định (không giới hạn số tàu, tổng <= 74 ô)
  flagshipIndex?: number; // Vị trí tàu được người chơi chọn làm Soái Hạm
  skillIds: SkillId[];
  rocks: string[]; // up to 8 "r,c" 1x1 rock obstacles
  mapMines: string[]; // up to 8 "r,c" 1x1 hidden map sea mines
}

export type OceanEventId =
  | 'SATELLITE_UPLINK'
  | 'MAELSTROM_VORTEX'
  | 'FUEL_LEAK'
  | 'DENSE_FOG'
  | 'SUDDEN_STORM'
  | 'SOLAR_FLARE_EMP'
  | 'CURRENT_DRIFT';

export interface OceanEventDefinition {
  id: OceanEventId;
  name: string;
  badge: string;
  shortDesc: string;
  accentColor: 'cyan' | 'violet' | 'amber' | 'slate' | 'indigo' | 'rose' | 'teal';
}

export interface ScheduledOceanEvent {
  id: OceanEventId;
  triggerTurn: number;
  triggerSide: 'P1' | 'P2';
  targetBoard: 'P1' | 'P2' | 'BOTH';
  triggered: boolean;
}

export interface SatelliteRevealZone {
  id: string;
  topR: number;
  leftC: number;
  expiresTurn: number;
}

export interface StormZone {
  id: string;
  topR: number;
  leftC: number;
  expiresTurn: number;
}

export interface FuelLeakZone {
  id: string;
  cells: Coord[];
  expiresTurn: number;
}

export interface MaelstromCell {
  r: number;
  c: number;
  expiresTurn: number;
}

export interface PendingHeavyStrike {
  id: string;
  topR: number;
  leftC: number;
  triggerTurn: number;
  targetBoard: 'P1' | 'P2';
}

export interface EmpGridTrap {
  id: string;
  topR: number;
  leftC: number;
  size?: number;
}

export interface AreaEffectZone {
  id: string;
  topR: number;
  leftC: number;
  size: number;
  expiresTurn: number;
}

export interface GameRules {
  mode: GameMode;
  battleGoal: BattleGoal;
  mapMode: MapMode;
  randomEventsEnabled: boolean;
  aiDifficulty: AIDifficulty;
  aiPlacementMode: AIPlacementMode;
  firingRule: FiringRule;
  noTouch: boolean;
  autoBalanceAI: boolean;
}

export interface SonarZone {
  id: string;
  cells: Coord[];
  detected: boolean;
  shipCellsFound: number;
  label: string;
  expiresTurn: number;
}

export interface ReconLineScan {
  id: string;
  axis: 'ROW' | 'COL';
  index: number;
  shipCellsFound: number;
  expiresTurn: number;
}

export interface PlayerBattleState {
  setup: PlayerSetup;
  ships: PlacedShip[];
  receivedShots: Record<string, ShotResultStatus>;
  totalShotsReceived: number;
  totalHitsReceived: number;
  rocks: string[]; // "r,c" impassable 1x1 rock obstacles
  hiddenMapMines: string[]; // un-triggered pre-battle hidden map mines (never shown to board owner)
  initialLogs?: BattleLogEntry[];
  // Active & Passive Tactical States
  shieldedShipIds: string[];
  reflectiveShieldShipIds: string[];
  evasionProtectedShipIds: string[];
  smokeCells: Record<string, number>; // "r,c" -> remaining opponent turns
  domeShieldCells: Record<string, number>; // "r,c" -> remaining opponent turns
  airstrikeJamZones: AreaEffectZone[]; // 3x3 zones blocking air_strike / heavy_artillery
  empGrids: EmpGridTrap[]; // hidden 2x2 EMP traps on own waters
  mines: string[]; // "r,c" tactical sea mines planted on own waters
  decoys: string[]; // "r,c" radar decoys
  decoyExpiry: Record<string, number>; // "r,c" -> expiry turn
  revealedShipIds: string[]; // ship IDs exposed to attacker
  revealedCells: string[]; // individual cells exposed via flare / drone / allseeing eye
  revealedMineCells: string[]; // enemy mines spotted by recon
  signalAnalysisRecords: Record<string, string[]>; // shipId -> discovered keys snapshot
  burningCells: Record<string, { shipId: string; turnsLeft: number }>; // burn DoT segments
  empLockedTurns: number;
  empImmunityTurns: number;
  radarJamTurns: number;
  interceptorReady: boolean;
  followUpReady: boolean;
  improvedAmmoReady: boolean;
  ciwsReady: boolean;
  noDamageStreakTurns: number;
  tookDamageLastTurn: boolean;
  infoFogTurns: number; // opponent turns while new history/coords are hidden
  hiddenHitMarks: Record<string, number>; // "r,c" -> expiresTurn (Mồi Nhử Tự Động)
  jammedTiles: Record<string, number>; // "r,c" -> expiresTurn (Thủy Lôi Phản Kích)
  skillCooldowns: Record<string, number>;
  skillUsesLeft: Record<string, number>;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  attackerSide?: 'P1' | 'P2';
  attackerName: string;
  attackerNation: NationId;
  coordLabel: string;
  result: ShotResultStatus | 'skill' | 'event';
  sunkShipName?: string;
  detail?: string;
  hiddenFromSide?: 'P1' | 'P2';
  hiddenUntilTurn?: number;
}
