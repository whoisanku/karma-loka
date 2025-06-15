import React from "react";

type LadderVisualProps = { start: number; end: number };

const LadderVisual: React.FC<LadderVisualProps> = ({ start, end }) => {
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

  const ladderWidth = 0.4;
  const rungSpacing = 0.4;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const angle = Math.atan2(dy, dx);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const rail1 = {
    x1: p1.x + (nx * ladderWidth) / 2,
    y1: p1.y + (ny * ladderWidth) / 2,
    x2: p2.x + (nx * ladderWidth) / 2,
    y2: p2.y + (ny * ladderWidth) / 2,
  };

  const rail2 = {
    x1: p1.x - (nx * ladderWidth) / 2,
    y1: p1.y - (ny * ladderWidth) / 2,
    x2: p2.x - (nx * ladderWidth) / 2,
    y2: p2.y - (ny * ladderWidth) / 2,
  };

  const numRungs = Math.floor(len / rungSpacing);
  const rungs = Array.from({ length: numRungs }, (_, i) => {
    const progress = (i + 1) / (numRungs + 1);
    const rungX = p1.x + dx * progress;
    const rungY = p1.y + dy * progress;
    return {
      x1: rungX + (nx * ladderWidth) / 2,
      y1: rungY + (ny * ladderWidth) / 2,
      x2: rungX - (nx * ladderWidth) / 2,
      y2: rungY - (ny * ladderWidth) / 2,
    };
  });

  return (
    <g>
      <line {...rail1} stroke="#8B4513" strokeWidth="0.05" />
      <line {...rail2} stroke="#8B4513" strokeWidth="0.05" />
      {rungs.map((rung, i) => (
        <line key={i} {...rung} stroke="#8B4513" strokeWidth="0.05" />
      ))}
    </g>
  );
};

export default LadderVisual;
