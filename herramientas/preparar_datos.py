import argparse
import json
import os
import re
import pandas as pd

METODOS = ["LASSO", "RandomForest", "XGBoost", "MutualInfo", "SelectKBest", "Correlacion"]
METRICAS = ["R2", "RMSE", "MAE", "MedAE", "MAPE", "Sesgo", "Corr"]
CORRIDAS = {"R2": "R2_mean", "RMSE": "RMSE_mean", "MAE": "MAE_mean", "MAPE": "MAPE_mean", "Sesgo": "Sesgo_mean"}
INDICES_CURVA = ["ndvi", "savi", "evi", "lai"]


def r(v, d=4):
    return round(float(v), d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origen", default="./res_ahorasi")
    ap.add_argument("--salida", default="./js/datos.js")
    ap.add_argument("--descargas", default="./descargas")
    a = ap.parse_args()
    o = a.origen

    comp = pd.read_csv(os.path.join(o, "comparativo_completo.csv"))
    resumen = {}
    for m in METODOS:
        resumen[m] = {}
        for k in METRICAS:
            f = comp[(comp.Metodo == m) & (comp.Metrica == k)].iloc[0]
            resumen[m][k] = {
                "media": r(f.Media), "sd": r(f.Desv_std), "med": r(f.Mediana),
                "p05": r(f.P05), "p95": r(f.P95), "lo": r(f.IC95_inf), "hi": r(f.IC95_sup),
            }

    corridas, folds, caract = {}, {}, {}
    for m in METODOS:
        d = pd.read_csv(os.path.join(o, f"runs_1000_{m}.csv"))
        corridas[m] = {k: [r(x) for x in d[c]] for k, c in CORRIDAS.items()}
        fd = pd.read_csv(os.path.join(o, f"folds_1000_{m}.csv"))
        q = fd["R2"].quantile([0.05, 0.25, 0.5, 0.75, 0.95]).tolist()
        folds[m] = {
            "por_fold": [r(fd[fd.Fold == i]["R2"].mean()) for i in range(1, 6)],
            "q": [r(x) for x in q],
            "min": r(fd["R2"].min()), "max": r(fd["R2"].max()),
        }
        caract[m] = pd.read_csv(os.path.join(o, f"caracteristicas_{m}.csv"))["caracteristica"].tolist()

    p = pd.read_csv(os.path.join(o, "predicciones_finales.csv"))
    nombres = {c for c in p.columns if re.search(r"_m\d\d$", c)}
    indices = sorted({re.sub(r"_(max|min|promedio|std)_m\d\d$", "", c) for c in nombres})
    parcelas = []
    for _, f in p.iterrows():
        item = {
            "id": f["ID_POLIGONO"], "area": r(f["AREA_HA"], 2), "obs": int(f["n_obs_validas"]),
            "pred": r(f["RENDIMIENTO_T_HA_PREDICHO"]),
        }
        for ix in INDICES_CURVA:
            item[ix] = [r(f[f"{ix}_promedio_m{mm:02d}"], 3) for mm in range(1, 13)]
        parcelas.append(item)
    media = {ix: [r(sum(x[ix][i] for x in parcelas) / len(parcelas), 3) for i in range(12)] for ix in INDICES_CURVA}

    datos = {
        "metodos": METODOS, "resumen": resumen, "corridas": corridas, "folds": folds,
        "caract": caract, "parcelas": parcelas, "media": media,
        "n_indices": len(indices), "n_candidatas": len(nombres) + 2,
    }
    os.makedirs(os.path.dirname(a.salida), exist_ok=True)
    with open(a.salida, "w", encoding="utf-8") as fh:
        fh.write("window.DATOS = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n")

    os.makedirs(a.descargas, exist_ok=True)
    out = p[["ID_POLIGONO", "AREA_HA", "n_obs_validas", "RENDIMIENTO_T_HA_PREDICHO"]].rename(
        columns={"ID_POLIGONO": "id_parcela", "AREA_HA": "area_ha", "n_obs_validas": "observaciones_validas",
                 "RENDIMIENTO_T_HA_PREDICHO": "rendimiento_estimado_t_ha"})
    out.round(4).to_csv(os.path.join(a.descargas, "estimaciones_59_parcelas.csv"), index=False, encoding="utf-8-sig")
    comp.round(4).to_csv(os.path.join(a.descargas, "metricas_por_metodo.csv"), index=False, encoding="utf-8-sig")
    print("parcelas:", len(parcelas), "indices:", len(indices), "candidatas:", len(nombres) + 2)


if __name__ == "__main__":
    main()
