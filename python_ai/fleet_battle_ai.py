#!/usr/bin/env python3
"""
Fleet Battle AI Engine (Standalone Python 3 for VS Code)
========================================================
Bàn cờ 18x18 (A-R, 1-18), 69 dáng tàu (tối đa 8 ô), mặc định ~60 ô/tối đa 80 ô,
15 hạm đội quốc gia, bản đồ 8 đá 1x1 + 8 thủy lôi 1x1 ẩn, cân bằng số tàu AI, và 5 cấp độ AI.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Set, Tuple

Coord = Tuple[int, int]  # (row, col) trong bảng 18x18

GRID_SIZE = 18
COL_LABELS = "ABCDEFGHIJKLMNOPQR"
MAX_CUSTOM_CELLS = 80

# 69 dáng chiến hạm (8 dáng thẳng + 61 dáng dị hình tới 8 ô)
SHIP_CATALOG: Dict[str, List[Coord]] = {
    "patrol_1": [(0, 0)],
    "destroyer_2": [(0, 0), (0, 1)],
    "frigate_3": [(0, 0), (0, 1), (0, 2)],
    "cruiser_4": [(0, 0), (0, 1), (0, 2), (0, 3)],
    "carrier_5": [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4)],
    "supercarrier_6": [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5)],
    "leviathan_7": [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6)],
    "behemoth_8": [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6), (0, 7)],
    "v_interceptor_3": [(0, 0), (1, 0), (1, 1)],
    "diagonal_3": [(0, 0), (1, 1), (2, 2)],
    "diag_4": [(0, 0), (1, 1), (2, 2), (3, 3)],
    "t_trimaran_4": [(0, 0), (0, 1), (0, 2), (1, 1)],
    "z_stealth_4": [(0, 0), (0, 1), (1, 1), (1, 2)],
    "j_corvette_4": [(0, 1), (1, 1), (2, 0), (2, 1)],
    "bunker_2x2": [(0, 0), (0, 1), (1, 0), (1, 1)],
    "diag_zig_4": [(0, 0), (1, 1), (1, 2), (2, 3)],
    "l_carrier_5": [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1)],
    "u_catamaran_5": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2)],
    "cross_bastion_5": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1)],
    "w_step_5": [(0, 0), (1, 0), (1, 1), (2, 1), (2, 2)],
    "f_flagship_5": [(0, 1), (0, 2), (1, 0), (1, 1), (2, 1)],
    "p_bastion_5": [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0)],
    "y_trident_5": [(0, 0), (0, 2), (1, 1), (2, 1), (3, 1)],
    "x_wing_5": [(0, 0), (0, 2), (1, 1), (2, 0), (2, 2)],
    "lightning_5": [(0, 0), (1, 0), (1, 1), (2, 1), (3, 1)],
    "t_long_5": [(0, 0), (0, 1), (0, 2), (1, 1), (2, 1)],
    "c_hook_5": [(0, 0), (0, 1), (1, 0), (2, 0), (2, 1)],
    "fork_5": [(0, 0), (0, 2), (1, 0), (1, 1), (2, 1)],
    "claw_5": [(0, 1), (1, 0), (1, 2), (2, 0), (2, 2)],
    "wing_v_5": [(0, 0), (1, 1), (2, 2), (1, 3), (0, 4)],
    "arrow_5": [(0, 2), (1, 0), (1, 1), (2, 1), (2, 2)],
    "pincer_dread_6": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2), (2, 1)],
    "dock_carrier_6": [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)],
    "axe_dread_6": [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (2, 0)],
    "scorpion_6": [(0, 0), (0, 2), (1, 0), (1, 1), (2, 1), (2, 2)],
    "anchor_6": [(0, 1), (1, 1), (2, 0), (2, 1), (2, 2), (3, 1)],
    "snake_6": [(0, 0), (0, 1), (1, 1), (1, 2), (2, 2), (2, 3)],
    "twin_wing_6": [(0, 0), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3)],
    "ring_c_6": [(0, 0), (0, 1), (1, 0), (2, 0), (3, 0), (3, 1)],
    "hammer_6": [(0, 0), (0, 1), (0, 2), (1, 1), (2, 1), (3, 1)],
    "diamond_6": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 0), (2, 2)],
    "cross_asym_6": [(0, 1), (1, 0), (1, 1), (1, 2), (1, 3), (2, 2)],
    "s_curve_6": [(0, 1), (0, 2), (1, 1), (2, 1), (3, 0), (3, 1)],
    "arch_gate_6": [(0, 1), (0, 2), (1, 0), (1, 3), (2, 0), (2, 3)],
    "pinwheel_6": [(0, 0), (0, 1), (1, 1), (1, 2), (2, 1), (2, 2)],
    "twin_hull_7": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 2)],
    "trident_7": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2), (2, 1), (3, 1)],
    "cross_heavy_7": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1), (3, 0), (3, 2)],
    "spiral_7": [(0, 0), (0, 1), (0, 2), (1, 2), (2, 0), (2, 1), (2, 2)],
    "fortress_wing_7": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 0), (2, 2), (3, 1)],
    "manta_7": [(0, 2), (1, 1), (1, 2), (1, 3), (2, 0), (2, 2), (2, 4)],
    "harbor_7": [(0, 0), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3), (2, 1)],
    "dragon_7": [(0, 0), (0, 1), (1, 1), (1, 2), (2, 2), (2, 3), (3, 3)],
    "bunker_u_7": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1)],
    "star_7": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1), (2, 2), (3, 1)],
    "double_z_7": [(0, 0), (0, 1), (1, 1), (1, 2), (1, 3), (2, 3), (2, 4)],
    "double_hull_8": [(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3)],
    "citadel_ring_8": [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (2, 0), (2, 1), (2, 2)],
    "crown_8": [(0, 0), (0, 2), (0, 4), (1, 0), (1, 1), (1, 2), (1, 3), (1, 4)],
    "super_cross_8": [(0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (1, 3), (2, 1), (2, 2)],
    "twin_trident_8": [(0, 0), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3), (2, 0), (2, 3)],
    "x_dreadnought_8": [(0, 0), (0, 3), (1, 1), (1, 2), (2, 1), (2, 2), (3, 0), (3, 3)],
    "scorpion_king_8": [(0, 0), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3), (2, 1), (2, 2)],
    "hydra_8": [(0, 0), (0, 1), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2), (3, 2)],
    "anchor_titan_8": [(0, 1), (0, 2), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2), (2, 3)],
    "phoenix_8": [(0, 2), (1, 0), (1, 1), (1, 2), (1, 3), (1, 4), (2, 1), (2, 3)],
    "zigzag_titan_8": [(0, 0), (0, 1), (1, 1), (1, 2), (2, 2), (2, 3), (3, 3), (3, 4)],
    "arch_fortress_8": [(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 3), (2, 0), (2, 3)],
    "blade_star_8": [(0, 1), (0, 2), (1, 0), (1, 3), (2, 0), (2, 3), (3, 1), (3, 2)],
}

SHIP_DISPLAY_NAMES: Dict[str, str] = {
    "patrol_1": "Tuần Tra (1 ô)",
    "destroyer_2": "Khu Trục (2 ô)",
    "frigate_3": "Hộ Vệ (3 ô)",
    "cruiser_4": "Tuần Dương (4 ô)",
    "carrier_5": "Mẫu Hạm (5 ô)",
    "supercarrier_6": "Siêu Mẫu Hạm (6 ô)",
    "leviathan_7": "Thiết Giáp Leviathan (7 ô)",
    "behemoth_8": "Đại Soái Hạm Behemoth (8 ô)",
    "v_interceptor_3": "Góc V (3 ô)",
    "diagonal_3": "Chéo (3 ô)",
    "diag_4": "Chéo (4 ô)",
    "t_trimaran_4": "Chữ T (4 ô)",
    "z_stealth_4": "Chữ Z (4 ô)",
    "j_corvette_4": "Chữ J (4 ô)",
    "bunker_2x2": "Vuông 2×2 (4 ô)",
    "diag_zig_4": "Gãy Chéo (4 ô)",
    "l_carrier_5": "Chữ L (5 ô)",
    "u_catamaran_5": "Chữ U (5 ô)",
    "cross_bastion_5": "Chữ Thập + (5 ô)",
    "w_step_5": "Chữ W (5 ô)",
    "f_flagship_5": "Chữ F (5 ô)",
    "p_bastion_5": "Chữ P (5 ô)",
    "y_trident_5": "Đinh Ba Y (5 ô)",
    "x_wing_5": "Cánh X (5 ô)",
    "lightning_5": "Tia Chớp (5 ô)",
    "t_long_5": "T Dài (5 ô)",
    "c_hook_5": "Chữ C (5 ô)",
    "fork_5": "Chĩa Ba (5 ô)",
    "claw_5": "Càng Kẹp (5 ô)",
    "wing_v_5": "Cánh V (5 ô)",
    "arrow_5": "Mũi Tên (5 ô)",
    "pincer_dread_6": "Càng Cua (6 ô)",
    "dock_carrier_6": "Sân Bay 2×3 (6 ô)",
    "axe_dread_6": "Rìu Thép (6 ô)",
    "scorpion_6": "Bọ Cạp (6 ô)",
    "anchor_6": "Mỏ Neo (6 ô)",
    "snake_6": "Rắn Ziczac (6 ô)",
    "twin_wing_6": "Song Dực (6 ô)",
    "ring_c_6": "Vòng Cung (6 ô)",
    "hammer_6": "Búa Tạ (6 ô)",
    "diamond_6": "Kim Cương (6 ô)",
    "cross_asym_6": "Thập Lệch (6 ô)",
    "s_curve_6": "Uốn S (6 ô)",
    "arch_gate_6": "Vòm Cổng (6 ô)",
    "pinwheel_6": "Chong Chóng (6 ô)",
    "twin_hull_7": "Song Thân H (7 ô)",
    "trident_7": "Đại Đinh Ba (7 ô)",
    "cross_heavy_7": "Thập Tự (7 ô)",
    "spiral_7": "Xoắn Ốc (7 ô)",
    "fortress_wing_7": "Cánh Dơi (7 ô)",
    "manta_7": "Cá Đuối (7 ô)",
    "harbor_7": "Chữ U Dài (7 ô)",
    "dragon_7": "Rồng Biển (7 ô)",
    "bunker_u_7": "Móng Ngựa (7 ô)",
    "star_7": "Sao Biển (7 ô)",
    "double_z_7": "Z Kép (7 ô)",
    "double_hull_8": "Song Thân 2×4 (8 ô)",
    "citadel_ring_8": "Vòng Khép 3×3 (8 ô)",
    "crown_8": "Vương Miện (8 ô)",
    "super_cross_8": "Đại Thập Tự Kép (8 ô)",
    "twin_trident_8": "Chữ H Dài (8 ô)",
    "x_dreadnought_8": "Cánh X Đại (8 ô)",
    "scorpion_king_8": "Vua Bọ Cạp (8 ô)",
    "hydra_8": "Đa Đầu Hydra (8 ô)",
    "anchor_titan_8": "Mỏ Neo Titan (8 ô)",
    "phoenix_8": "Phượng Hoàng Lửa (8 ô)",
    "zigzag_titan_8": "Mãng Xà Titan (8 ô)",
    "arch_fortress_8": "Quân Cảng Vòm Thép (8 ô)",
    "blade_star_8": "Phi Tiêu V Kép (8 ô)",
}

# 15 Hạm đội quốc gia mặc định (~60 ô mỗi nước)
NATIONAL_FLEETS: Dict[str, Tuple[str, List[str]]] = {
    "1": ("Việt Nam — Hạm Đội Biển Đông (62 ô)", ["trident_7", "anchor_6", "pincer_dread_6", "y_trident_5", "l_carrier_5", "carrier_5", "t_trimaran_4", "z_stealth_4", "cruiser_4", "bunker_2x2", "frigate_3", "v_interceptor_3", "frigate_3", "destroyer_2", "patrol_1"]),
    "2": ("Hoa Kỳ — Nhóm Tác Chiến Nimitz (60 ô)", ["twin_hull_7", "dock_carrier_6", "dock_carrier_6", "u_catamaran_5", "carrier_5", "t_long_5", "z_stealth_4", "cruiser_4", "cruiser_4", "j_corvette_4", "frigate_3", "v_interceptor_3", "destroyer_2", "destroyer_2"]),
    "3": ("Nhật Bản — Hạm Đội Yokosuka (59 ô)", ["fortress_wing_7", "twin_wing_6", "ring_c_6", "l_carrier_5", "c_hook_5", "f_flagship_5", "j_corvette_4", "t_trimaran_4", "cruiser_4", "bunker_2x2", "frigate_3", "v_interceptor_3", "destroyer_2", "patrol_1"]),
    "4": ("Nga — Bão Thép Phương Bắc (60 ô)", ["cross_heavy_7", "twin_wing_6", "axe_dread_6", "cross_bastion_5", "p_bastion_5", "carrier_5", "bunker_2x2", "cruiser_4", "z_stealth_4", "diag_4", "frigate_3", "diagonal_3", "destroyer_2", "destroyer_2"]),
    "5": ("Anh Quốc — Hải Quân Hoàng Gia (60 ô)", ["twin_hull_7", "fortress_wing_7", "anchor_6", "p_bastion_5", "u_catamaran_5", "t_long_5", "t_trimaran_4", "cruiser_4", "bunker_2x2", "j_corvette_4", "frigate_3", "frigate_3", "destroyer_2", "patrol_1"]),
    "6": ("Đức — Thiết Giáp Baltic (59 ô)", ["axe_dread_6", "axe_dread_6", "scorpion_6", "w_step_5", "lightning_5", "cross_bastion_5", "bunker_2x2", "z_stealth_4", "cruiser_4", "diag_4", "v_interceptor_3", "frigate_3", "destroyer_2", "destroyer_2"]),
    "7": ("Pháp — Địa Trung Hải (60 ô)", ["spiral_7", "ring_c_6", "twin_wing_6", "f_flagship_5", "lightning_5", "c_hook_5", "z_stealth_4", "t_trimaran_4", "cruiser_4", "j_corvette_4", "frigate_3", "v_interceptor_3", "destroyer_2", "patrol_1", "patrol_1"]),
    "8": ("Hàn Quốc — Lá Chắn Sejong (60 ô)", ["trident_7", "pincer_dread_6", "dock_carrier_6", "carrier_5", "y_trident_5", "l_carrier_5", "diag_4", "j_corvette_4", "z_stealth_4", "cruiser_4", "frigate_3", "diagonal_3", "destroyer_2", "destroyer_2"]),
    "9": ("Trung Quốc — Biên Đội Phúc Kiến (59 ô)", ["trident_7", "dock_carrier_6", "twin_wing_6", "t_long_5", "carrier_5", "u_catamaran_5", "cruiser_4", "cruiser_4", "t_trimaran_4", "bunker_2x2", "frigate_3", "frigate_3", "destroyer_2", "patrol_1"]),
    "10": ("Ý (Italia) — Hạm Đội Cavour (60 ô)", ["anchor_6", "ring_c_6", "scorpion_6", "l_carrier_5", "f_flagship_5", "p_bastion_5", "t_trimaran_4", "z_stealth_4", "bunker_2x2", "j_corvette_4", "frigate_3", "v_interceptor_3", "destroyer_2", "destroyer_2", "patrol_1"]),
    "11": ("Ấn Độ — Ấn Độ Dương (60 ô)", ["cross_heavy_7", "trident_7", "pincer_dread_6", "u_catamaran_5", "w_step_5", "y_trident_5", "cruiser_4", "t_trimaran_4", "diag_4", "bunker_2x2", "frigate_3", "diagonal_3", "destroyer_2", "patrol_1"]),
    "12": ("Tây Ban Nha — Hạm Đội Armada (59 ô)", ["scorpion_6", "anchor_6", "snake_6", "c_hook_5", "l_carrier_5", "p_bastion_5", "cruiser_4", "bunker_2x2", "z_stealth_4", "j_corvette_4", "frigate_3", "v_interceptor_3", "destroyer_2", "destroyer_2"]),
    "13": ("Thổ Nhĩ Kỳ — Hạm Đội Anadolu (59 ô)", ["snake_6", "ring_c_6", "axe_dread_6", "f_flagship_5", "lightning_5", "w_step_5", "j_corvette_4", "t_trimaran_4", "bunker_2x2", "cruiser_4", "diagonal_3", "frigate_3", "destroyer_2", "patrol_1", "patrol_1"]),
    "14": ("Úc — Nam Thái Bình Dương (59 ô)", ["fortress_wing_7", "dock_carrier_6", "pincer_dread_6", "y_trident_5", "t_long_5", "carrier_5", "z_stealth_4", "cruiser_4", "diag_4", "t_trimaran_4", "frigate_3", "v_interceptor_3", "destroyer_2", "patrol_1"]),
    "15": ("Liên Minh Dị Hình (61 ô)", ["spiral_7", "cross_heavy_7", "fortress_wing_7", "pincer_dread_6", "scorpion_6", "snake_6", "x_wing_5", "cross_bastion_5", "y_trident_5", "diag_4", "diagonal_3"]),
}

AI_DIFFICULTY_SKILLS: Dict[int, List[str]] = {
    1: ["Pháo kích Tầm xa", "Pháo sáng", "Tín hiệu Giả", "Màn khói Ngụy trang", "Mưa đạn Dồn dập"],
    2: ["Radar Vệ Tinh", "Pháo kích Tầm xa", "Sửa chữa Khẩn cấp", "Thủy lôi Ngầm", "Khiên Năng lượng"],
    3: ["Pháo sáng", "Ngư lôi Xuyên phá", "Đạn Xuyên Giáp", "Màn khói Ngụy trang", "Hải Lưu Đảo Chiều"],
    4: ["Quét Sonar", "Không kích (+)", "Gây nhiễu EMP", "Trạm Nhiễu Radar", "Vòm Phòng Thủ Cục Bộ"],
    5: ["Quét Sonar", "Không kích (+)", "Đạn Xuyên Giáp", "Giáp Phản lực", "Phòng không CIWS"],
}


def build_balanced_ai_fleet(player_fleet: Sequence[str]) -> List[str]:
    """Tạo đội hình AI ngẫu nhiên cân bằng số tàu và tổng số ô với người chơi."""
    by_size: Dict[int, List[str]] = {}
    for sid, cells in SHIP_CATALOG.items():
        by_size.setdefault(len(cells), []).append(sid)
    return [random.choice(by_size[len(SHIP_CATALOG[ps])]) for ps in player_fleet]


def normalize_shape(cells: Sequence[Coord]) -> Tuple[Coord, ...]:
    min_r = min(r for r, _ in cells)
    min_c = min(c for _, c in cells)
    return tuple(sorted((r - min_r, c - min_c) for r, c in cells))


def rotate_90(cells: Sequence[Coord]) -> Tuple[Coord, ...]:
    return normalize_shape([(c, -r) for r, c in cells])


def all_orientations(cells: Sequence[Coord]) -> List[Tuple[Coord, ...]]:
    seen: Set[Tuple[Coord, ...]] = set()
    cur = normalize_shape(cells)
    for _ in range(4):
        seen.add(cur)
        cur = rotate_90(cur)
    return list(seen)


@dataclass
class Ship:
    ship_id: str
    name: str
    cells: Set[Coord]
    hits: Set[Coord] = field(default_factory=set)
    is_flagship: bool = False
    armor_remaining: int = 0

    @property
    def is_sunk(self) -> bool:
        return self.hits == self.cells


class FleetBoard:
    def __init__(
        self,
        no_touch: bool = True,
        flagship_hunt: bool = False,
        rocks: Optional[Set[Coord]] = None,
        map_mines: Optional[Set[Coord]] = None,
    ) -> None:
        self.no_touch = no_touch
        self.flagship_hunt = flagship_hunt
        self.rocks: Set[Coord] = set(rocks or set())
        self.map_mines: Set[Coord] = set(map_mines or set())
        self.ships: List[Ship] = []
        self.occupied: Dict[Coord, Ship] = {}
        self.shots: Dict[Coord, str] = {}

    def generate_random_hazards(self, rock_count: int = 8, mine_count: int = 8) -> None:
        coords = [(r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)]
        random.shuffle(coords)
        self.rocks = set(coords[:rock_count])
        self.map_mines = set(coords[rock_count : rock_count + mine_count])

    def can_place(self, shape: Sequence[Coord], top_r: int, left_c: int) -> bool:
        target_cells: List[Coord] = []
        for dr, dc in shape:
            r, c = top_r + dr, left_c + dc
            if not (0 <= r < GRID_SIZE and 0 <= c < GRID_SIZE):
                return False
            if (r, c) in self.rocks or (r, c) in self.occupied:
                return False
            target_cells.append((r, c))

        if self.no_touch:
            for r, c in target_cells:
                for nr in range(r - 1, r + 2):
                    for nc in range(c - 1, c + 2):
                        if (nr, nc) in self.occupied:
                            return False
        return True

    def place_randomly(self, ship_ids: Sequence[str], avoid_mines: bool = False) -> bool:
        self.ships.clear()
        self.occupied.clear()
        ordered = sorted(ship_ids, key=lambda sid: len(SHIP_CATALOG[sid]), reverse=True)
        for sid in ordered:
            orients = all_orientations(SHIP_CATALOG[sid])
            candidates: List[Tuple[Tuple[Coord, ...], int, int]] = []
            for shape in orients:
                for r in range(GRID_SIZE):
                    for c in range(GRID_SIZE):
                        if self.can_place(shape, r, c):
                            if avoid_mines and any((r + dr, c + dc) in self.map_mines for dr, dc in shape):
                                continue
                            candidates.append((shape, r, c))
            if not candidates and avoid_mines:
                for shape in orients:
                    for r in range(GRID_SIZE):
                        for c in range(GRID_SIZE):
                            if self.can_place(shape, r, c):
                                candidates.append((shape, r, c))
            if not candidates:
                return False
            shape, br, bc = random.choice(candidates)
            cells = {(br + dr, bc + dc) for dr, dc in shape}
            ship = Ship(ship_id=sid, name=SHIP_DISPLAY_NAMES.get(sid, sid), cells=cells)
            self.ships.append(ship)
            for cell in cells:
                self.occupied[cell] = ship

        if self.flagship_hunt and self.ships:
            flagship = next((s for s in self.ships if len(s.cells) == 6), None)
            if not flagship:
                flagship = next((s for s in self.ships if len(s.cells) == 5), None)
            if not flagship:
                flagship = max(self.ships, key=lambda s: len(s.cells))
            flagship.is_flagship = True
            flagship.armor_remaining = 3

        self.apply_initial_mine_overlaps()
        return True

    def apply_initial_mine_overlaps(self) -> List[Coord]:
        triggered: List[Coord] = []
        for ship in self.ships:
            overlap = ship.cells & self.map_mines
            if not overlap:
                continue
            for cell in overlap:
                self.map_mines.discard(cell)
                ship.hits.add(cell)
                triggered.append(cell)
                self.shots[cell] = "hit"
            if ship.is_sunk:
                for sc in ship.cells:
                    self.shots[sc] = "sunk"
        return triggered

    def receive_shot(self, coord: Coord) -> Tuple[str, Optional[Ship]]:
        existing = self.shots.get(coord)
        if existing and existing != "armor":
            return "already", None
        if coord in self.rocks:
            self.shots[coord] = "rock"
            return "rock", None
        ship = self.occupied.get(coord)
        if not ship:
            self.shots[coord] = "miss"
            return "miss", None
        if ship.armor_remaining > 0:
            ship.armor_remaining -= 1
            self.shots[coord] = "armor"
            return "armor", ship
        ship.hits.add(coord)
        if ship.is_sunk:
            for sc in ship.cells:
                self.shots[sc] = "sunk"
            return "sunk", ship
        self.shots[coord] = "hit"
        return "hit", ship

    def all_sunk(self) -> bool:
        if self.flagship_hunt:
            flagship = next((s for s in self.ships if s.is_flagship), None)
            if flagship:
                return flagship.is_sunk
        return all(s.is_sunk for s in self.ships)


class FleetBattleAI:
    MODE_NAMES = {
        1: "Cấp 1: Tân Binh (Ngẫu nhiên)",
        2: "Cấp 2: Tuần Tra (Bàn cờ Parity)",
        3: "Cấp 3: Săn Đuổi (Hunt & Target)",
        4: "Cấp 4: Chiến Thuật (Bản đồ xác suất)",
        5: "Cấp 5: Đô Đốc (Bayesian + Kỹ năng)",
    }

    def __init__(self, level: int = 5, no_touch: bool = True) -> None:
        self.level = max(1, min(5, level))
        self.no_touch = no_touch
        self.skills = AI_DIFFICULTY_SKILLS[self.level]

    def choose_shot(self, shots: Dict[Coord, str], remaining_ship_ids: Sequence[str]) -> Coord:
        available = [
            (r, c)
            for r in range(GRID_SIZE)
            for c in range(GRID_SIZE)
            if (r, c) not in shots or shots[(r, c)] == "armor"
        ]
        if not available:
            raise RuntimeError("Không còn ô trống để bắn!")

        if self.level == 1:
            return random.choice(available)

        armor_cells = [c for c in available if shots.get(c) == "armor"]
        if armor_cells and random.random() < (0.85 if self.level >= 4 else 0.6):
            return random.choice(armor_cells)

        blocked: Set[Coord] = set()
        if self.level >= 4 and self.no_touch:
            for (sr, sc), status in shots.items():
                if status == "sunk":
                    for nr in range(sr - 1, sr + 2):
                        for nc in range(sc - 1, sc + 2):
                            if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE:
                                blocked.add((nr, nc))

        valid_targets = [cell for cell in available if cell not in blocked] or available
        active_hits = [coord for coord, status in shots.items() if status in ("hit", "armor")]

        if self.level in (2, 3):
            if active_hits:
                target_candidates = self._get_target_candidates(active_hits, shots, valid_targets)
                if target_candidates:
                    return random.choice(target_candidates)
            if self.level == 2:
                checker = [c for c in valid_targets if (c[0] + c[1]) % 2 == 0]
                return random.choice(checker or valid_targets)
            scored = []
            for r, c in valid_targets:
                open_neighbors = sum(
                    1
                    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1))
                    if 0 <= r + dr < GRID_SIZE
                    and 0 <= c + dc < GRID_SIZE
                    and (r + dr, c + dc) not in shots
                )
                scored.append((open_neighbors * 2 + (1 if (r + c) % 2 == 0 else 0), (r, c)))
            max_score = max(s for s, _ in scored)
            return random.choice([cell for s, cell in scored if s == max_score])

        heatmap = self._compute_probability_map(
            shots=shots,
            blocked=blocked,
            active_hits=set(active_hits),
            remaining_ship_ids=remaining_ship_ids,
            use_admiralty_weights=(self.level == 5),
        )

        if self.level == 5 and active_hits:
            for r, c in active_hits:
                for dr, dc in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and (nr, nc) not in shots:
                        heatmap[nr][nc] += 0.5

        best_score = -1.0
        best_cells: List[Coord] = []
        min_len = min((len(SHIP_CATALOG[sid]) for sid in remaining_ship_ids), default=1)
        for cell in valid_targets:
            score = heatmap[cell[0]][cell[1]]
            if self.level == 5 and not active_hits and min_len >= 2 and (cell[0] + cell[1]) % 2 == 0:
                score *= 1.08
            if score > best_score + 1e-9:
                best_score = score
                best_cells = [cell]
            elif abs(score - best_score) <= 1e-9:
                best_cells.append(cell)
        return random.choice(best_cells or valid_targets)

    def _get_target_candidates(
        self, active_hits: List[Coord], shots: Dict[Coord, str], valid_targets: Sequence[Coord]
    ) -> List[Coord]:
        valid_set = set(valid_targets)
        if len(active_hits) >= 2:
            line_targets: List[Coord] = []
            hit_set = set(active_hits)
            for r, c in active_hits:
                for dr, dc in ((0, 1), (1, 0)):
                    if (r + dr, c + dc) in hit_set or (r - dr, c - dc) in hit_set:
                        for sign in (-1, 1):
                            cand = (r + sign * dr, c + sign * dc)
                            if cand in valid_set:
                                line_targets.append(cand)
            if line_targets:
                return line_targets
        adj: List[Coord] = []
        for r, c in active_hits:
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                cand = (r + dr, c + dc)
                if cand in valid_set and cand not in shots:
                    adj.append(cand)
        return adj

    def _compute_probability_map(
        self,
        shots: Dict[Coord, str],
        blocked: Set[Coord],
        active_hits: Set[Coord],
        remaining_ship_ids: Sequence[str],
        use_admiralty_weights: bool,
    ) -> List[List[float]]:
        heatmap = [[0.0 for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]
        impossible = {coord for coord, st in shots.items() if st in ("miss", "sunk", "rock")} | blocked

        for sid in remaining_ship_ids:
            for shape in all_orientations(SHIP_CATALOG[sid]):
                max_r = max(dr for dr, _ in shape)
                max_c = max(dc for _, dc in shape)
                for top_r in range(GRID_SIZE - max_r):
                    for left_c in range(GRID_SIZE - max_c):
                        cells = [(top_r + dr, left_c + dc) for dr, dc in shape]
                        if any(c in impossible for c in cells):
                            continue
                        hit_overlap = sum(1 for c in cells if c in active_hits)
                        if active_hits:
                            if hit_overlap == 0:
                                weight = 0.01 if use_admiralty_weights else 0.05
                            else:
                                weight = (16.0 ** hit_overlap) if use_admiralty_weights else (8.0 * hit_overlap)
                        else:
                            weight = 1.0
                        for r, c in cells:
                            if (r, c) not in shots:
                                heatmap[r][c] += weight
        return heatmap


def render_board(board: FleetBoard, hide_ships: bool = False) -> str:
    lines = ["   " + " ".join(COL_LABELS)]
    for r in range(GRID_SIZE):
        row_cells = []
        for c in range(GRID_SIZE):
            st = board.shots.get((r, c))
            if st == "sunk":
                row_cells.append("X")
            elif st == "armor":
                row_cells.append("A")
            elif st == "hit":
                row_cells.append("*")
            elif st == "rock":
                row_cells.append("^")
            elif st == "miss":
                row_cells.append("·")
            elif not hide_ships and (r, c) in board.rocks:
                row_cells.append("^")
            elif not hide_ships and (r, c) in board.map_mines:
                row_cells.append("!")
            elif not hide_ships and (r, c) in board.occupied:
                ship_obj = board.occupied[(r, c)]
                row_cells.append("@" if ship_obj.is_flagship else "#")
            else:
                row_cells.append("~")
        lines.append(f"{r + 1:2d} " + " ".join(row_cells))
    return "\n".join(lines)


def run_benchmark(rounds: int = 5) -> None:
    print(f"\n=== BENCHMARK 5 CẤP ĐỘ AI ({GRID_SIZE}x{GRID_SIZE} · ~60 Ô TÀU · {rounds} TRẬN/CẤP) ===")
    fleet = NATIONAL_FLEETS["1"][1]
    for level in range(1, 6):
        ai = FleetBattleAI(level=level, no_touch=True)
        turns_list: List[int] = []
        for _ in range(rounds):
            board = FleetBoard(no_touch=True)
            while not board.place_randomly(fleet):
                pass
            turns = 0
            while not board.all_sunk():
                remaining = [s.ship_id for s in board.ships if not s.is_sunk]
                shot = ai.choose_shot(board.shots, remaining)
                board.receive_shot(shot)
                turns += 1
            turns_list.append(turns)
        avg = sum(turns_list) / len(turns_list)
        print(f"  {ai.MODE_NAMES[level]:<42} | TB: {avg:5.1f} lượt | Skill: {', '.join(ai.skills)}")


def play_interactive_cli() -> None:
    print(f"\n=== FLEET BATTLE {GRID_SIZE}x{GRID_SIZE} — TERMINAL VS CODE ===")
    print("Chọn hạm đội quốc gia của bạn (1-15):")
    for key, (label, _) in NATIONAL_FLEETS.items():
        print(f"  {key:>2}. {label}")
    nat_choice = input("Nhập số (1-15, mặc định 1): ").strip() or "1"
    if nat_choice not in NATIONAL_FLEETS:
        nat_choice = "1"
    _, player_fleet = NATIONAL_FLEETS[nat_choice]

    ai_nat = random.choice([k for k in NATIONAL_FLEETS if k != nat_choice])
    ai_name, _ = NATIONAL_FLEETS[ai_nat]
    ai_fleet = build_balanced_ai_fleet(player_fleet)
    print(f"Đối thủ của bạn: {ai_name} (Cân bằng {len(ai_fleet)} tàu)")

    print("\nChọn mục tiêu chiến thắng:")
    print("  1. Hủy diệt toàn hạm đội")
    print("  2. Săn Soái Hạm (Flagship Hunt - Hạ Siêu Soái Hạm 5-6 ô là thắng ngay)")
    goal_choice = input("Nhập lựa chọn (1/2, mặc định 1): ").strip() or "1"
    flagship_hunt = goal_choice == "2"

    print("\nChọn chế độ bản đồ:")
    print(f"  1. Biển Mở Cổ Điển ({GRID_SIZE}x{GRID_SIZE})")
    print("  2. Bản Đồ Địa Hình (8 Đá 1x1 + 8 Thủy Lôi 1x1 ẩn)")
    map_choice = input("Nhập lựa chọn (1/2, mặc định 2): ").strip() or "2"
    use_hazards = map_choice == "2"

    print("\nChọn cấp độ AI (1-5):")
    for k, v in FleetBattleAI.MODE_NAMES.items():
        print(f"  {k}. {v}")
    try:
        level = int(input("Nhập cấp độ (mặc định 5): ").strip() or "5")
    except ValueError:
        level = 5
    level = max(1, min(5, level))

    player_board = FleetBoard(no_touch=True, flagship_hunt=flagship_hunt)
    ai_board = FleetBoard(no_touch=True, flagship_hunt=flagship_hunt)
    if use_hazards:
        player_board.generate_random_hazards(8, 8)
        ai_board.generate_random_hazards(8, 8)
    while not player_board.place_randomly(player_fleet):
        pass
    while not ai_board.place_randomly(ai_fleet):
        pass

    ai = FleetBattleAI(level=level, no_touch=True)
    turn = 1
    while not player_board.all_sunk() and not ai_board.all_sunk():
        print(f"\n--- LƯỢT {turn} ---")
        print(f"[{ai_name}]")
        print(render_board(ai_board, hide_ships=True))
        print("\n[Hạm đội Của Bạn]")
        print(render_board(player_board, hide_ships=False))

        raw = input("\nNhập tọa độ bắn (vd: E5, R18, hoặc 'q' thoát): ").strip().upper()
        if raw == "Q":
            print("Đã thoát trận đấu.")
            return
        if len(raw) < 2 or raw[0] not in COL_LABELS or not raw[1:].isdigit():
            print("Tọa độ không hợp lệ! Ví dụ hợp lệ: A1, H8, R18.")
            continue
        c = COL_LABELS.index(raw[0])
        r = int(raw[1:]) - 1
        if not (0 <= r < GRID_SIZE):
            print(f"Số hàng phải từ 1 đến {GRID_SIZE}.")
            continue

        res, ship = ai_board.receive_shot((r, c))
        if res == "already":
            print("Ô này đã bắn rồi, chọn ô khác!")
            continue
        print(f"Bạn bắn {raw}: {res.upper()}" + (f" ({ship.name} chìm!)" if res == "sunk" and ship else ""))
        if ai_board.all_sunk():
            print("\nCHÚC MỪNG! Bạn đã hoàn thành mục tiêu chiến thắng!")
            return

        remaining = [s.ship_id for s in player_board.ships if not s.is_sunk]
        ai_coord = ai.choose_shot(player_board.shots, remaining)
        ai_res, ai_ship = player_board.receive_shot(ai_coord)
        ai_label = f"{COL_LABELS[ai_coord[1]]}{ai_coord[0] + 1}"
        print(f"AI bắn {ai_label}: {ai_res.upper()}" + (f" ({ai_ship.name} của bạn chìm!)" if ai_res == "sunk" and ai_ship else ""))
        turn += 1

    print("\nAI đã chiến thắng! Hẹn phục thù lượt sau.")


if __name__ == "__main__":
    print(f"Fleet Battle Python AI Engine ({GRID_SIZE}x{GRID_SIZE} · 15 Quốc Gia · ~60 ô)")
    print("1. Chơi trực tiếp với AI trên Terminal")
    print("2. Chạy Benchmark kiểm tra 5 cấp độ AI")
    choice = input("Lựa chọn (1/2, mặc định 2): ").strip() or "2"
    start = time.time()
    if choice == "1":
        play_interactive_cli()
    else:
        run_benchmark()
        print(f"Hoàn tất trong {time.time() - start:.2f}s")
