/**
 * Zenith Sudoku Logic
 * Handles grid generation, validation, and solving.
 */

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export type SudokuGrid = (number | null)[][];

/**
 * Generates a full valid Sudoku grid using backtracking.
 */
export function generateFullGrid(): SudokuGrid {
  const grid: SudokuGrid = Array.from({ length: 9 }, () => Array(9).fill(null));

  function fill(row: number, col: number): boolean {
    if (col === 9) {
      row++;
      col = 0;
    }
    if (row === 9) return true;

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);

    for (const num of numbers) {
      if (isValid(grid, row, col, num)) {
        grid[row][col] = num;
        if (fill(row, col + 1)) return true;
        grid[row][col] = null;
      }
    }
    return false;
  }

  fill(0, 0);
  return grid;
}

/**
 * Checks if placing a number in a specific cell is valid.
 */
export function isValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
  // Row check
  for (let x = 0; x < 9; x++) if (grid[row][x] === num) return false;

  // Column check
  for (let x = 0; x < 9; x++) if (grid[x][col] === num) return false;

  // 3x3 Box check
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[startRow + i][startCol + j] === num) return false;
    }
  }

  return true;
}

/**
 * Removes cells from a full grid to create a puzzle based on difficulty.
 */
export function preparePuzzle(fullGrid: SudokuGrid, difficulty: Difficulty): SudokuGrid {
  const puzzle = fullGrid.map(row => [...row]);
  let attempts = 0;
  
  const removalCounts = {
    'Easy': 35,
    'Medium': 45,
    'Hard': 55,
    'Expert': 60
  };

  const countToRemove = removalCounts[difficulty];
  let removed = 0;

  while (removed < countToRemove && attempts < 1000) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);

    if (puzzle[r][c] !== null) {
      const backup = puzzle[r][c];
      puzzle[r][c] = null;

      // In a real pro app, we'd check for unique solutions here.
      // For this version, we'll favor gameplay flow.
      removed++;
    }
    attempts++;
  }

  return puzzle;
}

/**
 * Deep copy a grid.
 */
export function copyGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map(row => [...row]);
}

/**
 * Check if the current grid matches the solution.
 */
export function isSolved(grid: SudokuGrid, solution: SudokuGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
