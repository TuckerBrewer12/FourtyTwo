#!/usr/bin/env python3
"""
Console-based 42 Domino Game Runner
Handles user interaction and game flow
"""

from fourty_two_game import FourtyTwo


class ConsoleGame:
    def __init__(self):
        self.game = FourtyTwo()
        
        
        self.bids = [None, None, None, None]  # Track bids for each player
        self.highest_bid = None
        self.highest_bidder = None
        self._team1_score = 0
        self._team2_score = 0
        
       
    def get_player_bid(self, player_num, high_bid = -1, high_marks = 1) -> (int, int):
        """Get a valid bid from the player"""
        print(f"\nPlayer {player_num}, your hand:")
        self.display_hand(player_num)
        
        print(f"Current high bid: {high_bid}")
        if high_bid == 0 or high_bid == 42:
            print(f"{high_marks} marks")
        
        while True:
            bid = input("Enter your bid: ").strip().lower()
            if bid:
                bid = int(bid)
                if bid == 0 or bid == 42:
                    marks = int(input("Enter number of marks: "))
                    if marks > (high_marks + 2):
                            print("Marks must be less than or equal to the current high marks + 2")
                            continue
                    if marks < high_marks:
                            print("Marks must be greater than or equal to the current high marks")
                            continue

                    if high_bid != 0 and high_bid != 42:
                        return (bid, marks)

                    if high_bid == 0:
                        if marks == high_marks:
                            print("Marks must be greater than the current high marks")
                            continue
                        else:
                            return (bid, marks)
                    if high_bid == 42:
                        if marks == high_marks:
                            print("Marks must be greater than the current high marks")
                            continue
                        else:
                            return (bid, marks)

                else:
                    if high_bid == 0 or high_bid == 42:
                        print("Bid must be greater than the current high bid")
                        continue
                    elif bid > 42 or bid < 0 or (bid > 0 and bid < 30):
                        print("Bid must be between 30 and 42 or Low (0)")
                        continue
                    elif bid <= high_bid:
                        print("Bid must be greater than the current high bid")
                        continue
                    else:
                        return (bid, 1)
            else:
                print(f"Player {player_num} passed")
                return (high_bid, 1)

       
    
    def bidding_round(self) -> int:
        """Conduct the bidding round"""
        print("\n=== BIDDING ROUND ===")
        print("Players bid in order: 30-42, low, or 42 and low (1-5 marks)")
        print("Low beats everything except 42 marks")
        print("If low is called first, 42 bids must be at least 2 marks")
        
        high_bid = -1
        high_bidder = None
        bids = [-1, -1, -1, -1]
        marks = 1


        # Each player bids in order
        for player in range(1, 5):
            bid = self.get_player_bid(player, high_bid, marks)
            bids[player - 1] = bid[0]

            if bid[0] != -1:
                print(f"Player {player} bids: {bid[0]} {bid[1]} marks")
            else:
                print(f"Player {player} passed")

            marks = bid[1] if marks < bid[1] else marks

            high_bid = next((x for x in reversed(bids) if x != -1), -1)

        high_bidder = bids.index(high_bid) + 1

        print(f"\nHighest bid: {high_bid} by Player {high_bidder}")
        
        # Set the bid in the game
        self.game.set_bid(high_bid)
        
        return high_bidder
    
    def get_first_move(self):
        """Get the player who should lead the first trick"""
        return 1
    
    def display_hand(self, player_num):
        """Display a player's hand in a readable format"""
        print(f"Player {player_num} hand:")
        for i, domino in enumerate(self.game.get_hand(player_num)):
            print(f"  {i+1}: {domino}")
        print()
    
    def display_trick(self, trick):
        """Display the current trick"""
        if not trick:
            print("No trick in progress")
            return
        
        print("Current trick:")
        for i, domino in enumerate(trick):
            print(f"  Player {i+1}: {domino}")
        print()
    
    def get_player_move(self, player_num):
        """Get a valid move from the player"""
        self.display_hand(player_num)
        while True:
            try:
                choice = int(input(f"Choose domino (1-{len(self.game.get_hand(player_num))}): ")) - 1
                if 0 <= choice < len(self.game.get_hand(player_num)):
                    return self.game.get_hand(player_num)[choice]
                else:
                    print("Invalid choice. Please choose 1-7.")
            except ValueError:
                print("Please enter a number.")
    
    def play_trick(self):
        """Play a complete trick"""
        winner = 1
        
        return winner
    
    def get_trump(self):
        while True:
            trump = input("Enter the trump: 0-6 for trump, -1 for no trump")
            try:
                trump = int(trump)
                if trump >= 0 and trump <= 6:
                    return trump
                elif trump == -1:
                    return None
                else:
                    print("Invalid trump")
                    continue
            except ValueError:
                print("Invalid trump")
                continue
            return
    
    def run_game(self):
        """Main game loop"""
        print("Welcome to 42!")
        print("==============")
        
        # Deal dominoes
        self.game.deal_dominoes()
        
        # Bidding round
        highest_bidder = self.bidding_round()
        
        #Get Trump
        trump = self.get_trump()

        #Set Trump
        self.game.set_trump(trump)
        print(f"Trump is: {trump}")
        print()

        tricks_played = 0

        first_move = highest_bidder
        while tricks_played < 7:
            print(f"\n--- Trick {tricks_played + 1} ---")
            
            # Play the trick
            winner = self.play_trick(first_move)
            tricks_played += 1
            first_move = winner
            self.update_team_score(winner, self.game.trick_score())
            print(f"Team 1 score: {self._team1_score}, Team 2 score: {self._team2_score}")
            self.game.clear_trick()
            
            input("Press Enter to continue...")
        
        print("\nGame complete!")
        team1_score, team2_score = self.game.get_team_scores()
        print(f"Final scores - Team 1: {team1_score}, Team 2: {team2_score}")
        
        if team1_score > team2_score:
            print("Team 1 wins!")
        elif team2_score > team1_score:
            print("Team 2 wins!")
    
    def play_trick(self, first_move):
        for i in range(4):
            player_num = (first_move - 1 + i) % 4 + 1
            domino = self.get_player_move(player_num)
            self.game.play(player_num, domino)
            self.display_trick(self.game.get_trick())
        winner = self.game.get_trick_winner(first_move=first_move)
        return winner
    
    def update_team_score(self, winner, score):
        if winner % 2 == 1:
            self._team1_score += score
        else:
            self._team2_score += score

def main():
    """Entry point"""
    game = ConsoleGame()
    game.run_game()

if __name__ == "__main__":
    main()
