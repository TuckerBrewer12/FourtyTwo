import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type {
  Screen, GameState, GameMode, Domino,
  RoomJoinedPayload, PlayerJoinedPayload, RoomFullPayload,
  SpectatorConfirmedPayload, GameStartedPayload,
  BidPlacedPayload, BiddingCompletePayload, TrumpSetPayload,
  YourTurnPayload, WaitingPayload, DominoPlayedPayload,
  TrickCompletePayload, HandCompletePayload,
} from '../types/game'

export interface Toast {
  id: number;
  msg: string;
  type: 'default' | 'success' | 'error' | 'info';
}

let toastCounter = 0;

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
      unreadChat: 0, statusMsg: 'Waiting…',
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
      set({
        gameState: d.state,
        myHand: hand,
        currentScreen: 'game',
        statusMsg: `Hand ${d.state.hand_num} — Bidding starts with P${d.state.bid_turn}`,
      });
      if (!isSpectator && d.state.phase === 'bidding' && d.state.bid_turn === myPNum) {
        set({ bidModalOpen: true });
      }
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
        } : s.gameState,
      }));
      const { myPNum, isSpectator } = get();
      if (!isSpectator && d.bid_turn === myPNum) set({ bidModalOpen: true });
    });

    socket.on('bidding_complete', (d: BiddingCompletePayload) => {
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
      const SUIT_NAMES = ['Blanks','Aces','Deuces','Treys','Fours','Fives','Sixes'];
      const tn = d.trump === null ? 'No Trump' : `${SUIT_NAMES[d.trump]}s (${d.trump})`;
      get().addToast(`Trump: ${tn}`);
      set({
        gameState: d.state ?? get().gameState,
        statusMsg: `P${d.first_move} leads the first trick`,
      });
    });

    socket.on('your_turn', (d: YourTurnPayload) => {
      set({
        myHand: d.hand ?? get().myHand,
        myTurn: true,
        statusMsg: '⭐ Your turn! Play a domino.',
      });
    });

    socket.on('waiting', (d: WaitingPayload) => {
      const gs = get().gameState;
      const nm = gs?.players?.[d.play_turn] ?? `P${d.play_turn}`;
      set({
        myHand: d.hand ?? get().myHand,
        myTurn: false,
        statusMsg: `Waiting for ${nm} (P${d.play_turn}) to play…`,
      });
    });

    socket.on('domino_played', (d: DominoPlayedPayload) => {
      set(s => ({
        gameState: s.gameState ? { ...s.gameState, trick: d.trick } : s.gameState,
      }));
    });

    socket.on('trick_complete', (d: TrickCompletePayload) => {
      const gs = get().gameState;
      const nm = gs?.players?.[d.winner] ?? `P${d.winner}`;
      get().addToast(`${nm} wins the trick! +${d.trick_score} pts`);
      set(s => ({
        gameState: s.gameState ? {
          ...s.gameState,
          team1_score: d.team1_score,
          team2_score: d.team2_score,
          team1_total: d.team1_total,
          team2_total: d.team2_total,
          trick_count: d.trick_count,
        } : s.gameState,
      }));
      // Clear trick after 800ms
      setTimeout(() => set(s => ({
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

    socket.on('error', (d: { message: string }) =>
      get().addToast(d.message ?? 'Error', 'error'));
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
