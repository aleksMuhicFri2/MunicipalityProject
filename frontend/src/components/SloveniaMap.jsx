import React, { useEffect, useState } from "react";
import { parseSloveniaSvg } from "../utils/ParseSloveniaSvg";

const REGION_COLORS = {
  gorenjska: "#4F83CC", goriska: "#5C9DED", "obalno-kraska": "#3A7CA5",
  "notranjsko-kraska": "#6BAED6", osrednjeslovenska: "#2F6DAE", zasavska: "#4A90E2",
  savinjska: "#5DA9E9", koroska: "#3F88C5", podravska: "#6CA6CD",
  pomurska: "#7FB3D5", posavska: "#5B8DB8", jugovzhodna: "#4C72B0",
};

function SloveniaMap({ selectedCode, onSelectMunicipality, scoreLookup }) {
  const [municipalities, setMunicipalities] = useState([]);
  const [regionByCode, setRegionByCode] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/api/municipalities/regions").then(res => res.json()).then(setRegionByCode);
  }, []);

  useEffect(() => {
    if (!Object.keys(regionByCode).length) return;
    fetch("/SloveniaMap.svg").then(res => res.text()).then(svgText => {
      const parsed = parseSloveniaSvg(svgText);
      setMunicipalities(parsed.map(m => ({ ...m, region: regionByCode[m.code] })));
    });
  }, [regionByCode]);

  const getScoreColor = (score) => {
    if (score === undefined || score === null) return "#334155"; 
    const hue = score * 1.2; 
    return `hsl(${hue}, 80%, 45%)`;
  };

  return (
    <div className="map-container w-full flex flex-col items-center">
      {/* LEGENDA (Prikaže se samo, ko imamo rezultate) */}
      {scoreLookup && (
        <div className="map-legend-wrapper fade-in w-full max-w-md mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slabše ujemanje</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Boljše ujemanje</span>
          </div>
          
          {/* Gradientna vrstica */}
          <div className="h-2 w-full rounded-full shadow-inner" 
               style={{ background: 'linear-gradient(to right, hsl(0, 80%, 45%), hsl(60, 80%, 45%), hsl(120, 80%, 45%))' }}>
          </div>
          
          <div className="flex justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#b358c3' }}></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Izbrana občina</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#334155' }}></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Izločena občina (previsoka cena)</span>
            </div>
          </div>
        </div>
      )}

      {/* ZEMLJEVID */}
      <svg viewBox="375000 -200000 250000 180000" style={{ width: "95%", height: "auto", display: "block" }}>
        {municipalities.flatMap((m) =>
          m.dList.map((d, i) => {
            const isSelected = selectedCode === m.code;
            let fillColor = isSelected 
              ? "#581c87" 
              : (scoreLookup ? getScoreColor(scoreLookup[m.code]) : (REGION_COLORS[m.region] ?? "#e5e7eb"));

            return (
              <path
                key={`${m.code}-${i}`}
                d={d}
                fill={fillColor}
                stroke={isSelected ? "#a855f7" : "rgba(255,255,255,0.3)"}
                strokeWidth={isSelected ? 100 : 20}
                className={`municipality-path ${isSelected ? "selected-pulse" : ""}`}
                style={{ transition: 'fill 0.5s ease, stroke-width 0.2s ease' }}
                onClick={() => onSelectMunicipality(m.code)}
              />
            );
          })
        )}
      </svg>

      <style>{`
        .municipality-path { cursor: pointer; paint-order: stroke fill; }
        .municipality-path:hover { filter: brightness(1.2); }
        
        .selected-pulse {
          animation: pulsePurple 2s infinite ease-in-out;
          z-index: 10;
        }

        @keyframes pulsePurple {
          0% { fill: #581c87; filter: brightness(1); }
          50% { fill: #7e22ce; filter: brightness(1.2); }
          100% { fill: #581c87; filter: brightness(1); }
        }

        .map-legend-wrapper {
          padding: 0 1rem;
        }
      `}</style>
    </div>
  );
}

export default SloveniaMap;