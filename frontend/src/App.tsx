import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'

import LobbyScreen    from './components/lobby/LobbyScreen'
import InviteScreen   from './components/lobby/InviteScreen'
import SpectateOffer  from './components/lobby/SpectateOffer'
import WaitingRoom    from './components/lobby/WaitingRoom'
import GameBoard      from './components/game/GameBoard'
import GameOverScreen from './components/gameover/GameOverScreen'
import Tutorial        from './components/tutorial/Tutorial'

import BidModal        from './components/modals/BidModal'
import TrumpModal      from './components/modals/TrumpModal'
import HandResultModal from './components/modals/HandResultModal'
import RulesModal      from './components/modals/RulesModal'
import SettingsModal   from './components/modals/SettingsModal'

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
    const autoJoin = params.get('autoJoin') === '1'
    const autoName = params.get('name')

    if (room && autoJoin && autoName) {
      // Auto-join for test bots — init socket, wait for connect, then emit join directly
      const delay = parseInt(params.get('delay') ?? '0', 10)
      setTimeout(() => {
        const store = useGameStore.getState()
        store.initSocket()
        const waitForSocket = setInterval(() => {
          const sock = useGameStore.getState().socket
          if (sock?.connected) {
            clearInterval(waitForSocket)
            useGameStore.setState({ myName: autoName })
            sock.emit('join_game', { name: autoName, room_id: room.toUpperCase() })
          }
        }, 200)
      }, delay)
    } else if (room) {
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
      {currentScreen === 'tutorial'        && <Tutorial onClose={() => useGameStore.setState({ currentScreen: 'lobby' })} />}

      {/* Global overlays */}
      <BidModal />
      <TrumpModal />
      <HandResultModal />
      <RulesModal />
      <SettingsModal />

      {/* Chat — only during game */}
      {isGame && <ChatPanel />}
      {isGame && <ChatToggle />}

      <ToastStack />
    </>
  )
}
