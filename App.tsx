import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateReaction } from './services/geminiService';
import { GameItem as GameItemType, ItemType, GameEvent } from './types';
import { GameItem } from './components/LetterTile'; // Importing the re-purposed component
import { 
  RobotIcon,
  RefreshIcon,
  HeartIcon,
  BasketIcon
} from './components/Icons';

const MAX_MISSES = 5;
const PLAYER_WIDTH_PERCENT = 15; // The basket is roughly 15% of screen width
const SPAWN_RATE_MS = 1000;
const ITEM_TYPES: ItemType[] = ['apple', 'banana', 'cherry', 'orange'];

const App: React.FC = () => {
  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Rendering State (synced from refs for React rendering)
  const [items, setItems] = useState<GameItemType[]>([]);
  const [playerX, setPlayerX] = useState(50); // Center
  
  // AI State
  const [commentary, setCommentary] = useState<string>("System initialized. Prepare to catch.");
  
  // Refs for Game Loop (Mutable state to avoid closures)
  const stateRef = useRef({
    items: [] as GameItemType[],
    playerX: 50,
    score: 0,
    misses: 0,
    lastSpawn: 0,
    isPlaying: false
  });
  
  const requestRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Game Loop ---
  const gameLoop = useCallback((timestamp: number) => {
    const state = stateRef.current;
    
    if (!state.isPlaying) return;

    // 1. Spawn Items
    if (timestamp - state.lastSpawn > Math.max(400, SPAWN_RATE_MS - (state.score * 10))) {
      const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      state.items.push({
        id: Date.now() + Math.random(),
        type,
        x: Math.random() * 90 + 5, // 5% to 95%
        y: -10, // Start above screen
        speed: 0.4 + (state.score * 0.02) // Speed increases with score
      });
      state.lastSpawn = timestamp;
    }

    // 2. Update Items Position & Collision
    const nextItems: GameItemType[] = [];
    let caughtInFrame = false;
    let missedInFrame = false;

    state.items.forEach(item => {
      item.y += item.speed;

      // Collision Detection
      // Basket is at Y ~ 85-95%
      // Player Width range: [playerX - width/2, playerX + width/2]
      const playerLeft = state.playerX - (PLAYER_WIDTH_PERCENT / 2);
      const playerRight = state.playerX + (PLAYER_WIDTH_PERCENT / 2);

      const hitBasket = item.y >= 85 && item.y <= 95 && item.x >= playerLeft && item.x <= playerRight;
      const hitGround = item.y > 100;

      if (hitBasket) {
        state.score += 1;
        caughtInFrame = true;
      } else if (hitGround) {
        state.misses += 1;
        missedInFrame = true;
      } else {
        nextItems.push(item);
      }
    });

    state.items = nextItems;

    // 3. Update React State (for rendering)
    setItems([...state.items]);
    setScore(state.score);
    setMisses(state.misses);

    // 4. Trigger Events
    if (missedInFrame) {
      if (state.misses >= MAX_MISSES) {
        endGame();
        return; // Stop loop
      } else {
        triggerCommentary('miss_streak');
      }
    } else if (caughtInFrame && state.score % 5 === 0) {
      triggerCommentary('catch_streak');
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // --- Controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stateRef.current.isPlaying) return;
      
      if (e.key === 'ArrowLeft') {
        stateRef.current.playerX = Math.max(PLAYER_WIDTH_PERCENT / 2, stateRef.current.playerX - 5);
      } else if (e.key === 'ArrowRight') {
        stateRef.current.playerX = Math.min(100 - (PLAYER_WIDTH_PERCENT / 2), stateRef.current.playerX + 5);
      }
      setPlayerX(stateRef.current.playerX);
    };
    
    // Smooth movement handling could go here, but keydown is okay for basic play
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse/Touch Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.isPlaying || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    const clamped = Math.min(100 - (PLAYER_WIDTH_PERCENT / 2), Math.max(PLAYER_WIDTH_PERCENT / 2, percentage));
    
    stateRef.current.playerX = clamped;
    setPlayerX(clamped);
  };

  // --- Game Lifecycle ---
  const startGame = () => {
    stateRef.current = {
      items: [],
      playerX: 50,
      score: 0,
      misses: 0,
      lastSpawn: performance.now(),
      isPlaying: true
    };
    
    setScore(0);
    setMisses(0);
    setItems([]);
    setPlayerX(50);
    setIsPlaying(true);
    setIsGameOver(false);
    
    triggerCommentary('start');
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = () => {
    stateRef.current.isPlaying = false;
    cancelAnimationFrame(requestRef.current);
    setIsPlaying(false);
    setIsGameOver(true);
    setHighScore(prev => Math.max(prev, stateRef.current.score));
    triggerCommentary('gameover');
  };

  const triggerCommentary = async (event: GameEvent) => {
    const text = await generateReaction(event, stateRef.current.score, stateRef.current.misses);
    setCommentary(text);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-sky-100 font-sans select-none overflow-hidden fixed inset-0 flex flex-col">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-sky-200 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-md flex items-center justify-center text-white">
              <BasketIcon className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-sky-900 hidden sm:block">Gemini Catch</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex gap-1">
               {[...Array(MAX_MISSES)].map((_, i) => (
                 <HeartIcon key={i} className={`w-5 h-5 ${i < (MAX_MISSES - misses) ? 'text-red-500' : 'text-gray-300'}`} />
               ))}
             </div>
             <div className="font-mono font-bold text-xl text-sky-900 w-12 text-right">
               {score}
             </div>
          </div>
        </div>
      </header>

      {/* Game Area */}
      <main 
        ref={containerRef}
        onPointerMove={handlePointerMove}
        className="flex-1 relative max-w-md mx-auto w-full bg-white overflow-hidden shadow-2xl cursor-crosshair touch-none"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 to-green-50 opacity-50" />
        
        {/* AI Mascot Bubble (Floating) */}
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-3 pointer-events-none">
           <div className="w-10 h-10 bg-white rounded-full border-2 border-sky-200 flex items-center justify-center shadow-md">
             <RobotIcon className="w-6 h-6 text-sky-600" />
           </div>
           <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-2xl rounded-tl-none border border-sky-100 shadow-sm text-sm text-sky-800 font-medium animate-in fade-in slide-in-from-left-2 duration-300">
             {commentary}
           </div>
        </div>

        {/* Falling Items */}
        {items.map(item => (
          <GameItem key={item.id} type={item.type} x={item.x} y={item.y} />
        ))}

        {/* Player Basket */}
        <div 
          className="absolute bottom-4 transform -translate-x-1/2 transition-transform duration-75 ease-linear will-change-transform"
          style={{ 
            left: `${playerX}%`,
            width: `${PLAYER_WIDTH_PERCENT}%` 
          }}
        >
          <div className="relative w-full aspect-[2/1] flex justify-center">
             <BasketIcon className="w-full h-full text-amber-600 drop-shadow-md" />
             <div className="absolute -bottom-1 w-full h-2 bg-black/20 rounded-full blur-sm" />
          </div>
        </div>

        {/* Overlay: Start / Game Over */}
        {(!isPlaying) && (
          <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95">
              
              {isGameOver ? (
                <>
                  <div className="text-4xl mb-2">🍎</div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Game Over!</h2>
                  <p className="text-slate-500 mb-6">You caught {score} fruits.</p>
                  {highScore > 0 && <p className="text-xs text-sky-600 font-bold uppercase tracking-wider mb-6">High Score: {highScore}</p>}
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">🍌</div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Ready to Catch?</h2>
                  <p className="text-slate-500 mb-6">Drag or use arrow keys to move the basket.</p>
                </>
              )}

              <button 
                onClick={startGame}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isGameOver ? <RefreshIcon className="w-5 h-5" /> : null}
                {isGameOver ? 'Try Again' : 'Start Game'}
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer Instructions */}
      <footer className="bg-slate-50 border-t border-slate-200 py-2 text-center text-xs text-slate-400">
        Desktop: Arrow Keys • Mobile: Touch & Drag
      </footer>
    </div>
  );
};

export default App;