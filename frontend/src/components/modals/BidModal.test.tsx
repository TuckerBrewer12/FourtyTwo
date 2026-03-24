/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
// React import not needed with JSX transform
import { useGameStore } from '../../store/gameStore';
import BidModal from './BidModal';
import TrumpModal from './TrumpModal';
import HandArea from '../game/HandArea';

// Mock components
vi.mock('../domino/Domino', () => ({
  default: () => <div data-testid="domino">Domino</div>
}));
vi.mock('../shared/Modal', () => ({
  default: ({ children }: any) => <div data-testid="modal">{children}</div>
}));

describe('Frontend Component Rendering During Bidding', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentScreen: 'game',
      myPNum: 1,
      isSpectator: false,
      myHand: [[6,6], [6,5], [6,4], [6,3], [6,2], [6,1], [6,0]],
      bidModalOpen: true,
      trumpModalOpen: false,
      gameState: {
        phase: 'bidding',
        bid_turn: 1,
        hand_num: 1,
        players: {1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4'},
        high_bid: -1,
        high_bidder: null,
        high_marks: 1,
        available_bids: [30, 31, 32, 42],
        trump: null,
        trick: []
      } as any,
      toasts: []
    });
  });

  it('renders BidModal without crashing', () => {
    const { getByText } = render(<BidModal />);
    expect(getByText('Your Bid')).toBeDefined();
  });

  it('renders BidModal without crashing when available_bids is missing', () => {
    useGameStore.setState(s => ({
      gameState: { ...s.gameState, available_bids: undefined } as any
    }));
    const { getByText } = render(<BidModal />);
    expect(getByText('Your Bid')).toBeDefined();
  });

  it('renders TrumpModal without crashing', () => {
    useGameStore.setState({ bidModalOpen: false, trumpModalOpen: true });
    const { getByText } = render(<TrumpModal />);
    expect(getByText('Select Trump Suit')).toBeDefined();
  });

  it('renders HandArea smoothly during bidding', () => {
    const { getAllByTestId } = render(<HandArea />);
    expect(getAllByTestId('domino').length).toBe(7);
  });
});
