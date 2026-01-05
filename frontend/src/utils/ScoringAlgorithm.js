/**
 * Haversine formula za izračun zračne razdalje med koordinatami.
 */
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Glavni algoritem: Proračun -> Zračna razdalja -> Google Maps.
 */
export const calculateMunicipalityScores = async (allMunicipalities, prefs, onStepChange) => {
  // FAZA 1: Proračunski filter
  if (onStepChange) onStepChange(1);
  
  let survivors = allMunicipalities.filter((m) => {
    const pricePerM2 = prefs.mode === "najem" ? m.avg_rent_m2 : m.avg_price_m2_apartment;
    if (!pricePerM2) return false;
    const estimatedCost = 0.8 * pricePerM2 * prefs.size;
    return estimatedCost <= prefs.budget;
  });

  if (survivors.length === 0) return { top5: [], scoreLookup: {} };

  // FAZA 2: Geografska bližina (Haversine)
  if (onStepChange) onStepChange(2);
  
  let workMuni = prefs.workLocation ? allMunicipalities.find(a => a.code === prefs.workLocation) : null;

  let scoredAll = survivors.map((m) => {
    // Priprava indeksov (da so na voljo za mini display v App.jsx)
    const affIndex = m.affordability_index || 5;
    const weatherIndex = m.weather_index || 5;
    const healthIndex = m.healthcare_index || 5;

    const affScore = affIndex * prefs.weights.affordability;
    const weatherScore = weatherIndex * prefs.weights.weather;
    const healthScore = healthIndex * prefs.weights.healthcare;
    const demoBonus = (m.main_demographic === prefs.desiredDemo) ? 80 : 50;

    let km = 0;
    let distPoints = 50;
    if (workMuni) {
      km = getHaversineDistance(
        m.lat || m.latitude, m.lng || m.longitude, 
        workMuni.lat || workMuni.latitude, workMuni.lng || workMuni.longitude
      );
      // Točkovanje: 0km = 100t, 50km = 50t, 100km+ = 0t
      distPoints = Math.max(0, 100 - km);
    }

    const totalWithDist = affScore + weatherScore + healthScore + demoBonus + (distPoints * (prefs.weights.transport / 10));
    
    return { 
      ...m, 
      totalWithDist, 
      initialDistPoints: distPoints,
      airDistanceKm: km.toFixed(1),
      affIndex,
      weatherIndex,
      healthIndex
    };
  });

  // FAZA 3: Google Maps za Top 20 (natančen izračun vožnje)
  if (onStepChange) onStepChange(3);
  
  let top20 = [...scoredAll].sort((a, b) => b.totalWithDist - a.totalWithDist).slice(0, 20);

  const enrichedTop20 = await Promise.all(
    top20.map(async (muni) => {
      let googlePoints = muni.initialDistPoints;
      let travelTimeText = null;

      if (workMuni && workMuni.name !== muni.name) {
        try {
          const url = `http://localhost:5000/api/travel-time?from=${encodeURIComponent(muni.name)}&to=${encodeURIComponent(workMuni.name)}&mode=${prefs.hasCar ? "driving" : "transit"}`;
          const res = await fetch(url);
          const travelData = await res.json();
          if (travelData?.duration_s !== undefined) {
            travelTimeText = travelData.duration_text;
            const mins = travelData.duration_s / 60;
            
            // Logika za točke vožnje (10min=100, 45min=50, 180min=0)
            if (mins <= 10) googlePoints = 100;
            else if (mins <= 45) googlePoints = 100 - (mins - 10) * (50 / 35);
            else if (mins <= 180) googlePoints = 50 - (mins - 45) * (50 / 135);
            else googlePoints = 0;
          }
        } catch (e) { console.error(`Napaka za ${muni.name}:`, e); }
      } else if (workMuni?.name === muni.name) {
        googlePoints = 100; 
        travelTimeText = "V isti občini";
      }

      // Zamenjamo zračne točke z Google Maps točkami
      const transportWeight = prefs.weights.transport / 10;
      const finalRaw = (muni.totalWithDist - (muni.initialDistPoints * transportWeight)) + (googlePoints * transportWeight);
      
      return { 
        ...muni, 
        totalRaw: finalRaw, 
        travelTime: travelTimeText, 
        travelPoints: googlePoints 
      };
    })
  );

  // NORMALIZACIJA ZA HEATMAP (0-100 barvna lestvica na zemljevidu)
  // 
  const allRaws = scoredAll.map(s => s.totalWithDist);
  const minRaw = Math.min(...allRaws);
  const maxRaw = Math.max(...allRaws);
  const range = maxRaw - minRaw;

  const scoreLookup = {};
  scoredAll.forEach(m => {
    const norm = range > 0 ? ((m.totalWithDist - minRaw) / range) * 100 : 100;
    scoreLookup[m.code] = Math.round(norm);
  });

  // PRIPRAVA KONČNIH TOP 5 REZULTATOV
  const finalTop5 = enrichedTop20
    .sort((a, b) => b.totalRaw - a.totalRaw)
    .slice(0, 5)
    .map((m, _, arr) => ({
      ...m,
      finalScore: Math.round((m.totalRaw / arr[0].totalRaw) * 100)
    }));

  return { top5: finalTop5, scoreLookup };
};