export type Domino = [number, number];

export type GamePhase =
  | 'waiting'
  | 'bidding'
  | 'trump_selection'
  | 'playing'
  | 'hand_complete'
  | 'game_complete';

export type GameMode = 'points_250' | 'marks_7';

export type Screen =
  | 'lobby'
  | 'invite'
  | 'spectate-offer'
  | 'waiting'
  | 'game'
  | 'gameover'
  | 'tutorial';

export interface TrickEntry {
  player: number;
  domino: Domino;
}

export interface ChatMessage {
  sender: string;
  msg: string;
  spectator: boolean;
}

export interface HandHistoryEntry {
  hand_num: number;
  bid_team: number;
  high_bid: number;
  made: boolean;
  t1_gained: number;
  t2_gained: number;
  t1_total: number;
  t2_total: number;
}

export interface GameState {
  room_id: string;
  game_mode: GameMode;
  phase: GamePhase;
  hand_num: number;
  dealer: number;
  players: Record<string, string>;
  spectators: string[];
  num_players: number;
  num_spectators: number;
  bid_turn: number;
  play_turn: number;
  first_move: number;
  trick_count: number;
  trick: TrickEntry[];
  team1_score: number;
  team2_score: number;
  team1_total: number;
  team2_total: number;
  team1_marks: number;
  team2_marks: number;
  high_bid: number | null;
  high_bidder: number | null;
  high_marks: number | null;
  trump: number | null;
  last_trick_winner: number | null;
  chat_history: ChatMessage[];
  hand_history: HandHistoryEntry[];
  hand?: Domino[];
  // Server-computed: never recalculate these on the client
  team_map: Record<number, 1 | 2>;
  tile_counts: Record<number, number>;
  available_bids: number[];
  total_tricks: number;
  win_target: number;
  max_bid: number;
  bid_log?: BidLogEntry[];
  settings?: {
    bid_timer: number;
    chat_mode: 'emoji' | 'text' | 'off';
    allow_spectators: boolean;
    marks_target: number;
    nelo: boolean;
    plunge: boolean;
  };
}

/* ---- Server → Client event payloads ---- */

export interface RoomJoinedPayload {
  room_id: string;
  player_num: number;
  name: string;
  game_mode: GameMode;
  state: GameState;
}

export interface PlayerJoinedPayload {
  player_num: number;
  name: string;
  state: GameState;
}

export interface RoomFullPayload {
  room_id: string;
  num_players: number;
  num_spectators: number;
  message: string;
}

export interface SpectatorConfirmedPayload {
  room_id: string;
  name: string;
  state: GameState;
}

export interface GameStartedPayload {
  state: GameState;
  seat_map: Record<number, 'north' | 'south' | 'east' | 'west'>;
}

export interface BidLogEntry {
  player: number;
  name: string;
  bid: number;
  marks: number;
}

export interface BidPlacedPayload {
  player_num: number;
  bid: number;
  marks: number;
  bid_turn: number;
  bids_placed: number;
  high_bid: number | null;
  high_bidder: number | null;
  high_marks: number | null;
  available_bids: number[];
  bid_log?: BidLogEntry[];
}

export interface BiddingCompletePayload {
  high_bidder: number;
  high_bid: number;
  high_marks: number;
  state: GameState;
}

export interface TrumpSetPayload {
  trump: number | null;
  first_move: number;
  state: GameState;
}

export type SeatMap = Record<number, 'north' | 'south' | 'east' | 'west'>;

export interface YourTurnPayload {
  hand: Domino[];
  play_turn: number;
  action: 'play';
  valid_plays: Domino[];
  seat_map: SeatMap;
}

export interface WaitingPayload {
  hand: Domino[];
  play_turn: number;
  action: 'wait';
  seat_map: SeatMap;
}

export interface DominoPlayedPayload {
  player_num: number;
  domino: Domino;
  trick: TrickEntry[];
}

export interface TrickCompletePayload {
  winner: number;
  winner_name: string;
  team: number;
  trick_score: number;
  trick_dominos: Domino[];
  team1_score: number;
  team2_score: number;
  team1_total: number;
  team2_total: number;
  trick_count: number;
}

export interface GameAbandonedPayload {
  player_num: number;
  name: string;
  message: string;
  state: GameState;
}

export interface HandCompletePayload {
  bid_team: number;
  opp_team: number;
  high_bid: number;
  high_marks: number;
  made: boolean;
  t1_this_hand: number;
  t2_this_hand: number;
  t1_gained: number;
  t2_gained: number;
  team1_total: number;
  team2_total: number;
  team1_marks: number;
  team2_marks: number;
  game_over: boolean;
  winner_team: 1 | 2;   // hand winner; also game winner when game_over is true
  state: GameState;
}
