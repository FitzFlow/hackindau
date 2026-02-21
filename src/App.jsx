import { useState, useEffect } from 'react'
import './App.css'

const ALEPHIUM_API = 'https://node.mainnet.alephium.org'
const REFRESH_INTERVAL = 15000 //15 seconds

function App() {
  const [chainData, setChainData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchBlockflowData = async () => {
    try {
      setError(null)
      const processedData = []

      for (let fromGroup = 0; fromGroup < 4; fromGroup++) {
        for (let toGroup = 0; toGroup < 4; toGroup++) {
          const chainIndex = fromGroup * 4 + toGroup
          try {
            const response = await fetch(
              `${ALEPHIUM_API}/blockflow/chain-info?fromGroup=${fromGroup}&toGroup=${toGroup}`
            )
            if (response.ok) {
              const data = await response.json()
              processedData.push({
                chainIndex,
                fromGroup,
                toGroup,
                height: data.currentHeight || 0,
                timestamp: Date.now(),
                txCount: 0
              })
            } else {
              processedData.push({
                chainIndex,
                fromGroup,
                toGroup,
                height: 0,
                timestamp: Date.now(),
                txCount: 0
              })
            }
          } catch (err) {
            console.error(`Error fetching chain ${fromGroup}→${toGroup}:`, err)
            processedData.push({
              chainIndex,
              fromGroup,
              toGroup,
              height: 0,
              timestamp: Date.now(),
              txCount: 0
            })
          }
        }
      }

      setChainData(processedData)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching blockflow data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlockflowData()
    const interval = setInterval(fetchBlockflowData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (loading) {
    return (
      <div className="app">
        <h1>Alephium BlockFlow Visualizer</h1>
        <div className="loading">Loading blockchain data...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Alephium BlockFlow Visualizer</h1>
        <p className="subtitle">Real-time visualization of 16 parallel chains</p>
        {lastUpdate && (
          <p className="last-update">
            Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </header>

      {error && (
        <div className="error">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="blockflow-grid">
        {chainData.map((chain) => (
          <div key={chain.chainIndex} className="chain-card">
            <div className="chain-header">
              Chain {chain.fromGroup} → {chain.toGroup}
            </div>
            <div className="chain-info">
              <div className="info-row">
                <span className="label">Height:</span>
                <span className="value">{chain.height.toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="label">Time:</span>
                <span className="value">{formatTimestamp(chain.timestamp)}</span>
              </div>
              <div className="info-row">
                <span className="label">Tx:</span>
                <span className="value">{chain.txCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer>
        <p>Data updates every {REFRESH_INTERVAL / 1000} seconds</p>
      </footer>
    </div>
  )
}

export default App
