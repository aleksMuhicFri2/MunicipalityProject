from municipality_codes import MUNICIPALITY_CODE_MAP
from municipality import Municipality
from region_mapping import OB_TO_REGION
from name_utils import normalize_name

# Helper for name-based matching
NAME_TO_CODE = {
    normalize_name(name): code
    for code, name in MUNICIPALITY_CODE_MAP.items()
    if code != "0"
}

# ------------------------------
# INIT MUNICIPALITIES
# ------------------------------
def init_municipalities():
    municipalities = {}
    for code, name in MUNICIPALITY_CODE_MAP.items():
        if code == "0":
            continue
        m = Municipality(code, name)
        m.region = OB_TO_REGION.get(normalize_name(name))
        if m.region is None:
            print(f"[MISSING REGION] {code}: {name} -> {normalize_name(name)}")
        municipalities[code] = m
    return municipalities

# ------------------------------
# POPULATION (SURS)
# ------------------------------
def process_population(raw_json, municipalities):
    for row in raw_json["data"]:
        muni_code = row["key"][0]
        age_code = row["key"][2]
        count = int(row["values"][0])

        if age_code == "999":
            continue

        m = municipalities.get(muni_code)
        if not m:
            continue

        age = int(age_code)
        if age <= 14:
            m.population_young += count
        elif age <= 64:
            m.population_working += count
        else:
            m.population_old += count

def calculate_demographics(municipalities):
    """
    Identifies the most significant demographic outlier relative to national averages.
    """
    m_list = [m for m in municipalities.values() if (m.population_young + m.population_working + m.population_old) > 0]
    count = len(m_list)
    if count == 0: return

    # Pass 1: Global Average Ratios
    avg_y = sum(m.population_young / (m.population_young + m.population_working + m.population_old) for m in m_list) / count
    avg_w = sum(m.population_working / (m.population_young + m.population_working + m.population_old) for m in m_list) / count
    avg_o = sum(m.population_old / (m.population_young + m.population_working + m.population_old) for m in m_list) / count

    # Pass 2: Identify Outliers
    for m in m_list:
        total = m.population_young + m.population_working + m.population_old
        ry, rw, ro = m.population_young/total, m.population_working/total, m.population_old/total

        diffs = {
            "Mlado Prebivalstvo": (ry - avg_y) / avg_y,
            "Delavno Prebivalstvo": (rw - avg_w) / avg_w,
            "Staro Prebivalstvo": (ro - avg_o) / avg_o
        }
        m.main_demographic = max(diffs, key=diffs.get)

# ------------------------------
# PRICES + RENT (With Manual Caps)
# ------------------------------
def process_prices(prices_by_muni, rent_by_muni, municipalities):
    # Sale prices
    for muni_name, categories in prices_by_muni.items():
        code = NAME_TO_CODE.get(normalize_name(muni_name))
        if not code or code not in municipalities:
            continue
        m = municipalities[code]

        apt = categories.get("apartment")
        if apt:
            # Manually cap at 5000e/m2
            raw_apt_price = float(apt["avg_price_m2"])
            m.avg_price_m2_apartment = min(raw_apt_price, 6000.0) 
            m.deals_sale_apartment = int(apt["deals_count"])

        house = categories.get("house")
        if house:
            m.avg_price_m2_house = float(house["avg_price_m2"])
            m.deals_sale_house = int(house["deals_count"])

    # Rent
    for muni_name, data in rent_by_muni.items():
        code = NAME_TO_CODE.get(normalize_name(muni_name))
        if not code or code not in municipalities:
            continue
        m = municipalities[code]
        # Manually cap at 10e/m2
        raw_rent = float(data["avg_rent_m2"])
        m.avg_rent_m2 = min(raw_rent, 15.0)
        m.deals_rent = int(data["deals_count_rent"])

# ------------------------------
# QUALITY OF LIFE (IOZ, LAT/LONG, WEATHER)
# ------------------------------
def process_ioz(ioz_df, municipalities, year=2023):
    for _, row in ioz_df.iterrows():
        if int(row["year"]) != year:
            continue
        muni_name = row["municipality"]
        code = NAME_TO_CODE.get(normalize_name(muni_name))
        if not code or code not in municipalities:
            continue
        m = municipalities[code]
        m.ioz_ratio = float(row["iozRatio"])
        m.insured_total = int(row["insuredPeopleCount"])
        m.insured_with_ioz = int(row["insuredPeopleCountWithIOZ"])
        m.insured_without_ioz = int(row["insuredPeopleCountWithoutIOZ"])

