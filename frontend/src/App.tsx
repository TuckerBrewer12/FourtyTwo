import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'

import LobbyScreen    from './components/lobby/LobbyScreen'
import InviteScreen   from './components/lobby/InviteScreen'
import SpectateOffer  from './components/lobby/SpectateOffer'
import WaitingRoom    from './components/lobby/WaitingRoom'
import GameBoard      from './components/game/GameBoard'
import GameOverScreen from './components/gameover/GameOverScreen'

import BidModal        from './components/modals/BidModal'
import TrumpModal      from './components/modals/TrumpModal'
import HandResultModal from './components/modals/HandResultModal'
import RulesModal      from './components/modals/RulesModal'

import ChatPanel  from './components/chat/ChatPanel'
import ChatToggle from './components/chat/ChatToggle'
import ToastStack from './components/shared/Toast'

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen)

  useEffect(() => {
    // Detect invite link on boot
    const params = new URLSearchParams(window.location.search)
    const qRoom  = params.get('room')
    const pRoom  = window.location.pathname.match(/\/join\/([A-Z0-9]+)/i)?.[1]
    const room   = qRoom ?? pRoom
    if (room) {
      useGameStore.setState({
        inviteRoomCode: room.toUpperCase(),
        currentScreen: 'invite',
      })
    }
  }, [])

  const isGame = currentScreen === 'game'

  return (
    <>
      {currentScreen === 'lobby'          && <LobbyScreen />}
      {currentScreen === 'invite'         && <InviteScreen />}
      {currentScreen === 'spectate-offer' && <SpectateOffer />}
      {currentScreen === 'waiting'        && <WaitingRoom />}
      {currentScreen === 'game'           && <GameBoard />}
      {currentScreen === 'gameover'       && <GameOverScreen />}

      {/* Global overlays */}
      <BidModal />
      <TrumpModal />
      <HandResultModal />
      <RulesModal />

      {/* Chat — only during game */}
      {isGame && <ChatPanel />}
      {isGame && <ChatToggle />}

      <ToastStack />
    </>
  )
}
