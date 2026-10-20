"""
Genera parcelas.js, el archivo de datos que lee index.html.

Uso:
  python export_data.py --demo
      Datos de EJEMPLO (la página muestra un aviso amarillo).

  python export_data.py --csv resultados.csv
      Datos reales. El CSV debe tener UNA fila por parcela con estas columnas
      (los nombres se pueden cambiar en COLUMNAS más abajo):
        id, municipio, estado, rendimiento_t_ha (vacío en las 59 por predecir),
        prediccion_t_ha, superficie_ha, elevacion, pendiente, orientacion,
        tpi, gdd, precip, ndvi_max, ndvi_anom

Edita METRICAS con los valores reales de RMSE, MAE y la tabla de modelos.
"""
import argparse
import csv
import json
import random

# ---- Mapea tus columnas del CSV -> campos de la web ----
COLUMNAS = {
    "id": "id",
    "municipio": "municipio",
    "estado": "estado",
    "rendimiento": "rendimiento_t_ha",   # vacío = parcela a predecir
    "prediccion": "prediccion_t_ha",
    "superficie_ha": "superficie_ha",
    "elevacion": "elevacion",
    "pendiente": "pendiente",
    "orientacion": "orientacion",
    "tpi": "tpi",
    "gdd": "gdd",
    "precip": "precip",
    "ndvi_max": "ndvi_max",
    "ndvi_anom": "ndvi_anom",
}

# ---- Métricas. Los números del documento ya están; completa los None ----
METRICAS = {
    "r2": 0.57,          # del documento (aprox.)
    "rmse": None,        # <- completar (t/ha)
    "mae": None,         # <- completar (t/ha)
    "depuracion": [
        {"etapa": "Registros satelitales", "n": 107666},
        {"etapa": "Sin valores (nubosidad 100 %)", "n": 31741, "alt": True},
        {"etapa": "Registros conservados", "n": 75925},
    ],
    "modelos": [          # <- completar R2 / RMSE / MAE reales
        {"nombre": "XGBoost", "r2": None, "rmse": None, "mae": None},
        {"nombre": "Random Forest", "r2": None, "rmse": None, "mae": None},
        {"nombre": "ExtraTrees", "r2": None, "rmse": None, "mae": None},
        {"nombre": "HistGradientBoosting", "r2": None, "rmse": None, "mae": None},
        {"nombre": "Ridge", "r2": None, "rmse": None, "mae": None},
    ],
}

MUNICIPIOS = [
    ("Apizaco", "Tlaxcala"), ("Huamantla", "Tlaxcala"), ("Calpulalpan", "Tlaxcala"),
    ("Tlaxco", "Tlaxcala"), ("Zacatlán", "Puebla"), ("Chignahuapan", "Puebla"),
    ("Libres", "Puebla"), ("Apan", "Hidalgo"), ("Tepeapulco", "Hidalgo"),
]


def num(v):
    if v is None or str(v).strip() == "":
        return None
    return float(v)


def demo_parcelas():
    random.seed(7)
    out = []
    for i in range(1, 198):
        muni, est = random.choice(MUNICIPIOS)
        tipo = "entrenamiento" if i <= 138 else "prediccion"
        real = round(random.gauss(3.4, 0.9), 2)
        pred = round(real + random.gauss(0, 0.6), 2)
        out.append({
            "id": f"P-{i:03d}", "municipio": muni, "estado": est, "tipo": tipo,
            "rendimiento": real if tipo == "entrenamiento" else None,
            "prediccion": pred,
            "superficie_ha": round(random.uniform(1, 12), 1),
            "elevacion": round(random.uniform(2200, 2900)),
            "pendiente": round(random.uniform(0.5, 9), 1),
            "orientacion": round(random.uniform(0, 360)),
            "tpi": round(random.gauss(0, 1.2), 2),
            "gdd": round(random.uniform(1400, 2100)),
            "precip": round(random.uniform(380, 720)),
            "ndvi_max": round(random.uniform(0.55, 0.88), 2),
            "ndvi_anom": round(random.gauss(0, 0.04), 3),
        })
    return out


def csv_parcelas(path):
    out = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            g = lambda k: r.get(COLUMNAS[k])
            rend = num(g("rendimiento"))
            out.append({
                "id": str(g("id")), "municipio": g("municipio"), "estado": g("estado"),
                "tipo": "entrenamiento" if rend is not None else "prediccion",
                "rendimiento": rend, "prediccion": num(g("prediccion")),
                "superficie_ha": num(g("superficie_ha")),
                "elevacion": num(g("elevacion")), "pendiente": num(g("pendiente")),
                "orientacion": num(g("orientacion")), "tpi": num(g("tpi")),
                "gdd": num(g("gdd")), "precip": num(g("precip")),
                "ndvi_max": num(g("ndvi_max")), "ndvi_anom": num(g("ndvi_anom")),
            })
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--csv")
    a = ap.parse_args()
    if not a.demo and not a.csv:
        ap.error("usa --demo o --csv archivo.csv")

    parcelas = demo_parcelas() if a.demo else csv_parcelas(a.csv)
    with open("parcelas.js", "w", encoding="utf-8") as fh:
        fh.write(f"window.ES_DEMO = {'true' if a.demo else 'false'};\n")
        fh.write("window.PARCELAS = " + json.dumps(parcelas, ensure_ascii=False) + ";\n")
        fh.write("window.METRICAS = " + json.dumps(METRICAS, ensure_ascii=False) + ";\n")
    print(f"parcelas.js generado con {len(parcelas)} parcelas")
