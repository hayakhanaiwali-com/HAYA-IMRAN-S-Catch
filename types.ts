export type ItemType = 'apple' | 'banana' | 'cherry' | 'orange';

export interface GameItem {
  id: number;
  type: ItemType;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  speed: number;
}

export type GameStatus = 'idle' | 'playing' | 'gameover';

export type GameEvent = 'start' | 'catch_streak' | 'miss_streak' | 'gameover';

export interface GameState {
  items: GameItem[];
  score: number;
  misses: number;
  status: GameStatus;
  playerX: number; // Percentage 0-100
}