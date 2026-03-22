import { useGameStore } from '../../store/gameStore'
import Modal from '../shared/Modal'

export default function RulesModal() {
  const rulesModalOpen = useGameStore(s => s.rulesModalOpen)
  if (!rulesModalOpen) return null;
  const close = () => useGameStore.setState({ rulesModalOpen: false })

  return (
    <Modal onClose={close}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '.75rem' }}>📖 How to Play 42</h3>
      <div style={{ fontSize: '.82rem', lineHeight: 1.65, color: 'var(--text-muted)', maxHeight: '55vh', overflowY: 'auto' }}>
        <Section title="Overview">
          42 is a trick-taking domino game for 4 players (2 teams). Your goal is to earn points through tricks and count dominoes.
        </Section>
        <Section title="Setup">
          <ul style={{ paddingLeft: '1.1rem' }}>
            <li>28 double-six dominoes — each player draws <strong>7 tiles</strong>.</li>
            <li>Teams: P1 &amp; P3 vs P2 &amp; P4.</li>
            <li>The player left of the dealer bids first.</li>
          </ul>
        </Section>
        <Section title="Bidding">
          <ul style={{ paddingLeft: '1.1rem' }}>
            <li>Minimum bid is <strong>30</strong>. Pass if you can't beat the current high.</li>
            <li>Bid <strong>Low (0)</strong> to play without trump — your team must score no count tiles.</li>
            <li>Bid <strong>42</strong> — your team must capture all 42 points.</li>
            <li>If all pass, the dealer is forced to bid 30.</li>
          </ul>
        </Section>
        <Section title="Count Dominoes (35 pts)">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
            <thead><tr><th style={th}>Domino</th><th style={th}>Value</th></tr></thead>
            <tbody>
              {[['[5|5]','10 pts'],['[6|4]','10 pts'],['[5|0]','5 pts'],['[4|1]','5 pts'],['[3|2]','5 pts']].map(([d, v]) => (
                <tr key={d}><td style={td}>{d}</td><td style={{ ...td, color: 'var(--t1)', fontWeight: 600 }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Trick Play">
          <ul style={{ paddingLeft: '1.1rem' }}>
            <li>Leader plays any tile. Others <strong>must follow suit</strong> if able.</li>
            <li>Highest trump wins; otherwise highest tile of lead suit wins.</li>
            <li>Winner of each trick leads the next.</li>
          </ul>
        </Section>
        <Section title="Scoring">
          <ul style={{ paddingLeft: '1.1rem' }}>
            <li>7 tricks + 35 pip points = <strong>42 per hand</strong>.</li>
            <li><strong>Bid made:</strong> both teams keep their points.</li>
            <li><strong>Bid failed:</strong> bidding team scores 0; opponents get bid + their points.</li>
          </ul>
        </Section>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={close} style={{
          background: 'var(--accent)', color: '#fff', padding: '.65rem 1.4rem',
          borderRadius: 'var(--radius)', fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>Got it!</button>
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h4 style={{ color: 'var(--accent)', fontWeight: 700, margin: '1rem 0 .35rem', fontSize: '.88rem' }}>{title}</h4>
      <div>{children}</div>
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left', color: 'var(--text-faint)', padding: '.2rem .4rem',
  fontSize: '.72rem', textTransform: 'uppercase',
}
const td: React.CSSProperties = {
  padding: '.25rem .4rem', borderTop: '1px solid var(--border)',
}
