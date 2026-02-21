import { useState, useEffect } from 'react'
import './App.css'

const ALEPHIUM_API = 'https://node.mainnet.alephium.org'
const REFRESH_INTERVAL = 15000 //15 seconds

function App() {
  const [chainData, setChainData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [selectedChain, setSelectedChain] = useState(null)
  const [chainDetails, setChainDetails] = useState(null)
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL / 1000)

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
    const interval = setInterval(() => {
      fetchBlockflowData()
      setTimeLeft(REFRESH_INTERVAL / 1000)
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return REFRESH_INTERVAL / 1000
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const handleChainClick = async (chain) => {
    setSelectedChain(chain)
    setChainDetails(null)

    try {
      // Fetch detailed info for this specific chain
      const response = await fetch(
        `${ALEPHIUM_API}/blockflow/chain-info?fromGroup=${chain.fromGroup}&toGroup=${chain.toGroup}`
      )

      if (response.ok) {
        const data = await response.json()
        setChainDetails(data)
      }
    } catch (err) {
      console.error('Error fetching chain details:', err)
    }
  }

  const closeModal = () => {
    setSelectedChain(null)
    setChainDetails(null)
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
        <div className="header-info">
          {lastUpdate && (
            <p className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
          <div className="progress-container">
            <svg className="progress-ring" width="60" height="60">
              <circle
                className="progress-ring-circle-bg"
                cx="30"
                cy="30"
                r="26"
              />
              <circle
                className="progress-ring-circle"
                cx="30"
                cy="30"
                r="26"
                style={{
                  strokeDasharray: `${2 * Math.PI * 26}`,
                  strokeDashoffset: `${2 * Math.PI * 26 * (1 - timeLeft / (REFRESH_INTERVAL / 1000))}`
                }}
              />
              <text
                x="30"
                y="35"
                className="progress-text"
                textAnchor="middle"
              >
                {timeLeft}s
              </text>
            </svg>
          </div>
        </div>
      </header>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      <div className="blockflow-grid">
        {chainData.map((chain) => (
          <div
            key={chain.chainIndex}
            className="chain-card"
            onClick={() => handleChainClick(chain)}
            style={{ cursor: 'pointer' }}
          >
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

      {}
      {selectedChain && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h2>Chain {selectedChain.fromGroup} → {selectedChain.toGroup}</h2>
            <div className="modal-details">
              <div className="detail-section">
                <h3>Basic Info</h3>
                <div className="detail-row">
                  <span className="detail-label">Chain Index:</span>
                  <span className="detail-value">{selectedChain.chainIndex}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">From Group:</span>
                  <span className="detail-value">{selectedChain.fromGroup}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">To Group:</span>
                  <span className="detail-value">{selectedChain.toGroup}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Current Height:</span>
                  <span className="detail-value">{selectedChain.height.toLocaleString()}</span>
                </div>
              </div>

              {chainDetails ? (
                <div className="detail-section">
                  <h3>Chain Details</h3>
                  <div className="detail-row">
                    <span className="detail-label">Current Height:</span>
                    <span className="detail-value">{chainDetails.currentHeight?.toLocaleString()}</span>
                  </div>
                  {chainDetails.currentHashRate && (
                    <div className="detail-row">
                      <span className="detail-label">Hash Rate:</span>
                      <span className="detail-value">{chainDetails.currentHashRate}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="detail-section">
                  <p>Loading chain details...</p>
                </div>
              )}

              <div className="detail-section">
                <h3>About This Chain</h3>
                <p className="detail-description">
                  This chain routes blocks from group {selectedChain.fromGroup} to group {selectedChain.toGroup}. 
                  In Alephium's BlockFlow architecture, each of the 16 chains handles a specific route 
                  between the 4 groups, enabling parallel transaction processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
