from domino import Domino
from domino import Domino
from domino_set import DominoesSet
from player import Player, InvalidMoveError
import random

class InvalidBidError(Exception):
    pass

class FourtyTwo:
    def __init__(self):
        self._trump = None
        self._trick = []
        self._first_move = 1
        self._winner = 1

        self._join_calls = 0

        self.domino_set = DominoesSet()
        self.player_hands = [[], [], [], []] 

        self._bids = {}
        self._high_bid = -1
        self._high_bidder = None
        self._high_marks = 1

        self._player1 = Player(1)
        self._player2 = Player(2)
        self._player3 = Player(3)
        self._player4 = Player(4)

        self._players = [self._player1, self._player2, self._player3, self._player4]

        self._team1_score = 0
        self._team2_score = 0

        self._bid = -1


    def shuffle(self) -> None:
        self.domino_set.shuffle()
        self._deal_dominoes()

    def _deal_dominoes(self) -> None:
        self.player_hands = self.domino_set.get_hands()
        self._player1.set_hand(self.player_hands[0])
        self._player2.set_hand(self.player_hands[1])
        self._player3.set_hand(self.player_hands[2])
        self._player4.set_hand(self.player_hands[3])

    def play(self, player: int, domino: Domino) -> bool:
        if len(self._trick) == 0:
            self._first_move = player
        try:
            self._players[player - 1].move(domino)
        except InvalidMoveError:
            return False
        self._trick.append(domino)
        return True

    def join(self) -> None:
        self._join_calls += 1
        return self._join_calls
    
    def num_players(self) -> int:
        return self._join_calls
    
    def num_bids(self) -> int:
        return len(self._bids)
    
    def bid(self, player: int, bid: int, marks: int = 1) -> None:
        if self.check_bid(player, bid, marks):
            self._bids[player] = (bid, marks)
        else:
            raise InvalidBidError
    
    def set_high_bid(self, player: int, bid: int, marks: int) -> None:
        self._high_bidder = player
        self._high_bid = bid
        self._high_marks = marks
    
    
    def check_bid(self, player: int, bid: int, marks: int) -> bool:
        if bid == -1:
            return True
        if bid == 0 or bid == 42:
            if self._high_bid != 0 and self._high_bid!= 42:
                if marks > (self._high_marks + 1):
                    return False
                else:
                    self.set_high_bid(player, bid, marks)
                    return True
            if marks > (self._high_marks + 2):
                #print("Marks must be less than or equal to the current high marks + 2")  
                return False
            elif marks <= self._high_marks:
                #print("Marks must be greater than or equal to the current high marks")
                return False

            if self._high_bid != 0 and self._high_bid != 42:
                self.set_high_bid(player, bid, marks)
                return True

            if self._high_bid == 0:
                if marks == self._high_marks:
                    #print("Marks must be greater than the current high marks")
                    return False
                else:
                    self.set_high_bid(player, bid, marks)
                    return True
            if self._high_bid == 42:
                if marks == self._high_marks:
                    #print("Marks must be greater than the current high marks")
                    return False
                else:
                    self.set_high_bid(player, bid, marks)
                    return True

        else:
            if marks!= 1:
                return False
            if self._high_bid == 0 or self._high_bid == 42:
                #print("Bid must be greater than the current high bid")
                return False
                
            elif bid > 42 or bid < 0 or (bid > 0 and bid < 30):
                #print("Bid must be between 30 and 42 or Low (0)")
                return False
                
            elif bid <= self._high_bid:
                #print("Bid must be greater than the current high bid")
                return False
            else:
                self.set_high_bid(player, bid, marks)
                return True

    
    def get_hand(self, player: int) -> list['Domino']:
        return self._players[player - 1].hand()

    def set_trump(self, trump: int) -> None:
        self._trump = trump

    def set_bid(self, bid: str) -> None:
        """Set the winning bid for the hand"""
        self._bid = bid
    
    def get_high_bid(self) -> tuple[int, int, int]:
        return (self._high_bidder, self._high_bid, self._high_marks)

    def set_first_move(self, first_move: int) -> None:
        self._first_move = first_move

    def _set_trick(self, trick: list['Domino'], first_move: int = None) -> None:
        self._trick = trick
        self._first_move = first_move

    def get_trick(self) -> list['Domino']:
        return self._trick

    def trick_score(self) -> int:
        score = 1
        for domino in self._trick:
            score += domino.value()
        return score

    def set_winner(self, winner: int) -> None:
        if winner % 2 == 1:
            self._team1_score += self.trick_score()
        else:
            self._team2_score += self.trick_score()
        self._trick = []
    
    def get_trick_winner(self, trick: list['Domino'] = None, first_move: int = None) -> int:
        """
        Decides the winner of the trick
        Returns the player number (1-4) who won
        """
        if trick:
            self._trick = trick
        if first_move:
            self._first_move = first_move

        if not self._trick:
            return 0
            
        winning_domino = self._trick[0]

        # Get the lead suit - players must follow suit if they can
        if winning_domino.contains(self._trump):
            lead_suit = self._trump
        else:
            # If no trump was led, the lead suit is the higher side of the first domino
            lead_suit = winning_domino.high_side()
        
        winner = 0
        
        for index, domino in enumerate(self._trick[1:], start=1):
            #domino contains trump
            if domino.contains(self._trump):
                #current winner is also trump — compare within trump suit
                if winning_domino.contains(self._trump):
                    if domino.low_side(self._trump) > winning_domino.low_side(self._trump):
                        winning_domino = domino
                        winner = index
                #current winner is not trump — new trump domino beats it
                else:
                    winning_domino = domino
                    winner = index

            #domino contains high side but not trump
            elif domino.contains(lead_suit):
                #non trump domino cannot beat a trump 
                if lead_suit == self._trump:
                    continue
                #trump has not been played
                elif winning_domino.high_side(lead_suit=lead_suit) == winning_domino.low_side(lead_suit=lead_suit):
                    continue 
                elif domino.high_side(lead_suit=lead_suit) == domino.low_side(lead_suit=lead_suit):
                    winning_domino = domino
                    winner = index
                elif domino.low_side(lead_suit=lead_suit) > winning_domino.low_side(lead_suit=lead_suit):
                    winning_domino = domino
                    winner = index

            #if domino does not have trump or high side, it cannot win
        return (self._first_move - 1 + winner) % 4 + 1

    def get_team_scores(self) -> tuple[int, int]:
        """Get current team scores"""
        return (self._team1_score, self._team2_score)

    def clear_trick(self) -> None:
        """Clear the current trick"""
        self._trick = []

    def deal_dominoes(self) -> None:
        """Deal dominoes to players (alias for shuffle for backward compatibility)"""
        self.shuffle()

    def get_bid(self) -> int:
        """Get the current winning bid value"""
        return self._high_bid

    def set_forced_bid(self, player: int, bid: int, marks: int = 1) -> None:
        """Set the winning bid directly (used when all players pass and dealer is forced to bid)."""
        self._high_bidder = player
        self._high_bid    = bid
        self._high_marks  = marks

    def reset_hand(self) -> None:
        """Reset all hand-level state for a new hand while preserving team marks"""
        self._trump = None
        self._trick = []
        self._first_move = 1
        self._winner = 1
        self._join_calls = 0
        self.domino_set = DominoesSet()
        self.player_hands = [[], [], [], []]
        self._bids = {}
        self._high_bid = -1
        self._high_bidder = None
        self._high_marks = 1
        self._bid = -1
        self._player1 = Player(1)
        self._player2 = Player(2)
        self._player3 = Player(3)
        self._player4 = Player(4)
        self._players = [self._player1, self._player2, self._player3, self._player4]
        self._team1_score = 0
        self._team2_score = 0








        
