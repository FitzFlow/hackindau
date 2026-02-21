import { useState, useEffect } from 'react'
import './App.css'
import alephiumLogo from './img/alephiumLogo.png'
import alephiumArt from './img/alephium.jpg'

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
      const chainInfoResponse = await fetch(
        `${ALEPHIUM_API}/blockflow/chain-info?fromGroup=${chain.fromGroup}&toGroup=${chain.toGroup}`
      )

      if (chainInfoResponse.ok) {
        const chainInfo = await chainInfoResponse.json()
        const hashResponse = await fetch(
          `${ALEPHIUM_API}/blockflow/hashes?fromGroup=${chain.fromGroup}&toGroup=${chain.toGroup}&height=${chainInfo.currentHeight}`
        )

        let blockDetails = null
        if (hashResponse.ok) {
          const hashData = await hashResponse.json()
          if (hashData.headers && hashData.headers.length > 0) {
            const blockHash = hashData.headers[0]
            const blockResponse = await fetch(
              `${ALEPHIUM_API}/blockflow/blocks/${blockHash}`
            )

            if (blockResponse.ok) {
              blockDetails = await blockResponse.json()
            }
          }
        }

        setChainDetails({
          ...chainInfo,
          blockDetails
        })
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
        <header>
          <h1>Alephium BlockFlow Visualizer</h1>
          <p className="subtitle">Real-time visualization of 16 parallel chains</p>
        </header>
        <div className="blockflow-grid">
          {Array.from({ length: 16 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="chain-card skeleton-card">
              <div className="skeleton-header" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="brand-row">
          <img className="brand-logo" src={alephiumLogo} alt="Alephium logo" />
          <h1>Alephium BlockFlow Visualizer</h1>
        </div>
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
                <>
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

                  {chainDetails.blockDetails && (
                    <div className="detail-section">
                      <h3>Mining Difficulty</h3>
                      <div className="detail-row">
                        <span className="detail-label">Target:</span>
                        <span className="detail-value difficulty-value">
                          {chainDetails.blockDetails.target}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Block Hash:</span>
                        <span className="detail-value hash-value">
                          {chainDetails.blockDetails.hash.substring(0, 16)}...
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Timestamp:</span>
                        <span className="detail-value">
                          {new Date(chainDetails.blockDetails.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Transactions:</span>
                        <span className="detail-value">
                          {chainDetails.blockDetails.transactions?.length || 0}
                        </span>
                      </div>
                      <div className="difficulty-info">
                        <small>
                          💡 The target value represents mining difficulty. Lower values = harder to mine = more miners on the network.
                        </small>
                      </div>
                    </div>
                  )}
                </>
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
