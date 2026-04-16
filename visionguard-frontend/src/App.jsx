import React, { useState, useEffect } from 'react';
import { Activity, Camera, AlertTriangle, FileText, BarChart2, Settings } from 'lucide-react';

const App = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB') + ' WIB');

  // Static alerts matching your HTML exactly for now
  const [alerts, setAlerts] = useState([
    { id: 1, sev: 'critical', species: 'King cobra', zone: 'Zone A', cam: 'CAM-01', conf: 91, time: '2m ago' },
    { id: 2, sev: 'moderate', species: 'Stray cat', zone: 'Zone B', cam: 'CAM-04', conf: 83, time: '8m ago' },
    { id: 3, sev: 'low', species: 'Gecko', zone: 'Zone C', cam: 'CAM-06', conf: 71, time: '42m ago' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-GB') + ' WIB'), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <nav className="sidebar">
        <div className="logo">
          <div className="logo-icon"></div>
          VISIONGUARD AI
        </div>
        
        <div className="nav-section">Monitor</div>
        <div className="nav-item active"><Activity size={16} style={{marginRight: '12px'}}/> Dashboard</div>
        <div className="nav-item"><Camera size={16} style={{marginRight: '12px'}}/> Camera Feeds</div>
        <div className="nav-item">
          <AlertTriangle size={16} style={{marginRight: '12px'}}/> Alerts 
          <span className="nav-badge" id="alert-badge">{alerts.length}</span>
        </div>

        <div className="nav-section">Analysis</div>
        <div className="nav-item"><FileText size={16} style={{marginRight: '12px'}}/> Incident Log</div>
        <div className="nav-item"><BarChart2 size={16} style={{marginRight: '12px'}}/> Analytics</div>

        <div className="nav-section">Settings</div>
        <div className="nav-item"><Settings size={16} style={{marginRight: '12px'}}/> Model Config</div>

        <div className="sidebar-footer">
          <div className="model-info-card">
            <div className="info-label">Model</div>
            <div className="info-value">YOLOv8-nano</div>
            <div className="info-sub">TensorRT · Jetson Nano</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: '87%' }}></div></div>
            <div className="info-sub" style={{ marginTop: '4px' }}>87% mAP@0.5</div>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <span className="topbar-subtitle">Warehouse Bio-Hazard Detection System</span>
          <div className="topbar-right">
            <div className="live-badge"><div className="pulse-dot"></div> LIVE</div>
            <div className="topbar-time">{time}</div>
          </div>
        </header>

        {/* STATS GRID */}
        <div className="stat-grid">
          <div className="stat-card critical">
            <div className="stat-label">Critical Alerts</div>
            <div className="stat-value critical" id="crit-count">1</div>
            <div className="stat-sub">Snake detected · Zone A</div>
          </div>
          <div className="stat-card moderate">
            <div className="stat-label">Moderate Alerts</div>
            <div className="stat-value moderate" id="mod-count">2</div>
            <div className="stat-sub">Cats detected · Zones B, D</div>
          </div>
          <div className="stat-card low">
            <div className="stat-label">Low Alerts</div>
            <div className="stat-value low" id="low-count">3</div>
            <div className="stat-sub">Geckos · 24h total</div>
          </div>
          <div className="stat-card ok">
            <div className="stat-label">Avg Response</div>
            <div className="stat-value ok">1.4s</div>
            <div className="stat-sub">Target: &lt;2.0s ✓</div>
          </div>
        </div>

        {/* MAIN PANELS */}
        <div className="content-grid">
          {/* CAMERA FEEDS */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Live Camera Feeds</span>
              <div className="panel-actions">
                <button className="btn-sm active">All</button>
                <button className="btn-sm">Alerts Only</button>
              </div>
            </div>
            <div className="camera-grid">
              {/* Alert Camera */}
              <div className="camera-feed alert">
                <div className="cam-scene-placeholder"></div>
                <div className="noise-overlay"></div>
                <div className="cam-grid-overlay"></div>
                <div className="bbox" style={{ top: '30%', left: '40%', width: '20%', height: '40%' }}>
                  <div className="bbox-label">KING COBRA 0.91</div>
                </div>
                <div className="cam-status alert">ALERT</div>
                <div className="cam-label">CAM-01 · Zone A</div>
              </div>

              {/* Standard Cameras (Looping 5 times to match design) */}
              {[2, 3, 4, 5, 6].map((num) => (
                <div className="camera-feed" key={num}>
                  <div className="cam-scene-placeholder"></div>
                  <div className="noise-overlay"></div>
                  <div className="cam-grid-overlay"></div>
                  <div className="cam-status live">LIVE</div>
                  <div className="cam-label">CAM-0{num} · Zone {String.fromCharCode(64 + Math.ceil(num/2))}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SIDE PANELS */}
          <div className="side-panels">
            {/* ALERT FEED */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Alert Feed</span>
                <span className="panel-subtitle">Updated now</span>
              </div>
              <div className="alert-feed" id="alert-feed-container">
                {alerts.map((alert) => (
                  <div className="alert-item" key={alert.id}>
                    <div className={`alert-sev ${alert.sev}`}></div>
                    <div className="alert-body">
                      <div className="alert-title">
                        {alert.sev === 'critical' ? '⚠ ' : ''}{alert.species} detected
                      </div>
                      <div className="alert-meta">{alert.cam} · {alert.zone} · {alert.time}</div>
                    </div>
                    <div className={`alert-conf ${alert.sev}`}>{alert.conf}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SYSTEM STATUS */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">System Status</span>
              </div>
              <div className="system-row">
                <div className="sys-dot ok"></div><span className="sys-label">Edge inference</span><span className="sys-val">22 FPS</span>
              </div>
              <div className="system-row">
                <div className="sys-dot ok"></div><span className="sys-label">MQTT broker</span><span className="sys-val">connected</span>
              </div>
              <div className="system-row">
                <div className="sys-dot ok"></div><span className="sys-label">Backend API</span><span className="sys-val">12ms</span>
              </div>
              <div className="system-row">
                <div className="sys-dot ok"></div><span className="sys-label">Dedup window</span><span className="sys-val">30s active</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;