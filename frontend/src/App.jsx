import React, { useEffect, useState } from "react";
import SloveniaMap from "./components/SloveniaMap";
import MunicipalityPanel from "./components/MunicipalityPanel";

function App() {
  const [selectedCode, setSelectedCode] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State to switch between 'dashboard' and 'inputs'
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    if (!selectedCode) return;
    setLoading(true);
    fetch(`http://localhost:5000/api/municipality/${selectedCode}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setCurrentView("dashboard"); // Automatically switch to dashboard when a city is clicked
      })
      .finally(() => setLoading(false));
  }, [selectedCode]);

  return (
    <>
      {/* FIXED TOP HEADER */}
      <header className="fixed-header">
        <h1 className="page-title">Najboljše občine</h1>
        
        <nav className="nav-menu">
          <button 
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : 'inactive'}`}
            onClick={() => setCurrentView("dashboard")}
          >
            📊 Pregled Podatkov
          </button>
          <button 
            className={`nav-btn ${currentView === 'inputs' ? 'active' : 'inactive'}`}
            onClick={() => setCurrentView("inputs")}
          >
            ⚙️ Nastavitve Filtrov
          </button>
        </nav>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="app-container">
        
        {/* LEFT SIDE: Conditional Rendering */}
        <div className="panel-section">
          {currentView === "dashboard" ? (
            loading ? (
              <div className="empty-state-container"><h2>Nalaganje...</h2></div>
            ) : (
              <MunicipalityPanel data={data} />
            )
          ) : (
            <div className="fade-in">
              <h2 className="city-name">Nastavitve Filtrov</h2>
              <p className="sub-text">Tukaj lahko prilagodite svoje preference za iskanje najboljše občine.</p>
              
              {/* Example Input Options */}
              <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
                <div className="metric-card">
                  <label className="card-title">Prioriteta Cene</label>
                  <input type="range" className="w-full" />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>Ceneje</span>
                    <span>Dražje</span>
                  </div>
                </div>
                
                <div className="metric-card">
                  <label className="card-title">Regija</label>
                  <select className="w-full p-2 border rounded-lg mt-2">
                    <option>Vse regije</option>
                    <option>Osrednjeslovenska</option>
                    <option>Gorenjska</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Map (Always Visible) */}
        <div className="map-section">
          <div style={{ width: "90%", height: "90%" }}>
            <SloveniaMap 
              selectedCode={selectedCode} 
              onSelectMunicipality={setSelectedCode} 
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;