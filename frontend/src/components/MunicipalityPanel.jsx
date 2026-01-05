import React from "react";
import { Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function MunicipalityPanel({ data }) {
  if (!data) {
    return (
      <div className="empty-state-container">
        <div className="empty-content">
          <span className="map-icon">📍</span>
          <h2>Izberite občino</h2>
          <p>Kliknite na zemljevid za podrobno analizo.</p>
        </div>
      </div>
    );
  }

  const populationTotal = (data.population_young || 0) + (data.population_working || 0) + (data.population_old || 0);
  
  const popChartData = {
    labels: ["Mladi", "Aktivni", "Starejši"],
    datasets: [{
      data: [data.population_young, data.population_working, data.population_old],
      backgroundColor: ["#60A5FA", "#10B981", "#F59E0B"],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: { legend: { display: false } }
  };

  // Logika barv
  const getHealthColor = (val) => (val >= 90 ? "#10B981" : val >= 80 ? "#F59E0B" : "#EF4444");
  const getWeatherColor = (val) => (val >= 7.5 ? "#10B981" : val >= 5.0 ? "#F59E0B" : "#EF4444");

  return (
    <div className="muni-dashboard fade-in">
      {/* Glava */}
      <header className="mb-4">
        <h1 className="text-2xl font-black text-slate-800 leading-tight">{data.name}</h1>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{data.region}</span>
      </header>

      {/* 1. Prebivalstvo */}
      <div className="metric-card hero flex items-center justify-between mb-3 bg-slate-50">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500">Prebivalstvo</label>
          <div className="text-3xl font-black text-slate-900 leading-none my-1">
            {populationTotal.toLocaleString('sl-SI')}
          </div>
          <div className="demographic-badge text-[10px] py-1 px-3">{data.main_demographic}</div>
        </div>
        <div className="chart-wrapper h-20 w-20">
          <Doughnut data={popChartData} options={chartOptions} />
        </div>
      </div>

      {/* 2. Nepremičnine (Horizontalno) */}
      <div className="metric-card mb-3">
        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Nepremičnine (Povprečje)</label>
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔑</span>
            <div>
              <span className="block text-sm font-black text-slate-700">{data.avg_rent_m2?.toFixed(1)} €/m²</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Najem</span>
            </div>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-100"></div>

          <div className="flex items-center gap-3">
            <span className="text-xl">🏠</span>
            <div>
              <span className="block text-sm font-black text-slate-700">
                {Math.round(data.avg_price_m2_apartment).toLocaleString('sl-SI')} €/m²
              </span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Nakup</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Zdravstvo (IOZ) */}
      <div className="metric-card mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] uppercase font-bold text-slate-500">Zdravstvo (IOZ)</label>
          <span className="text-sm font-black" style={{ color: getHealthColor(data.ioz_ratio * 100) }}>
            {(data.ioz_ratio * 100).toFixed(1)}%
          </span>
        </div>
        <div className="progress-bg h-2">
          <div className="progress-fill" style={{ width: `${data.ioz_ratio * 100}%`, background: getHealthColor(data.ioz_ratio * 100) }}></div>
        </div>
      </div>

      {/* 4. Okolje in Vreme (Isti stil kot zdravstvo) */}
      <div className="metric-card">
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] uppercase font-bold text-slate-500">Okolje & Vreme</label>
          <span className="text-sm font-black" style={{ color: getWeatherColor(data.weather_index) }}>
            {data.weather_index?.toFixed(1)}
          </span>
        </div>
        
        {/* Vrstica napredka (1-10) */}
        <div className="progress-bg h-2 mb-4">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${(data.weather_index / 10) * 100}%`, 
              background: getWeatherColor(data.weather_index) 
            }}
          ></div>
        </div>

        {/* Ikone in podrobni podatki */}
        <div className="flex justify-between items-center px-1">
          <div className="text-center">
            <span className="block text-lg">☀️</span>
            <span className="block font-bold text-xs">{data.history_sunny_days} <small className="text-slate-400 font-normal">dni</small></span>
          </div>
          <div className="text-center">
            <span className="block text-lg">🌬️</span>
            <span className="block font-bold text-xs">{data.history_avg_aqi?.toFixed(0)} <small className="text-slate-400 font-normal">AQI</small></span>
          </div>
          <div className="text-center">
            <span className="block text-lg">🌡️</span>
            <span className="block font-bold text-xs">{data.history_avg_temp?.toFixed(1)}°C</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MunicipalityPanel;