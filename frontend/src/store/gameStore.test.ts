import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    connected: true,
};

vi.mock('socket.io-client', () => ({
    io: () => mockSocket
}));

describe('useGameStore Game Flow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useGameStore.setState({
            currentScreen: 'lobby',
            myPNum: null,
            myRoom: null,
            gameState: null,
            myHand: [],
            bidModalOpen: false,
            trumpModalOpen: false,
            biddingCountdown: null,
            validPlays: []
        });
        vi.clearAllMocks();
    });

    it('successfully completes a game loop without crashing (join, bid, trump, play)', () => {
        const store = useGameStore.getState();

        // 1. Join Game
        store.emitJoinGame('Texas Pete', 'ROOM42');
        expect(mockSocket.emit).toHaveBeenCalledWith('join_game', { name: 'Texas Pete', room_id: 'ROOM42' });

        // Extract registered socket listeners
        const callbacks: Record<string, Function> = {};
        mockSocket.on.mock.calls.forEach(([event, cb]) => {
            callbacks[event] = cb;
        });

        expect(callbacks['room_joined']).toBeDefined();

        // 2. Server says joined
        callbacks['room_joined']({
            room_id: 'ROOM42',
            player_num: 1,
            name: 'Texas Pete',
            game_mode: 'points_250',
            state: { phase: 'waiting' }
        });

        expect(useGameStore.getState().myPNum).toBe(1);
        expect(useGameStore.getState().currentScreen).toBe('waiting');

        // 3. Game Starts (4 players present)
        const mockHand = [[6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0]];
        callbacks['game_started']({
            state: {
                hand_num: 1,
                phase: 'bidding',
                bid_turn: 1,
                hand: mockHand,
            },
            seat_map: { 1: 'south', 2: 'west', 3: 'north', 4: 'east' }
        });

        expect(useGameStore.getState().myHand).toEqual(mockHand);

        // Verify fast-forwarding 10s timer forces BidModal open for P1
        vi.advanceTimersByTime(10000);
        expect(useGameStore.getState().bidModalOpen).toBe(true);

        // 4. P1 Bids 30
        useGameStore.getState().emitBid(30, 1);
        expect(useGameStore.getState().bidModalOpen).toBe(false);
        expect(mockSocket.emit).toHaveBeenCalledWith('bid', { room_id: 'ROOM42', bid: 30, marks: 1 });

        // Server broadcasts P1 bid
        callbacks['bid_placed']({
            player_num: 1, bid: 30, marks: 1, bid_turn: 2, bids_placed: 1,
            high_bid: 30, high_bidder: 1, high_marks: 1, available_bids: [31, 32, 42]
        });

        let state = useGameStore.getState().gameState;
        expect(state!.high_bid).toBe(30);

        // 5. P2, P3, P4 pass
        callbacks['bid_placed']({ player_num: 2, bid: -1, marks: 1, bid_turn: 3, bids_placed: 2, high_bid: 30, high_bidder: 1, high_marks: 1, available_bids: [31, 32, 42] });
        callbacks['bid_placed']({ player_num: 3, bid: -1, marks: 1, bid_turn: 4, bids_placed: 3, high_bid: 30, high_bidder: 1, high_marks: 1, available_bids: [31, 32, 42] });
        callbacks['bid_placed']({ player_num: 4, bid: -1, marks: 1, bid_turn: 1, bids_placed: 4, high_bid: 30, high_bidder: 1, high_marks: 1, available_bids: [] });

        // 6. Server says bidding complete
        callbacks['bidding_complete']({
            high_bidder: 1,
            high_bid: 30,
            high_marks: 1,
            state: { phase: 'trump_selection' }
        });

        // Because I'm Player 1 and I won, my trumpModalOpen should be True.
        expect(useGameStore.getState().trumpModalOpen).toBe(true);

        // 7. P1 sets trump
        useGameStore.getState().emitSetTrump(6);
        expect(useGameStore.getState().trumpModalOpen).toBe(false);
        expect(mockSocket.emit).toHaveBeenCalledWith('set_trump', { room_id: 'ROOM42', trump: 6 });

        // Server broadcasts trump set
        callbacks['trump_set']({
            trump: 6,
            first_move: 1,
            state: { phase: 'playing' }
        });

        // 8. Server tells P1 it's their turn
        callbacks['your_turn']({
            hand: mockHand,
            play_turn: 1,
            action: 'play',
            valid_plays: mockHand // all valid on first turn
        });

        expect(useGameStore.getState().myTurn).toBe(true);

        // 9. P1 plays [6, 6]
        useGameStore.getState().emitPlay([6, 6]);
        expect(useGameStore.getState().myTurn).toBe(false);
        expect(mockSocket.emit).toHaveBeenCalledWith('play', { room_id: 'ROOM42', domino: [6, 6] });

        callbacks['domino_played']({
            player_num: 1, domino: [6, 6], trick: [{ domino: [6, 6], player: 1 }]
        });

        // At the end, did it crash?
        expect(useGameStore.getState().myHand).toHaveLength(6);
        console.log("Mock test completed successfully without exceptions!");
    });
});
