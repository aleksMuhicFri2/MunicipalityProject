import React, { useState } from "react";

function FilterPanel({ onSearch, municipalities, isLoading }) {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState("najem");
  const [size, setSize] = useState(50);
  const [budget, setBudget] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [hasCar, setHasCar] = useState(true);
  const [desiredDemo, setDesiredDemo] = useState("Delavno Prebivalstvo");

  const [weights, setWeights] = useState({
    affordability: 5,
    transport: 5,
    weather: 5,
    healthcare: 5,
  });

  const handleWeightChange = (key, val) => {
    setWeights((prev) => ({ ...prev, [key]: parseInt(val) }));
  };

  const triggerSearch = () => {
    onSearch({
      mode,
      size: parseInt(size),
      budget: parseFloat(budget) || (mode === "najem" ? 800 : 200000),
      workLocation,
      hasCar,
      desiredDemo,
      weights,
    });
  };

  const getSliderStyle = (val, min, max) => {
    const percentage = ((val - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
    };
  };

  return (
    <div className="filters-view fade-in space-y-6 pb-20">
      {/* HEADER S POMOČJO */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nastavitve iskanja</h2>
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          {showHelp ? <span className="text-lg">✕</span> : <span className="text-lg font-bold">?</span>}
        </button>
      </div>

      {/* OSVEŽENA INFO PLOŠČA */}
      {showHelp && (
        <div className="bg-white border-2 border-blue-500 rounded-3xl p-6 shadow-2xl animate-fadeIn relative overflow-hidden">
          {/* Dekorativni element v ozadju */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full -z-10"></div>
          
          <h3 className="text-blue-600 font-black text-lg mb-4 flex items-center gap-2">
             Navodila za uporabo
          </h3>
          
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="text-2xl">🛑</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Strogi kriteriji</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong>Proračun</strong> in <strong>velikost</strong> sta absolutna filtra. Občine, ki ne dosegajo teh pogojev, bodo takoj odstranjene z zemljevida.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl">⚖️</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Sistem točkovanja</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Z <strong>drsniki</strong> določate, kaj vam je pomembno. Višja vrednost (10) pomeni, da bo ta faktor močno vplival na uvrstitev občine med Top 5.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl">🗺️</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Transportna logika</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Če izberete <strong>Kraj službe</strong>, algoritem uporabi Google Maps za izračun realnega časa vožnje glede na vaš način prevoza.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium italic">
              Namig: Poskusite različne kombinacije uteži, da vidite, kako se spreminja barvna toplotna karta na zemljevidu.
            </p>
          </div>
        </div>
      )}

      {/* NAČIN BIVANJA */}
      <div className="filter-group">
        <label className="filter-label">Način bivanja</label>
        <div className="segmented-control">
          <div className={`segmented-item ${mode === "najem" ? "active" : ""}`} onClick={() => setMode("najem")}>Najem</div>
          <div className={`segmented-item ${mode === "nakup" ? "active" : ""}`} onClick={() => setMode("nakup")}>Nakup</div>
          <div className={`segmented-slider mode-${mode}`}></div>
        </div>
      </div>

      {/* VELIKOST IN PRORAČUN */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <label className="filter-label">Velikost: {size} m²</label>
          <input 
            type="range" min="10" max="200" value={size} 
            onChange={(e) => setSize(e.target.value)}
            className="modern-slider"
            style={getSliderStyle(size, 10, 200)}
          />
        </div>
        <div className="metric-card">
          <label className="filter-label">Proračun (€)</label>
          <input 
            type="number" 
            placeholder={mode === "najem" ? "800" : "200000"}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="modern-input"
          />
        </div>
      </div>

      {/* SLUŽBA */}
      <div className="metric-card">
        <label className="filter-label">Kraj službe & Transport</label>
        <select className="modern-select mb-4" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)}>
          <option value="">Brez (ni pomembno)</option>
          {municipalities.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-slate-600">Imam avto</span>
          <label className="switch">
            <input type="checkbox" checked={hasCar} onChange={(e) => setHasCar(e.target.checked)} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* DRSNIKI Z NAVODILI */}
      <div className="space-y-4">
        <div className="px-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Prioritete</h3>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <span>1 = sploh mi ni pomembno</span>
            <span>10 = zelo mi je pomembno</span>
          </div>
        </div>
        
        {Object.keys(weights).map((key) => (
          <div key={key} className="metric-card py-4">
            <div className="flex justify-between items-center mb-1">
              <div className="flex flex-col">
                <label className="filter-label !mb-0">
                  {key === 'affordability' ? 'Dostopnost (Cena)' : 
                   key === 'transport' ? 'Bližina službe' : 
                   key === 'weather' ? 'Vreme' : 'Zdravstvo'}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                   {key === 'affordability' ? 'Cene nepremičnin' : 
                    key === 'transport' ? 'Čas vožnje in oddaljenost' : 
                    key === 'weather' ? 'Sončni dnevi' : 'Dostop do zdravnika'}
                </span>
              </div>
              <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{weights[key]}</span>
            </div>
            <input 
              type="range" min="1" max="10" value={weights[key]}
              onChange={(e) => handleWeightChange(key, e.target.value)}
              className="modern-slider"
              style={getSliderStyle(weights[key], 1, 10)}
            />
          </div>
        ))}
      </div>

      {/* DEMOGRAFIJA */}
      <div className="filter-group">
        <label className="filter-label">Želena demografija</label>
        <div className="segmented-control">
          {["Mlado", "Delavno", "Staro"].map(type => (
            <div 
              key={type}
              className={`segmented-item ${desiredDemo.startsWith(type) ? "active" : ""}`}
              onClick={() => setDesiredDemo(`${type} Prebivalstvo`)}
            >
              {type}
            </div>
          ))}
          <div className={`segmented-slider demo-${desiredDemo.split(" ")[0]}`}></div>
        </div>
      </div>

      <button onClick={triggerSearch} className={`find-button ${isLoading ? "opacity-50" : ""}`} disabled={isLoading}>
        {isLoading ? "ANALIZIRAM..." : "NAJDI NAJBOLJŠE OBČINE"}
      </button>
    </div>
  );
}

export default FilterPanel;