/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Undo, 
  RotateCcw, 
  Settings, 
  Trophy, 
  Eraser, 
  Pencil, 
  Lightbulb, 
  Clock, 
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateFullGrid, 
  preparePuzzle, 
  isValid, 
  isSolved, 
  copyGrid,
  type Difficulty, 
  type SudokuGrid 
} from './lib/sudoku';

// Constants
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Expert'];

interface GameState {
  initial: SudokuGrid;
  current: SudokuGrid;
  solution: SudokuGrid;
  notes: Set<string>[][]; // Array of sets for pencil marks
  history: { current: SudokuGrid; notes: Set<string>[][] }[];
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [game, setGame] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [time, setTime] = useState(0);
  const [showStatus, setShowStatus] = useState<boolean | null>(null); // null: active, true: win, false: lose (max errors)

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Game
  const startNewGame = useCallback((diff: Difficulty) => {
    const fullGrid = generateFullGrid();
    const puzzle = preparePuzzle(fullGrid, diff);
    
    const initialNotes = Array.from({ length: 9 }, () => 
      Array.from({ length: 9 }, () => new Set<string>())
    );

    setGame({
      initial: puzzle,
      current: copyGrid(puzzle),
      solution: fullGrid,
      notes: initialNotes,
      history: []
    });
    
    setDifficulty(diff);
    setSelected(null);
    setErrors(0);
    setHintsUsed(0);
    setTime(0);
    setShowStatus(null);
    setIsNoteMode(false);
  }, []);

  useEffect(() => {
    startNewGame('Easy');
  }, [startNewGame]);

  // Timer Logic
  useEffect(() => {
    if (showStatus === null) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showStatus !== null) return;
      
      if (e.key >= '1' && e.key <= '9') {
        handleInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key === 'ArrowUp' && selected) {
        setSelected([Math.max(0, selected[0] - 1), selected[1]]);
      } else if (e.key === 'ArrowDown' && selected) {
        setSelected([Math.min(8, selected[0] + 1), selected[1]]);
      } else if (e.key === 'ArrowLeft' && selected) {
        setSelected([selected[0], Math.max(0, selected[1] - 1)]);
      } else if (e.key === 'ArrowRight' && selected) {
        setSelected([selected[0], Math.min(8, selected[1] + 1)]);
      } else if (e.key === 'n' || e.key === 'N') {
        setIsNoteMode(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, isNoteMode, game, showStatus]);

  const handleInput = (num: number) => {
    if (!game || !selected || showStatus !== null) return;
    const [r, c] = selected;

    // Check if original cell
    if (game.initial[r][c] !== null) return;

    // If note mode, toggle note
    if (isNoteMode) {
      const newNotes = game.notes.map(row => row.map(cell => new Set(cell)));
      const cellNotes = newNotes[r][c];
      const numStr = num.toString();
      
      if (cellNotes.has(numStr)) {
        cellNotes.delete(numStr);
      } else {
        cellNotes.add(numStr);
      }

      // Record history
      const newHistory = [
        ...game.history, 
        { current: copyGrid(game.current), notes: game.notes.map(row => row.map(cell => new Set(cell))) }
      ].slice(-20); // Keep last 20 moves

      setGame({ ...game, notes: newNotes, history: newHistory });
      return;
    }

    // Normal input
    if (game.current[r][c] === num) return;

    // Validation
    const isCorrect = game.solution[r][c] === num;

    if (!isCorrect) {
      setErrors(prev => {
        const next = prev + 1;
        if (next >= 3) setShowStatus(false);
        return next;
      });
    }

    const newCurrent = copyGrid(game.current);
    newCurrent[r][c] = num;

    // Clear notes for this row, col, and box for this number
    const newNotes = game.notes.map(row => row.map(cell => new Set(cell)));
    if (isCorrect) {
      // Clear current cell notes
      newNotes[r][c].clear();
      for (let i = 0; i < 9; i++) {
        newNotes[r][i].delete(num.toString());
        newNotes[i][c].delete(num.toString());
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          newNotes[br + i][bc + j].delete(num.toString());
        }
      }
    }

    const newHistory = [
      ...game.history, 
      { current: copyGrid(game.current), notes: game.notes.map(row => row.map(cell => new Set(cell))) }
    ].slice(-20);

    const nextGame = { ...game, current: newCurrent, notes: newNotes, history: newHistory };
    setGame(nextGame);

    if (isCorrect && isSolved(newCurrent, game.solution)) {
      setShowStatus(true);
    }
  };