def process_lat_long(coords_data, municipalities):
    for item in coords_data:
        raw_code = item.get("code")
        code = str(raw_code).zfill(3) if raw_code is not None else None
        if not code or code not in municipalities:
            name = item.get("municipality") or item.get("name")
            code = NAME_TO_CODE.get(normalize_name(name))
            
        if code and code in municipalities:
            m = municipalities[code]
            def safe_float(key_list):
                for key in key_list:
                    val = item.get(key)
                    if val is not None and str(val).strip() != "" and str(val).lower() != 'nan':
                        return float(val)
                return 0.0
            m.latitude = safe_float(["lat", "latitude"])
            m.longitude = safe_float(["lon", "lng", "longitude"])

def process_history(history_data, municipalities):
    for item in history_data:
        code = str(item.get("code")).zfill(3)
        if code in municipalities:
            m = municipalities[code]
            m.history_sunny_days = int(item.get("sunny_days_count", 0))
            m.history_rainy_days = int(item.get("rainy_days_count", 0))
            m.history_foggy_days = int(item.get("foggy_days_count", 0))
            m.history_avg_aqi = float(item.get("avg_aqi", 0))
            m.history_avg_temp = float(item.get("avg_temp_yearly", 0))

# ------------------------------
# SCORING INDEXES (1-10)
# ------------------------------
def calculate_weather_scores(municipalities):
    m_list = list(municipalities.values())
    count = len(m_list)
    if count == 0: return

    avg_temp = sum(m.history_avg_temp for m in m_list) / count
    avg_sun  = sum(m.history_sunny_days for m in m_list) / count
    avg_aqi  = sum(m.history_avg_aqi for m in m_list) / count
    avg_rain = sum(m.history_rainy_days for m in m_list) / count

    raw_scores = []
    for m in m_list:
        score = (
            (m.history_avg_temp - avg_temp) * 10 +
            (m.history_sunny_days - avg_sun) * 5 -
            (m.history_avg_aqi - avg_aqi) * 5 -
            (m.history_rainy_days - avg_rain) * 1.5
        )
        m._raw_weather_score = score
        raw_scores.append(score)

    min_s, max_s = min(raw_scores), max(raw_scores)
    for m in m_list:
        if max_s == min_s: m.weather_index = 5.0
        else:
            normalized = 1 + ((m._raw_weather_score - min_s) / (max_s - min_s) * 9)
            m.weather_index = round(normalized, 2)
        if hasattr(m, '_raw_weather_score'): del m._raw_weather_score

def calculate_affordability_scores(municipalities):
    """
    Score 1-10. Higher = Cheaper (Better).
    Uses the capped values from process_prices.
    """
    m_list = [m for m in municipalities.values() if m.avg_rent_m2 or m.avg_price_m2_apartment]
    if not m_list: return

    raw_scores = []
    for m in m_list:
        # Score calculation: (PriceInv + RentInv)
        # We invert so that 0e = 1.0 and 5000e = 0.0
        p_score = (5000 - (m.avg_price_m2_apartment or 5000)) / 5000
        r_score = (10 - (m.avg_rent_m2 or 10)) / 10
        combined = (p_score * 0.6) + (r_score * 0.4)
        m._temp_aff_score = combined
        raw_scores.append(combined)

    min_s, max_s = min(raw_scores), max(raw_scores)
    for m in m_list:
        if max_s == min_s: m.affordability_index = 5.0
        else:
            normalized = 1 + ((m._temp_aff_score - min_s) / (max_s - min_s) * 9)
            m.affordability_index = round(normalized, 2)
            del m._temp_aff_score

def calculate_healthcare_scores(municipalities):
    """Higher IOZ coverage = Higher Score."""
    m_list = [m for m in municipalities.values() if m.ioz_ratio is not None]
    if not m_list: return

    ratios = [m.ioz_ratio for m in m_list]
    min_r, max_r = min(ratios), max(ratios)

    for m in m_list:
        if max_r == min_r:
            m.healthcare_index = 5.0
        else:
            normalized = 1 + ((m.ioz_ratio - min_r) / (max_r - min_r) * 9)
            m.healthcare_index = round(normalized, 2)