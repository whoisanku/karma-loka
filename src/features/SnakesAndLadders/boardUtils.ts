// Utility functions and constants for Snakes and Ladders board

export const SNAKES_AND_LADDERS: Record<number, number> = {
  // Snakes
  99: 41,
  95: 75,
  92: 88,
  89: 68,
  74: 53,
  62: 24,
  64: 20,
  49: 11,
  46: 25,
  16: 6,

  // Ladders
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
};

export const generateSnakedCells = (): number[] => {
  const rows = 10;
  const cols = 10;
  const cells: number[] = new Array(rows * cols).fill(0);

  for (let visualRow = 0; visualRow < rows; visualRow++) {
    for (let col = 0; col < cols; col++) {
      const cellValue = visualRow * cols + col + 1;
      let displayCol = col;
      if (visualRow % 2 !== 0) {
        displayCol = cols - 1 - col;
      }
      const actualGridRow = rows - 1 - visualRow;
      const indexInGrid = actualGridRow * cols + displayCol;
      cells[indexInGrid] = cellValue;
    }
  }

  return cells;
};