  const handleErase = () => {
    if (!game || !selected || showStatus !== null) return;
    const [r, c] = selected;
    if (game.initial[r][c] !== null) return;

    const newCurrent = copyGrid(game.current);
    newCurrent[r][c] = null;
    
    const newNotes = game.notes.map(row => row.map(cell => new Set(cell)));
    newNotes[r][c].clear();

    const newHistory = [
      ...game.history, 
      { current: copyGrid(game.current), notes: game.notes.map(row => row.map(cell => new Set(cell))) }
    ].slice(-20);

    setGame({ ...game, current: newCurrent, notes: newNotes, history: newHistory });
  };

  const handleUndo = () => {
    if (!game || game.history.length === 0 || showStatus !== null) return;
    const prevState = game.history[game.history.length - 1];
    const newHistory = game.history.slice(0, -1);
    
    setGame({
      ...game,
      current: prevState.current,
      notes: prevState.notes,
      history: newHistory
    });
  };

  const handleHint = () => {
    if (!game || !selected || showStatus !== null || hintsUsed >= 3) return;
    const [r, c] = selected;
    if (game.current[r][c] !== null) return;

    setHintsUsed(prev => prev + 1);
    const correctNum = game.solution[r][c];
    handleInput(correctNum);
  };

  // Cell Highlighting Helpers
  const isCellSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isSameRegion = (r: number, c: number) => {
    if (!selected) return false;
    const [sr, sc] = selected;
    if (r === sr || c === sc) return true;
    const br = Math.floor(sr / 3) * 3;
    const bc = Math.floor(sc / 3) * 3;
    return r >= br && r < br + 3 && c >= bc && c < bc + 3;
  };
  const isSameNumber = (r: number, c: number) => {
    if (!selected || !game) return false;
    const [sr, sc] = selected;
    const selectedNum = game.current[sr][sc];
    return selectedNum !== null && game.current[r][c] === selectedNum;
  };

  if (!game) return null;

