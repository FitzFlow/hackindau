# Alephium BlockFlow Visualizer

Real-time visualization of Alephium's unique 16-chain parallel architecture (4 groups × 4 chains).

## 📖 What is this?

This project visualizes Alephium's BlockFlow algorithm, showing all 16 chains producing blocks in parallel. Each chain is represented by a card displaying:
- Block height
- Timestamp of the last block
- Number of transactions

Data is fetched from the Alephium mainnet API and refreshes every 15 seconds.

## 🚀 How to run

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
# Build the project
npm run build

# Preview production build
npm run preview
```

## 🏗️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **Alephium Node API** - Blockchain data source

## 📊 Features

- ✅ Real-time display of all 16 chains in a 4×4 grid
- ✅ Live data from Alephium mainnet
- ✅ Auto-refresh every 15 seconds
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Clean and modern UI

## 🎯 Hackathon Track

This project is submitted for the **BlockFlow Visualization / UI + Data Challenge** track of the Hackin'Dau x Alephium hackathon.

## 📝 License

MIT
