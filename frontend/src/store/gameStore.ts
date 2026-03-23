import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type {
  Screen, GameState, GameMode, Domino, SeatMap,
  RoomJoinedPayload, PlayerJoinedPayload, RoomFullPayload,
  SpectatorConfirmedPayload, GameStartedPayload,
  BidPlacedPayload, BiddingCompletePayload, TrumpSetPayload,
  YourTurnPayload, WaitingPayload, DominoPlayedPayload,
  TrickCompletePayload, HandCompletePayload, GameAbandonedPayload,
} from '../types/game'

export interface Toast {
  id: number;
  msg: string;
  type: 'default' | 'success' | 'error' | 'info';
}

let toastCounter = 0;
let biddingTimer: ReturnType<typeof setInterval> | null = null;

function clearBiddingTimer() {
  if (biddingTimer !== null) { clearInterval(biddingTimer); biddingTimer = null; }
}

interface GameStore {
  // Screen
  currentScreen: Screen;

  // Identity
  myPNum: number | null;
  myRoom: string | null;
  myName: string;
  isSpectator: boolean;
  inviteRoomCode: string | null;
  pendingRoom: string | null;

  // Game
  gameState: GameState | null;
  myHand: Domino[];
  myTurn: boolean;
  pendingPlay: Domino | null;
  lastTrickWinner: number | null;
  wonTricksPerPlayer: Record<number, Domino[][]>;
  biddingCountdown: number | null;
  validPlays: Domino[];
  seatMap: SeatMap | null;

  // Modal visibility
  bidModalOpen: boolean;
  trumpModalOpen: boolean;
  handResultData: HandCompletePayload | null;  // non-null = modal open
  rulesModalOpen: boolean;
  gameOverData: HandCompletePayload | null;    // non-null = game over screen

  // Status bar
  statusMsg: string;

  // Chat
  chatOpen: boolean;
  unreadChat: number;

  // Toasts
  toasts: Toast[];

  // Socket
  socket: Socket | null;

