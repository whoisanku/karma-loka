import React from "react";

type SnakeVisualProps = { start: number; end: number };

const SnakeVisual: React.FC<SnakeVisualProps> = ({ start, end }) => {
  const getPosition = (cell: number) => {
    const visualRow = Math.floor((cell - 1) / 10);
    let col = (cell - 1) % 10;
    if (visualRow % 2 !== 0) {
      col = 9 - col;
    }
    const row = 9 - visualRow;
    return { x: col + 0.5, y: row + 0.5 };
  };

  const p1 = getPosition(start);
  const p2 = getPosition(end);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const bodyWidth = 0.2;
  const numSegments = Math.max(10, Math.floor(len * 5));
  const pathPoints: { x: number; y: number; width: number }[] = [];

  const angle = Math.atan2(dy, dx);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const curveAmplitude = len * 0.2;
  const control1X = p1.x + dx / 3 + nx * curveAmplitude;
  const control1Y = p1.y + dy / 3 + ny * curveAmplitude;
  const control2X = p1.x + (2 * dx) / 3 - nx * curveAmplitude;
  const control2Y = p1.y + (2 * dy) / 3 - ny * curveAmplitude;

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p1.x +
      3 * mt * mt * t * control1X +
      3 * mt * t * t * control2X +
      t * t * t * p2.x;
    const y =
      mt * mt * mt * p1.y +
      3 * mt * mt * t * control1Y +
      3 * mt * t * t * control2Y +
      t * t * t * p2.y;
    const width = bodyWidth * (1 - t * 0.7);
    pathPoints.push({ x, y, width });
  }

  const headAngle = Math.atan2(control1Y - p1.y, control1X - p1.x);
  const headNx = -Math.sin(headAngle);
  const headNy = Math.cos(headAngle);

  return (
    <g>
      {pathPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.width / 2}
          fill={i % 2 === 0 ? "#8B0000" : "#B22222"}
        />
      ))}
      {/* Snake Eyes */}
      <circle
        cx={p1.x - headNx * 0.05}
        cy={p1.y - headNy * 0.05}
        r={0.04}
        fill="white"
      />
      <circle
        cx={p1.x + headNx * 0.05}
        cy={p1.y + headNy * 0.05}
        r={0.04}
        fill="white"
      />
      <circle
        cx={p1.x - headNx * 0.05}
        cy={p1.y - headNy * 0.05}
        r={0.02}
        fill="black"
      />
      <circle
        cx={p1.x + headNx * 0.05}
        cy={p1.y + headNy * 0.05}
        r={0.02}
        fill="black"
      />
      {/* Forked Tongue removed */}
    </g>
  );
};

export default SnakeVisual;
