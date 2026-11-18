import React from 'react';
import { NATIONS } from '../data/nationsAndFleets';
import { NationId, RelativeOffset } from '../types/game';
import { getShipBounds } from '../utils/fleetLogic';

interface ShipGraphicProps {
  offsets: RelativeOffset[];
  nationId: NationId;
  sunk?: boolean;
  shielded?: boolean;
  revealed?: boolean;
  isFlagship?: boolean;
  hasArmor?: boolean;
  isGhost?: boolean;
  ghostValid?: boolean;
  className?: string;
}

export const ShipGraphic: React.FC<ShipGraphicProps> = ({
  offsets,
  nationId,
  sunk = false,
  shielded = false,
  revealed = false,
  isFlagship = false,
  hasArmor = false,
  isGhost = false,
  ghostValid = true,
  className = 'w-full h-full',
}) => {
  const nation = NATIONS[nationId] || NATIONS.VN;
  const { rows, cols } = getShipBounds(offsets);
  const cellSet = new Set(offsets.map(([r, c]) => `${r},${c}`));
  const hasCell = (r: number, c: number) => cellSet.has(`${r},${c}`);

  const vbW = cols * 100;
  const vbH = rows * 100;

  // Chọn ô trung tâm làm đài chỉ huy (bridge)
  const avgR = offsets.reduce((s, [r]) => s + r, 0) / offsets.length;
  const avgC = offsets.reduce((s, [, c]) => s + c, 0) / offsets.length;
  let bridgeIdx = 0;
  let bestDist = Infinity;
  offsets.forEach(([r, c], idx) => {
    const d = Math.hypot(r - avgR, c - avgC);
    if (d < bestDist) {
      bestDist = d;
      bridgeIdx = idx;
    }
  });

  const hullFill = isGhost
    ? ghostValid
      ? 'rgba(56, 189, 248, 0.42)'
      : 'rgba(239, 68, 68, 0.45)'
    : sunk
      ? '#1E293B'
      : nation.hullPrimary;

  const deckFill = isGhost
    ? ghostValid
      ? 'rgba(125, 211, 252, 0.3)'
      : 'rgba(248, 113, 113, 0.3)'
    : sunk
      ? '#0F172A'
      : nation.hullSecondary;

  const borderColor = isGhost
    ? ghostValid
      ? '#38BDF8'
      : '#EF4444'
    : sunk
      ? '#EF4444'
      : shielded
        ? '#22D3EE'
        : isFlagship
          ? '#FACC15'
          : revealed
            ? '#FBBF24'
            : nation.deckAccent;

  const trim = isGhost
    ? ghostValid
      ? '#BAE6FD'
      : '#FCA5A5'
    : sunk
      ? '#DC2626'
      : isFlagship
        ? '#FACC15'
        : nation.trimColor;

  const pad = 8;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={`${className} ${sunk ? 'animate-ship-sink' : ''} select-none pointer-events-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.55)]`}
      preserveAspectRatio="none"
    >
      {/* Energy Shield Aura */}
      {shielded && !sunk && !isGhost && (
        <g opacity="0.6">
          {offsets.map(([r, c], idx) => (
            <rect
              key={`sh-${idx}`}
              x={c * 100 + 2}
              y={r * 100 + 2}
              width={96}
              height={96}
              rx={22}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="5"
            />
          ))}
        </g>
      )}

      {/* Flagship Thick Armor Outer Rim Glow */}
      {isFlagship && hasArmor && !sunk && !isGhost && (
        <g opacity="0.55">
          {offsets.map(([r, c], idx) => (
            <rect
              key={`arm-${idx}`}
              x={c * 100 + 3}
              y={r * 100 + 3}
              width={94}
              height={94}
              rx={20}
              fill="none"
              stroke="#FACC15"
              strokeWidth="4.5"
              strokeDasharray="10 6"
            />
          ))}
        </g>
      )}

      {/* Structural Connectors for Diagonal Exotic Shapes */}
      <g>
        {offsets.map(([r, c], idx) => {
          const links: React.ReactNode[] = [];
          const diagNeighbors: [number, number][] = [
            [1, 1],
            [1, -1],
          ];
          for (const [dr, dc] of diagNeighbors) {
            if (
              hasCell(r + dr, c + dc) &&
              !hasCell(r + dr, c) &&
              !hasCell(r, c + dc)
            ) {
              links.push(
                <line
                  key={`diag-${idx}-${dr}-${dc}`}
                  x1={c * 100 + 50}
                  y1={r * 100 + 50}
                  x2={(c + dc) * 100 + 50}
                  y2={(r + dr) * 100 + 50}
                  stroke={borderColor}
                  strokeWidth="22"
                  strokeLinecap="round"
                />
              );
              links.push(
                <line
                  key={`diag-in-${idx}-${dr}-${dc}`}
                  x1={c * 100 + 50}
                  y1={r * 100 + 50}
                  x2={(c + dc) * 100 + 50}
                  y2={(r + dr) * 100 + 50}
                  stroke={hullFill}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              );
            }
          }
          return links;
        })}
      </g>

      {/* Main Armored Warship Hull + Per-cell Combat Modules (Classic Style) */}
      <g>
        {offsets.map(([r, c], idx) => {
          const x = c * 100;
          const y = r * 100;
          const up = hasCell(r - 1, c);
          const down = hasCell(r + 1, c);
          const left = hasCell(r, c - 1);
          const right = hasCell(r, c + 1);

          const pL = left ? 0 : pad;
          const pR = right ? 0 : pad;
          const pT = up ? 0 : pad;
          const pB = down ? 0 : pad;
          const w = 100 - pL - pR;
          const h = 100 - pT - pB;

          const rx = !up && !down && !left && !right ? 26 : 14;
          const isBridge = idx === bridgeIdx;
          const isHorizontalEnd = (!left || !right) && (left || right);
          const isVerticalEnd = (!up || !down) && (up || down);

          return (
            <g key={`cell-${idx}`}>
              {/* Outer Hull Plate */}
              <rect
                x={x + pL}
                y={y + pT}
                width={w}
                height={h}
                rx={rx}
                fill={hullFill}
                stroke={borderColor}
                strokeWidth={isFlagship ? '4.5' : '3.5'}
              />

              {/* Inner Combat Deck */}
              <rect
                x={x + pL + 9}
                y={y + pT + 9}
                width={Math.max(10, w - 18)}
                height={Math.max(10, h - 18)}
                rx={Math.max(5, rx - 7)}
                fill={deckFill}
              />

              {/* Hull Centerline / Accent Stripe */}
              {!isGhost && (left || right) && (
                <line
                  x1={x + pL + 6}
                  y1={y + 50}
                  x2={x + 100 - pR - 6}
                  y2={y + 50}
                  stroke={nation.stripeColor}
                  strokeWidth="2.5"
                  opacity="0.35"
                />
              )}
              {!isGhost && (up || down) && !left && !right && (
                <line
                  x1={x + 50}
                  y1={y + pT + 6}
                  x2={x + 50}
                  y2={y + 100 - pB - 6}
                  stroke={nation.stripeColor}
                  strokeWidth="2.5"
                  opacity="0.35"
                />
              )}

              {/* Superstructure / Gun Turrets (Classic Warship Detail) */}
              {!isGhost && isBridge ? (
                <g>
                  <rect
                    x={x + 25}
                    y={y + 27}
                    width={50}
                    height={46}
                    rx={8}
                    fill={hullFill}
                    stroke={trim}
                    strokeWidth="3"
                  />
                  <rect
                    x={x + 35}
                    y={y + 35}
                    width={30}
                    height={22}
                    rx={4}
                    fill={deckFill}
                    stroke={borderColor}
                    strokeWidth="2"
                  />
                  {isFlagship ? (
                    <polygon
                      points={`${x + 50},${y + 37} ${x + 54},${y + 45} ${x + 63},${y + 46} ${x + 56},${y + 52} ${x + 58},${y + 60} ${x + 50},${y + 56} ${x + 42},${y + 60} ${x + 44},${y + 52} ${x + 37},${y + 46} ${x + 46},${y + 45}`}
                      fill="#FACC15"
                    />
                  ) : (
                    <circle cx={x + 50} cy={y + 46} r={5.5} fill={trim} />
                  )}
                </g>
              ) : !isGhost && (isHorizontalEnd || isVerticalEnd || offsets.length === 1) ? (
                <g>
                  {/* Gun Turret & Cannon Barrel */}
                  <circle
                    cx={x + 50}
                    cy={y + 50}
                    r={16}
                    fill={hullFill}
                    stroke={trim}
                    strokeWidth="2.5"
                  />
                  {!left && right ? (
                    <line
                      x1={x + 46}
                      y1={y + 50}
                      x2={x + 16}
                      y2={y + 50}
                      stroke={trim}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  ) : !right && left ? (
                    <line
                      x1={x + 54}
                      y1={y + 50}
                      x2={x + 84}
                      y2={y + 50}
                      stroke={trim}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  ) : !up && down ? (
                    <line
                      x1={x + 50}
                      y1={y + 46}
                      x2={x + 50}
                      y2={y + 16}
                      stroke={trim}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  ) : (
                    <line
                      x1={x + 50}
                      y1={y + 54}
                      x2={x + 50}
                      y2={y + 84}
                      stroke={trim}
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}
                  <circle cx={x + 50} cy={y + 50} r={5} fill={trim} />
                </g>
              ) : !isGhost ? (
                <g opacity="0.82">
                  {/* Mid-deck Radar / Helipad Marker */}
                  <circle
                    cx={x + 50}
                    cy={y + 50}
                    r={13}
                    fill="none"
                    stroke={trim}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <circle cx={x + 50} cy={y + 50} r={4} fill={trim} />
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

interface ShipMiniPreviewProps {
  offsets: RelativeOffset[];
  nationId: NationId;
  isFlagship?: boolean;
  size?: number;
}

export const ShipMiniPreview: React.FC<ShipMiniPreviewProps> = ({
  offsets,
  nationId,
  isFlagship = false,
  size = 18,
}) => {
  const { rows, cols } = getShipBounds(offsets);
  return (
    <div
      style={{
        width: cols * size,
        height: rows * size,
      }}
      className="shrink-0"
    >
      <ShipGraphic
        offsets={offsets}
        nationId={nationId}
        isFlagship={isFlagship}
      />
    </div>
  );
};