  // ---- Actions ----
  setScreen: (s: Screen) => void;
  setStatus: (msg: string) => void;
  addToast: (msg: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;
  goLobby: () => void;
  setChatOpen: (open: boolean) => void;
  initSocket: () => void;

  // Emit helpers
  emitCreateRoom: (name: string, mode: GameMode) => void;
  emitJoinGame: (name: string, roomId: string) => void;
  emitJoinSpectator: (name: string, roomId: string) => void;
  emitBid: (bid: number, marks: number) => void;
  emitSetTrump: (trump: number) => void;
  emitPlay: (domino: Domino) => void;
  emitNewHand: () => void;
  emitChat: (msg: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentScreen: 'lobby',
  myPNum: null,
  myRoom: null,
  myName: '',
  isSpectator: false,
  inviteRoomCode: null,
  pendingRoom: null,
  gameState: null,
  myHand: [],
  myTurn: false,
  pendingPlay: null,
  lastTrickWinner: null,
  wonTricksPerPlayer: {},
  biddingCountdown: null,
  validPlays: [],
  seatMap: null,
  bidModalOpen: false,
  trumpModalOpen: false,
  handResultData: null,
  rulesModalOpen: false,
  gameOverData: null,
  statusMsg: 'Waiting…',
  chatOpen: false,
  unreadChat: 0,
  toasts: [],
  socket: null,

  setScreen: (currentScreen) => set({ currentScreen }),
  setStatus: (statusMsg) => set({ statusMsg }),

  addToast: (msg, type = 'default') => {
    const id = ++toastCounter;
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  setChatOpen: (chatOpen) => set(s => ({
    chatOpen,
    unreadChat: chatOpen ? 0 : s.unreadChat,
  })),

  goLobby: () => {
    set({
      myPNum: null, myRoom: null, myHand: [], gameState: null,
      isSpectator: false, currentScreen: 'lobby',
      bidModalOpen: false, trumpModalOpen: false,
      handResultData: null, gameOverData: null, chatOpen: false,
      unreadChat: 0, statusMsg: 'Waiting…', pendingPlay: null, lastTrickWinner: null, wonTricksPerPlayer: {}, biddingCountdown: null,
      validPlays: [], seatMap: null,
    });
    window.history.replaceState({}, '', '/');
  },

  initSocket: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io({ transports: ['websocket', 'polling'] });
    set({ socket });

    socket.on('connect', () => console.log('[socket] connected'));

    socket.on('room_joined', (d: RoomJoinedPayload) => {
      set({
        myPNum: d.player_num,
        myRoom: d.room_id,
        isSpectator: false,
        gameState: d.state,
        currentScreen: 'waiting',
      });
    });

    socket.on('player_joined', (d: PlayerJoinedPayload) => {
      set(s => ({ gameState: d.state ?? s.gameState }));
      get().addToast(`${d.name} (P${d.player_num}) joined`);
    });

    socket.on('room_full', (d: RoomFullPayload) => {
      set({ pendingRoom: d.room_id, currentScreen: 'spectate-offer' });
    });

    socket.on('spectator_confirmed', (d: SpectatorConfirmedPayload) => {
      set({
        myPNum: null,
        myRoom: d.room_id,
        isSpectator: true,
        gameState: d.state,
        currentScreen: 'game',
        statusMsg: 'You are spectating — enjoy the game!',
      });
    });

    socket.on('spectator_joined', (d: { name: string }) =>
      get().addToast(`👀 ${d.name} is now spectating`, 'info'));

    socket.on('spectator_left', (d: { name: string }) =>
      get().addToast(`${d.name} stopped spectating`, 'info'));

    socket.on('game_started', (d: GameStartedPayload) => {
      const { myPNum, isSpectator } = get();
      const hand = d.state.hand ?? [];
      const shouldBid = !isSpectator && d.state.phase === 'bidding' && d.state.bid_turn === myPNum;
      set({
        gameState: d.state,
        myHand: hand,
        currentScreen: 'game',
        biddingCountdown: 3,
        seatMap: d.seat_map ?? null,
        validPlays: [],
        wonTricksPerPlayer: {},
        statusMsg: `Hand ${d.state.hand_num} — Look at your hand — bidding starts in 3s`,
      });
      clearBiddingTimer();
      let n = 3;
      biddingTimer = setInterval(() => {
        n--;
        if (n <= 0) {
          clearBiddingTimer();
          set({
            biddingCountdown: null,
            statusMsg: `Hand ${d.state.hand_num} — Bidding starts with P${d.state.bid_turn}`,
          });
          // Only open if still in bidding phase and this player's turn
          const gs = get().gameState;
          if (shouldBid && gs?.phase === 'bidding' && gs?.bid_turn === myPNum) {
            set({ bidModalOpen: true });
          }
        } else {
          set({ biddingCountdown: n });
        }
      }, 1000);
    });

    socket.on('bid_placed', (d: BidPlacedPayload) => {
      const bidStr = d.bid === -1 ? 'passed'
        : d.bid === 0  ? `bid Low (${d.marks}m)`
        : d.bid === 42 ? `bid 42 (${d.marks}m)`
        : `bid ${d.bid}`;
      get().addToast(`P${d.player_num} ${bidStr}`);
      set(s => ({
        statusMsg: `Bidding — P${d.bid_turn}'s turn`,
        gameState: s.gameState ? {
          ...s.gameState,
          high_bid: d.high_bid,
          high_bidder: d.high_bidder,
          high_marks: d.high_marks,
          available_bids: d.available_bids ?? s.gameState.available_bids,
        } : s.gameState,
      }));
      const { myPNum, isSpectator } = get();
      if (!isSpectator && d.bid_turn === myPNum && d.bids_placed < 4) set({ bidModalOpen: true });
    });

    socket.on('bidding_complete', (d: BiddingCompletePayload) => {
      clearBiddingTimer();
      const bs = d.high_bid === 0 ? `Low (${d.high_marks}m)`
        : d.high_bid === 42 ? `42 (${d.high_marks}m)` : `${d.high_bid}`;
      get().addToast(`P${d.high_bidder} won the bid: ${bs}`);
      const { myPNum, isSpectator } = get();
      set({ gameState: d.state ?? get().gameState });
      if (!isSpectator && d.high_bidder === myPNum) {
        set({ trumpModalOpen: true, statusMsg: 'You won the bid — select trump!' });
      } else {
        set({ statusMsg: `P${d.high_bidder} is selecting trump…` });
      }
    });

    socket.on('trump_set', (d: TrumpSetPayload) => {
      clearBiddingTimer();
      const SUIT_NAMES = ['Blanks','Aces','Deuces','Treys','Fours','Fives','Sixes'];
      const tn = d.trump === null ? 'No Trump' : `${SUIT_NAMES[d.trump]}s (${d.trump})`;
      get().addToast(`Trump: ${tn}`);
      set({
        gameState: d.state ?? get().gameState,
        trumpModalOpen: false,
        statusMsg: `P${d.first_move} leads the first trick`,
      });
    });

    socket.on('your_turn', (d: YourTurnPayload) => {
      clearBiddingTimer();
      set({
        myHand: d.hand ?? get().myHand,
        myTurn: true,
        validPlays: d.valid_plays ?? [],
        seatMap: d.seat_map ?? get().seatMap,
        statusMsg: '⭐ Your turn! Play a domino.',
      });
    });

    socket.on('waiting', (d: WaitingPayload) => {
      const gs = get().gameState;
      const nm = gs?.players?.[d.play_turn] ?? `P${d.play_turn}`;
      set({
        myHand: d.hand ?? get().myHand,
        myTurn: false,
        validPlays: [],
        seatMap: d.seat_map ?? get().seatMap,
        statusMsg: `Waiting for ${nm} (P${d.play_turn}) to play…`,
      });
    });

    socket.on('domino_played', (d: DominoPlayedPayload) => {
      set(s => ({
        pendingPlay: null,
        gameState: s.gameState ? { ...s.gameState, trick: d.trick } : s.gameState,
      }));
    });

    socket.on('trick_complete', (d: TrickCompletePayload) => {
      const gs = get().gameState;
      const nm = gs?.players?.[d.winner] ?? `P${d.winner}`;
      get().addToast(`${nm} wins the trick! +${d.trick_score} pts`);
      set(s => ({
        lastTrickWinner: d.winner,
        wonTricksPerPlayer: {
          ...s.wonTricksPerPlayer,
          [d.winner]: [...(s.wonTricksPerPlayer[d.winner] ?? []), d.trick_dominos],
        },
        gameState: s.gameState ? {
          ...s.gameState,
          team1_score: d.team1_score,
          team2_score: d.team2_score,
          team1_total: d.team1_total,
          team2_total: d.team2_total,
          trick_count: d.trick_count,
        } : s.gameState,
      }));
      // Clear active trick display after 800ms (won tricks persist in wonTricksPerPlayer)
      setTimeout(() => set(s => ({
        lastTrickWinner: null,
        gameState: s.gameState ? { ...s.gameState, trick: [] } : s.gameState,
      })), 800);
    });

    socket.on('hand_complete', (d: HandCompletePayload) => {
      set(s => ({
        gameState: s.gameState ? {
          ...s.gameState,
          team1_total: d.team1_total,
          team2_total: d.team2_total,
          team1_marks: d.team1_marks,
          team2_marks: d.team2_marks,
        } : s.gameState,
      }));
      if (d.game_over) {
        set({ gameOverData: d, currentScreen: 'gameover' });
      } else {
        set({ handResultData: d });
      }
    });

    socket.on('game_state', (d: GameState) => {
      const hand = d.hand ?? get().myHand;
      set({ gameState: d, myHand: hand });
    });

    socket.on('player_left', (d: { name: string }) =>
      get().addToast(`${d.name} left the game`, 'info'));

    socket.on('chat_message', (d: { sender: string; msg: string; spectator: boolean }) => {
      set(s => ({
        gameState: s.gameState ? {
          ...s.gameState,
          chat_history: [...(s.gameState.chat_history ?? []), d].slice(-25),
        } : s.gameState,
        unreadChat: s.chatOpen ? 0 : s.unreadChat + 1,
      }));
    });

    socket.on('error', (d: { message: string }) => {
      get().addToast(d.message ?? 'Error', 'error');
      // If the server rejected a play, put the domino back
      const pp = get().pendingPlay;
      if (pp) {
        set(s => ({ myHand: [...s.myHand, pp], pendingPlay: null, myTurn: true }));
      }
    });

    socket.on('game_abandoned', (d: GameAbandonedPayload) => {
      get().addToast(`⚠️ ${d.name} disconnected`, 'error');
      set(s => ({
        statusMsg: d.message || 'A player disconnected. Start a new hand when ready.',
        gameState: d.state ?? s.gameState,
      }));
    });
  },

  emitCreateRoom: (name, mode) => {
    set({ myName: name });
    get().initSocket();
    get().socket?.emit('create_room', { name, game_mode: mode });
  },

  emitJoinGame: (name, roomId) => {
    set({ myName: name });
    get().initSocket();
    get().socket?.emit('join_game', { name, room_id: roomId });
  },

  emitJoinSpectator: (name, roomId) => {
    get().initSocket();
    get().socket?.emit('join_spectator', { name, room_id: roomId });
  },

  emitBid: (bid, marks) => {
    get().socket?.emit('bid', { room_id: get().myRoom, bid, marks });
    set({ bidModalOpen: false, statusMsg: 'Bid submitted — waiting…' });
  },

  emitSetTrump: (trump) => {
    get().socket?.emit('set_trump', { room_id: get().myRoom, trump });
    set({ trumpModalOpen: false });
  },

  emitPlay: (domino) => {
    if (!get().myTurn || get().isSpectator) return;
    get().socket?.emit('play', { room_id: get().myRoom, domino });
    set(s => ({
      myTurn: false,
      pendingPlay: domino,
      validPlays: [],
      myHand: s.myHand.filter(([a, b]) => !(a === domino[0] && b === domino[1])),
      statusMsg: 'Domino played — waiting for others…',
    }));
  },

  emitNewHand: () => {
    get().socket?.emit('new_hand', { room_id: get().myRoom });
    set({ handResultData: null, myHand: [], statusMsg: 'New hand starting…' });
  },

  emitChat: (msg) => {
    get().socket?.emit('send_chat', { room_id: get().myRoom, message: msg });
  },
}))
