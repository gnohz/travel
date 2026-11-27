import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

class StartupBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main style={{ maxWidth: 580, margin: '12vh auto', padding: 28, fontSize: 17, lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 26 }}>旅行指南暂时没有打开</h1>
      <p>请联网后尝试恢复打开。</p>
      <a href="/travel/sedona-recovery.html">恢复打开旅行指南</a>
    </main> : this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><StartupBoundary><App /></StartupBoundary></React.StrictMode>);
