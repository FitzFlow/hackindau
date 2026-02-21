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
  const [newBlocks, setNewBlocks] = useState(new Set())
  const [previousHeights, setPreviousHeights] = useState({})
  const [blockTimes, setBlockTimes] = useState([])

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
              let txCount = 0
              let timestamp = Date.now()

              try {
                const hashResponse = await fetch(
                  `${ALEPHIUM_API}/blockflow/hashes?fromGroup=${fromGroup}&toGroup=${toGroup}&height=${data.currentHeight}`
                )
                if (hashResponse.ok) {
                  const hashData = await hashResponse.json()
                  if (hashData.headers && hashData.headers.length > 0) {
                    const blockHash = hashData.headers[0]
                    const blockResponse = await fetch(
                      `${ALEPHIUM_API}/blockflow/blocks/${blockHash}`
                    )
                    if (blockResponse.ok) {
                      const blockData = await blockResponse.json()
                      txCount = blockData.transactions?.length || 0
                      timestamp = blockData.timestamp || Date.now()
                    }
                  }
                }
              } catch (err) {
                console.error(`Error fetching block details for ${fromGroup}→${toGroup}:`, err)
              }

              processedData.push({
                chainIndex,
                fromGroup,
                toGroup,
                height: data.currentHeight || 0,
                timestamp,
                txCount
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

      setChainData((prevData) => {
        const newBlocksSet = new Set()
        const newBlockTimes = []
        
        processedData.forEach((newChain, index) => {
          const oldChain = prevData[index]
          if (oldChain && newChain.height > oldChain.height) {
            newBlocksSet.add(newChain.chainIndex)
            
            const timeDiff = (newChain.timestamp - oldChain.timestamp) / 1000 // in seconds
            const blockDiff = newChain.height - oldChain.height
            if (blockDiff > 0 && timeDiff > 0) {
              const avgBlockTime = timeDiff / blockDiff
              newBlockTimes.push(avgBlockTime)
            }
          }
        })
        
        if (newBlocksSet.size > 0) {
          setNewBlocks(newBlocksSet)
          setTimeout(() => setNewBlocks(new Set()), 2000)
        }
        
        if (newBlockTimes.length > 0) {
          setBlockTimes(prev => [...prev, ...newBlockTimes].slice(-50))
        }
        
        return processedData
      })
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

  const totalBlocks = chainData.reduce((sum, chain) => sum + (chain.height || 0), 0)
  const totalTxs = chainData.reduce((sum, chain) => sum + (chain.txCount || 0), 0)

  const avgBlockTime = blockTimes.length > 0 
    ? (blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length).toFixed(1)
    : null

  const heights = chainData.map(chain => chain.height || 0)
  const minHeight = Math.min(...heights)
  const maxHeight = Math.max(...heights)
  const heightRange = maxHeight - minHeight || 1

  const getHeatmapColor = (height) => {
    const ratio = (height - minHeight) / heightRange
    const hue = 270 - (ratio * 60)
    const saturation = 60 + (ratio * 40)
    const lightness = 35 + (ratio * 25)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
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
          <div className="stat-badge">
            <span className="stat-label">Total blocks</span>
            <span className="stat-value">{totalBlocks.toLocaleString()}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-label">Total tx</span>
            <span className="stat-value">{totalTxs.toLocaleString()}</span>
          </div>
          {avgBlockTime && (
            <div className="stat-badge blocktime-badge">
              <span className="stat-label">Avg Block Time</span>
              <span className="stat-value">{avgBlockTime}s</span>
              <span className="stat-sublabel">vs BTC ~600s, ETH ~12s</span>
            </div>
          )}
          <div className="stat-badge energy-badge">
            <span className="stat-label">Consensus</span>
            <span className="stat-value">Proof of Less Work</span>
            <span className="stat-sublabel">Energy-efficient mining</span>
          </div>
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
        {chainData.map((chain) => {
          const heatmapColor = getHeatmapColor(chain.height)
          const heightRatio = (chain.height - minHeight) / heightRange
          const isNewBlock = newBlocks.has(chain.chainIndex)
          
          return (
            <div
              key={chain.chainIndex}
              className={`chain-card ${isNewBlock ? 'new-block' : ''}`}
              onClick={() => handleChainClick(chain)}
              style={{ 
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${heatmapColor}15 0%, ${heatmapColor}25 100%)`,
                borderColor: `${heatmapColor}60`,
                boxShadow: `0 4px 20px ${heatmapColor}20`
              }}
            >
              {isNewBlock && (
                <>
                  <div className="particle particle-1"></div>
                  <div className="particle particle-2"></div>
                  <div className="particle particle-3"></div>
                </>
              )}
              <div className="chain-header" style={{ borderBottomColor: `${heatmapColor}50` }}>
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
          )
        })}
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
                    <>
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

                      {chainDetails.blockDetails.transactions && chainDetails.blockDetails.transactions.length > 0 && (
                        <div className="detail-section">
                          <h3>Latest Transactions (Last Block)</h3>
                          <div className="transactions-list">
                            {chainDetails.blockDetails.transactions.slice(0, 5).map((tx, idx) => (
                              <div key={idx} className="transaction-item">
                                <div className="tx-header">
                                  <span className="tx-label">TX #{idx + 1}</span>
                                  <span className="tx-timestamp">
                                    {new Date(chainDetails.blockDetails.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="tx-row">
                                  <span className="tx-detail-label">Hash:</span>
                                  <span className="hash-value">
                                    {tx.unsigned?.txId ? 
                                      `${tx.unsigned.txId.substring(0, 12)}...${tx.unsigned.txId.substring(tx.unsigned.txId.length - 8)}` 
                                      : 'N/A'}
                                  </span>
                                </div>
                                {tx.unsigned?.fixedOutputs && tx.unsigned.fixedOutputs.length > 0 && (
                                  <div className="tx-row">
                                    <span className="tx-detail-label">Amount:</span>
                                    <span className="tx-amount">
                                      {(parseInt(tx.unsigned.fixedOutputs[0].attoAlphAmount) / 1e18).toFixed(4)} ALPH
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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
