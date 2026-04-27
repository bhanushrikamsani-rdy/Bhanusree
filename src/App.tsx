/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Volume2, Gamepad2, PlaySquare, VolumeX } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'Neon Pulse (AI Gen)', artist: 'SynthBot 3000', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Cyber Drift', artist: 'Neural Network', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Digital Horizon', artist: 'Auto-DJ Array', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_SPEED = 150;

function randomFoodPosition(snake: {x: number, y: number}[]) {
  let position;
  while (true) {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.some(segment => segment.x === position.x && segment.y === position.y)) {
      break;
    }
  }
  return position;
}

export default function App() {
  // ---- Music Player State ----
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIdx]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const skipForward = () => {
    setCurrentTrackIdx((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const skipBackward = () => {
    setCurrentTrackIdx((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleAudioEnded = () => {
    skipForward();
  };

  // ---- Snake Game State ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(true);

  // Use refs for snake and direction to avoid dependency cycles in game loop
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const nextDirectionRef = useRef(direction);
  const foodRef = useRef(food);

  useEffect(() => {
    snakeRef.current = snake;
    directionRef.current = direction;
    foodRef.current = food;
  }, [snake, direction, food]);

  const resetGame = () => {
    const newSnake = INITIAL_SNAKE;
    setSnake(newSnake);
    snakeRef.current = newSnake;
    
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    
    const newFood = randomFoodPosition(newSnake);
    setFood(newFood);
    foodRef.current = newFood;
    
    setScore(0);
    setIsGameOver(false);
    setIsGamePaused(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        if (e.target === document.body) {
           e.preventDefault();
        }
      }

      if (isGameOver) {
        if (e.key === 'Enter' || e.key === ' ') resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
          break;
        case ' ':
          setIsGamePaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver]);

  // Game Loop
  useEffect(() => {
    if (isGamePaused || isGameOver) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const currentHead = prevSnake[0];
        setDirection(nextDirectionRef.current);
        const nextDir = nextDirectionRef.current;
        
        const newHead = {
          x: currentHead.x + nextDir.x,
          y: currentHead.y + nextDir.y
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setIsGameOver(true);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
          setScore(s => {
            const nextScore = s + 10;
            if (nextScore > highScore) setHighScore(nextScore);
            return nextScore;
          });
          setFood(randomFoodPosition(newSnake));
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    };

    // Increase speed slightly based on score
    const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const intervalId = setInterval(moveSnake, currentSpeed);

    return () => clearInterval(intervalId);
  }, [isGamePaused, isGameOver, score, highScore]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid (optional, makes it look more techy)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw Food (Magenta glowing)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#d946ef';
    ctx.fillStyle = '#d946ef';
    ctx.fillRect(
      foodRef.current.x * CELL_SIZE + 2, 
      foodRef.current.y * CELL_SIZE + 2, 
      CELL_SIZE - 4, 
      CELL_SIZE - 4
    );

    // Draw Snake (Cyan or Green glowing)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22c55e';
    ctx.fillStyle = '#22c55e';
    
    snakeRef.current.forEach((segment, index) => {
      // Head could be slightly different
      if (index === 0) {
        ctx.fillStyle = '#4ade80'; 
      } else {
        ctx.fillStyle = '#22c55e';
      }
      ctx.fillRect(
        segment.x * CELL_SIZE + 1, 
        segment.y * CELL_SIZE + 1, 
        CELL_SIZE - 2, 
        CELL_SIZE - 2
      );
    });

    // Reset shadow for next frame's clear
    ctx.shadowBlur = 0;

  }, [snake, food]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIdx].src} 
        onEnded={handleAudioEnded}
      />

      <header className="mb-8 text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-glow-cyan text-cyan-400 uppercase">
          Neon System
        </h1>
        <p className="text-cyan-600/80 text-sm tracking-widest uppercase">Arcade & Audio Environment</p>
      </header>

      <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start max-w-6xl w-full justify-center">
        
        {/* Game Container */}
        <div className="flex flex-col items-center">
          <div className="mb-4 w-full flex justify-between items-end border-b border-green-500/30 pb-2 px-2">
            <div>
              <div className="text-green-500/70 text-xs tracking-widest uppercase">Score</div>
              <div className="text-3xl text-glow-green text-green-400 font-bold leading-none">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-cyan-500/70 text-xs tracking-widest uppercase">High Score</div>
              <div className="text-xl text-glow-cyan text-cyan-400 font-bold leading-none">{highScore}</div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-green-500/5 blur-xl group-hover:bg-green-500/10 transition-colors duration-500 rounded-lg"></div>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="box-glow-green bg-[#050505] rounded border border-green-500/50 relative z-10"
            />
            
            {/* Overlays */}
            {isGameOver && (
              <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center rounded border border-red-500/50 box-glow-magenta backdrop-blur-sm">
                <h2 className="text-4xl font-bold text-glow-magenta text-fuchsia-500 mb-4 tracking-tighter">SYSTEM FAILURE</h2>
                <div className="text-fuchsia-400/80 mb-6 uppercase text-sm tracking-widest">Score Captured: {score}</div>
                <button 
                  onClick={resetGame}
                  className="px-6 py-2 border border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500/20 hover:text-glow-magenta transition-all rounded uppercase tracking-widest text-sm flex items-center gap-2"
                >
                  <Gamepad2 size={16} /> reboot_system
                </button>
              </div>
            )}

            {!isGameOver && isGamePaused && (
              <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center rounded backdrop-blur-sm">
                <button 
                  onClick={() => setIsGamePaused(false)}
                  className="px-6 py-2 border border-green-500 text-green-400 hover:bg-green-500/20 hover:text-glow-green transition-all rounded uppercase tracking-widest text-sm flex items-center gap-2"
                >
                  <PlaySquare size={16} /> initialize_seq
                </button>
                <div className="text-green-500/50 text-xs mt-4 tracking-widest text-center">
                  Use WASD or Arrows to move.<br/>Press Space to pause.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Music Player Widget */}
        <div className="w-full max-w-md xl:w-96 bg-[#0a0a0a] rounded-xl border border-cyan-500/30 overflow-hidden box-glow-cyan flex flex-col shrink-0 mt-4 xl:mt-16">
          <div className="p-6 border-b border-cyan-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="bg-cyan-500/10 p-2 border border-cyan-500/30 rounded inline-flex">
                <Music className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-[10px] text-cyan-500/60 uppercase tracking-[0.2em]">Audio Subsystem</div>
            </div>

            <div className="space-y-1 z-10 relative">
              <h3 className="text-xl font-bold text-cyan-50 text-glow-cyan tracking-tight truncate pl-1">
                {TRACKS[currentTrackIdx].title}
              </h3>
              <p className="text-cyan-400/80 text-sm tracking-wide truncate pl-1">
                {TRACKS[currentTrackIdx].artist}
              </p>
            </div>
            
            {/* Ambient background glow for player */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
          </div>

          <div className="p-6 bg-black/50">
            {/* Track Info & Progress - simplified visual */}
            <div className="mb-6 flex space-x-1 justify-center items-end h-8">
               {/* Visualizer bars (dummy animation) */}
               {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-t-sm bg-cyan-500 transition-all duration-300 ${isPlaying ? 'opacity-80' : 'opacity-20 h-2'}`}
                    style={isPlaying ? { height: `${Math.max(20, Math.random() * 100)}%`, animation: `pulse ${0.5 + Math.random()}s infinite alternate` } : {}}
                  ></div>
               ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-8 px-4">
              <button 
                onClick={skipBackward}
                className="text-cyan-600 hover:text-cyan-300 transition-colors p-2"
                aria-label="Previous track"
              >
                <SkipBack size={24} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-cyan-200 hover:box-glow-cyan transition-all"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
              
              <button 
                onClick={skipForward}
                className="text-cyan-600 hover:text-cyan-300 transition-colors p-2"
                aria-label="Next track"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 px-2">
              <button 
                  onClick={() => setVolume(v => v === 0 ? 0.5 : 0)} 
                  className="text-cyan-600 hover:text-cyan-400 transition-colors"
                >
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-cyan-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
              />
            </div>
          </div>
        </div>

      </div>
      
      {/* Global CSS for visualizer animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; height: 30%; }
          100% { opacity: 1; height: 100%; }
        }
      `}</style>
    </div>
  );
}
