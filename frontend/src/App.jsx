import React, { useEffect, useState, useRef } from "react";
import SloveniaMap from "./components/SloveniaMap";
import MunicipalityPanel from "./components/MunicipalityPanel";
import FilterPanel from "./components/FilterPanel";
import { calculateMunicipalityScores } from "./utils/ScoringAlgorithm";
import "./index.css";

function App() {
  const [selectedCode, setSelectedCode] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); 
  const [currentView, setCurrentView] = useState("filter"); 
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [scoreLookup, setScoreLookup] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/municipalities/all")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllMunicipalities(data);
      })
      .catch(err => console.error("Napaka pri prenosu:", err));
  }, []);

  const handleSelectMunicipality = (code) => {
    setSelectedCode(code);
    setCurrentView("dashboard");
    setLoading(true);
    fetch(`http://localhost:5000/api/municipality/${code}`)
      .then(r => r.json())
      .then(json => setData(json))
      .finally(() => setLoading(false));
  };

  const handleResetFilters = () => {
    setScoreLookup(null);
    setRecommendations([]);
    setCurrentView("filter");
    setSelectedCode(null);
    setData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNajdiObcine = async (prefs) => {
    setLoading(true);
    try {
      const result = await calculateMunicipalityScores(allMunicipalities, prefs, (step) => {
        setLoadingStep(step);
      });
      
      setRecommendations(result.top5);
      setScoreLookup(result.scoreLookup);
      
      if (result.top5.length > 0) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 600);
      }
    } catch (error) {
      console.error("Napaka pri iskanju:", error);
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="main-wrapper">
      {/* --- FIKSNA GLAVA --- */}
      <header className="fixed-header px-10 flex items-center justify-between">
        <div className="flex-1">
          {scoreLookup && (
            <button className="nav-btn active flex items-center gap-2" onClick={handleResetFilters}>
              <span>🔄</span> Ponovno Filtriraj
            </button>
          )}
        </div>
        
        <h1 className="page-title uppercase tracking-tighter font-black">Najboljše občine</h1>
        
        <div className="flex-1 flex justify-end">
          {/* SPREMENJEN GUMB: IZ PUŠČICE V BESEDILO */}
          <button 
            className="h-11 px-6 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
            onClick={() => setCurrentView(currentView === "filter" ? "dashboard" : "filter")}
          >
            {currentView === "filter" ? "Prikaži podatke →" : "← Nazaj na filter"}
          </button>
        </div>
      </header>

      {/* --- OSREDNJI DEL (Filtri + Mapa) --- */}
      <div className="app-container">
        <div className="panel-section relative">
          {currentView === "dashboard" ? (
            <MunicipalityPanel data={data} loading={loading} />
          ) : (
            <FilterPanel onSearch={handleNajdiObcine} municipalities={allMunicipalities} isLoading={loading} />
          )}

          {loading && currentView === "filter" && (
            <div className="loading-overlay">
              <div className="loading-card">
                <div className="loading-steps">
                  <div className={`step ${loadingStep >= 1 ? 'active' : ''}`}>
                    <span className="dot"></span> Proračunski filter
                  </div>
                  <div className={`step ${loadingStep >= 2 ? 'active' : ''}`}>
                    <span className="dot"></span> Geografska bližina
                  </div>
                  <div className={`step ${loadingStep >= 3 ? 'active' : ''}`}>
                    <span className="dot"></span> Google Maps poti
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`map-section flex items-center justify-center bg-slate-50 ${loading ? 'map-thinking' : ''}`}>
          <SloveniaMap selectedCode={selectedCode} onSelectMunicipality={handleSelectMunicipality} scoreLookup={scoreLookup} currentView={currentView} />
        </div>
      </div>

      {/* --- TOP 5 KARTICE --- */}
      {recommendations.length > 0 && (
        <div ref={resultsRef} className="recommendations-section fade-in border-t bg-slate-100 py-12 px-4">
          <div className="max-w-[100%] mx-auto">
            <h2 className="text-3xl font-black mb-10 text-center text-slate-800 tracking-tight uppercase">
              Najboljša ujemanja
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {recommendations.map((m, idx) => {
                const getBarColor = (val) => `hsl(${val * 12}, 75%, 45%)`;
                const rankColor = idx === 0 ? '#10B981' : '#3B82F6';

                return (
                  <div 
                    key={m.code} 
                    className={`group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border-b-4 flex flex-col justify-between cursor-pointer ${selectedCode === m.code ? 'ring-4 ring-purple-500/30' : ''}`}
                    style={{ borderBottomColor: rankColor }}
                    onClick={() => {
                      handleSelectMunicipality(m.code);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                          <div 
                              className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white text-xl font-black"
                              style={{ backgroundColor: rankColor }}
                          >
                              {idx + 1}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="text-lg font-black text-slate-800 leading-tight truncate">{m.name}</h3>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest leading-none">{m.region || "Slovenija"}</p>
                          </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 mb-6 border border-slate-100">
                        <span className="text-lg">{m.travelTime ? "⏱️" : "📍"}</span>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-black text-slate-700 leading-none truncate">
                            {m.travelTime || `${m.airDistanceKm} km`}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {m.travelTime ? "Vožnja" : "Zračno"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        {[
                          { label: "Vreme", val: m.weatherIndex || 5, icon: "☀️" },
                          { label: "Cena", val: m.affIndex || 5, icon: "💰" }
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex justify-between text-[9px] font-bold uppercase mb-1 px-1">
                              <span className="text-slate-500">{item.icon} {item.label}</span>
                              <span className="text-slate-800 font-black">{item.val}/10</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-[1px] border border-slate-200/50">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ 
                                  width: `${item.val * 10}%`, 
                                  backgroundColor: getBarColor(item.val) 
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Prebivalstvo</span>
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                          {m.main_demographic || "Mešano"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;