  return (
    <div className="h-screen max-h-screen bg-app-bg font-sans text-slate-900 overflow-hidden flex flex-col selection:bg-blue-200">
      {/* Header - Compact for mobile */}
      <header className="flex-none px-4 py-3 md:py-6 max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-2 md:gap-6">
        <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tighter text-brand-primary">SUDOKU.CORE</h1>
          <div className="flex items-center gap-4 md:mt-2">
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-slate-500">
              <span className="uppercase tracking-widest">Mistakes:</span>
              <span className="text-slate-900 font-bold">{errors}/3</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-slate-500">
              <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
              <span className="text-slate-900 font-bold">{formatTime(time)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-1 md:gap-2">
          {DIFFICULTIES.map(d => (
            <button 
              key={d}
              onClick={() => startNewGame(d)}
              className={`
                px-2 md:px-4 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all duration-200 border
                ${difficulty === d 
                  ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-card-bg border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'}
              `}
            >
              {d.charAt(0)}<span className="hidden sm:inline">{d.slice(1)}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row items-stretch justify-center items-center gap-4 md:gap-12 px-2 md:px-4 pb-4 overflow-hidden">
        
        {/* Left Column: Grid - Scales with height */}
        <section className="flex-grow flex items-center justify-center min-h-0 w-full max-w-[540px]">
          <div className="relative bg-grid-border p-[2px] md:p-[3px] rounded-sm shadow-xl shadow-slate-200 w-full aspect-square max-h-full">
            <div className="grid grid-cols-9 aspect-square bg-slate-300 gap-[1px] overflow-hidden w-full h-full">
              {game.current.map((row, r) => 
                row.map((cell, c) => {
                  const isInitial = game.initial[r][c] !== null;
                  const isWrong = cell !== null && !isInitial && cell !== game.solution[r][c];
                  const selectedCell = isCellSelected(r, c);
                  const related = isSameRegion(r, c);
                  const matching = isSameNumber(r, c);
                  
                  const borderRight = (c + 1) % 3 === 0 && c !== 8;
                  const borderBottom = (r + 1) % 3 === 0 && r !== 8;

                  return (
                    <motion.div
                      key={`${r}-${c}`}
                      initial={false}
                      className={`
                        relative flex items-center justify-center w-full h-full text-lg sm:text-2xl md:text-3xl cursor-pointer transition-all duration-150
                        ${selectedCell ? 'bg-brand-primary text-white z-10 shadow-inner' : 
                          matching ? 'bg-blue-200/70 text-brand-primary' :
                          related ? 'bg-blue-50/80 text-slate-900' : 
                          isInitial ? 'bg-white text-slate-900 font-bold' : 'bg-white text-brand-primary'
                        }
                        ${borderRight ? 'border-r-[2px] border-r-grid-border' : 'border-r border-slate-200'}
                        ${borderBottom ? 'border-b-[2px] border-b-grid-border' : 'border-b border-slate-200'}
                      `}
                      onClick={() => setSelected([r, c])}
                    >
                      {cell !== null ? (
                        <span className={`font-semibold ${isInitial ? 'font-black' : isWrong ? 'text-red-500' : ''}`}>
                          {cell}
                        </span>
                      ) : (
                        <div className="grid grid-cols-3 w-full h-full p-[2px] md:p-1 opacity-60">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <div key={n} className="flex items-center justify-center overflow-hidden">
                              {game.notes[r][c].has(n.toString()) && (
                                <span className={`text-[6px] sm:text-[8px] md:text-[9px] font-bold leading-none ${selectedCell ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {n}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Overlays */}
            <AnimatePresence>
              {showStatus !== null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-8 text-center"
                >
                  {showStatus ? <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-emerald-500 mb-4" /> : <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mb-4" />}
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase">{showStatus ? 'VICTORY' : 'GAME OVER'}</h2>
                  <p className="mt-1 md:mt-2 text-sm md:text-base text-slate-600 max-w-xs">{showStatus ? `Time: ${formatTime(time)} • ${difficulty}` : '3 mistakes made. Try again.'}</p>
                  <button 
                    onClick={() => startNewGame(difficulty)}
                    className="mt-6 md:mt-8 px-6 md:px-8 py-2 md:py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-all shadow-lg"
                  >
                    New Game
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Column: Controls - More compact on mobile */}
        <section className="flex-none w-full max-w-[400px] flex flex-col gap-3 md:gap-6 justify-center">
          
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-2 md:gap-3">
            <ControlAction 
              icon={<Undo size={window.innerWidth < 640 ? 14 : 18} />} 
              label="Undo" 
              onClick={handleUndo} 
              disabled={game.history.length === 0}
            />
            <ControlAction 
              icon={<Eraser size={window.innerWidth < 640 ? 14 : 18} />} 
              label="Erase" 
              onClick={handleErase}
            />
            <ControlAction 
              icon={<Pencil size={window.innerWidth < 640 ? 14 : 18} />} 
              label="Notes" 
              status={isNoteMode ? 'ON' : 'OFF'}
              onClick={() => setIsNoteMode(!isNoteMode)}
              active={isNoteMode}
            />
            <ControlAction 
              icon={<Lightbulb size={window.innerWidth < 640 ? 14 : 18} />} 
              label="Hint" 
              status={hintsUsed < 3 ? `${3 - hintsUsed} left` : 'None'}
              onClick={handleHint}
              disabled={hintsUsed >= 3}
            />
          </div>

          <div className="bg-card-bg p-2 md:p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 sm:grid-cols-9 lg:grid-cols-3 gap-1 md:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleInput(num)}
                  disabled={showStatus !== null}
                  className="h-10 sm:h-auto aspect-square lg:h-16 flex items-center justify-center bg-slate-50 hover:bg-blue-50 hover:text-brand-primary text-lg md:text-2xl font-bold text-slate-700 rounded-lg md:rounded-xl transition-all active:scale-90 border border-slate-100 disabled:opacity-30"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => startNewGame(difficulty)}
            className="hidden sm:flex w-full py-2 md:py-4 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:text-brand-primary transition-all active:scale-[0.98] border border-slate-200 group items-center justify-center gap-2 shadow-sm"
          >
            <RotateCcw size={16} md:size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 
            New Game
          </button>
        </section>
      </main>

      <footer className="flex-none py-2 md:py-4 text-center text-slate-400 text-[10px] uppercase tracking-[0.2em]">
        Sudoku.Core Engine • Version 1.0.5
      </footer>
    </div>
  );
}

function ControlAction({ 
  icon, 
  label, 
  onClick, 
  status,
  active = false, 
  disabled = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  status?: string,
  active?: boolean,
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-1.5 md:p-3 rounded-lg border transition-all gap-0.5 md:gap-1
        ${active ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-blue-500/20' : 'bg-card-bg border-slate-200 text-slate-500 hover:border-blue-400 hover:text-brand-primary'}
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
    >
      {icon}
      <div className="flex flex-col items-center">
        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider">{label}</span>
        {status && <span className="text-[7px] md:text-[8px] text-brand-primary font-bold leading-tight">{status}</span>}
      </div>
    </button>
  );
}

