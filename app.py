import joblib
import pandas as pd
import streamlit as st

st.set_page_config(page_title="Predicción de rendimiento", layout="wide")


@st.cache_resource
def cargar():
    return joblib.load("modelo.pkl")


paq = cargar()
modelo = paq["modelo"]
features = paq["features"]
medianas = paq["medianas"]
rangos = paq["rangos"]
target = paq["target"]
imp = pd.Series(paq["importancias"]).sort_values(ascending=False)

st.title("Predicción de rendimiento")
st.write(
    f"Este modelo (XGBoost) predice **{target}** a partir de {len(features)} "
    "variables. Cambia los valores en el panel izquierdo y mira la predicción, "
    "o sube un CSV para predecir varias filas a la vez."
)

tab1, tab2, tab3 = st.tabs(["Predicción individual", "Predicción por lote", "Cómo funciona"])

# ---------- Predicción individual ----------
with tab1:
    st.sidebar.header("Datos de entrada")
    st.sidebar.caption("Ordenadas de mayor a menor importancia para el modelo.")
    valores = {}
    for c in imp.index:
        lo, hi = rangos[c]
        if lo == hi:
            hi = lo + 1.0
        valores[c] = st.sidebar.slider(
            c, float(lo), float(hi), float(medianas[c]), step=(hi - lo) / 100
        )

    fila = pd.DataFrame([valores])[features]
    pred = float(modelo.predict(fila)[0])

    col1, col2 = st.columns([1, 2])
    col1.metric(f"{target} predicho", f"{pred:.2f}")
    col2.write("Valores usados en esta predicción:")
    col2.dataframe(fila.T.rename(columns={0: "valor"}), use_container_width=True)

# ---------- Predicción por lote ----------
with tab2:
    st.write(
        "Sube un CSV con estas columnas (las que falten se llenan con la mediana "
        "del entrenamiento):"
    )
    st.code(", ".join(features))
    archivo = st.file_uploader("CSV", type="csv")
    if archivo is not None:
        df = pd.read_csv(archivo)
        faltan = [c for c in features if c not in df.columns]
        if faltan:
            st.warning(f"Faltan {len(faltan)} columnas, se usará la mediana: {faltan}")
        X = pd.DataFrame(
            {c: pd.to_numeric(df.get(c), errors="coerce") for c in features}
        ).fillna(pd.Series(medianas))
        df[target + "_PREDICHO"] = modelo.predict(X[features])
        st.dataframe(df, use_container_width=True)
        st.download_button(
            "Descargar resultados",
            df.to_csv(index=False).encode("utf-8"),
            "predicciones.csv",
            "text/csv",
        )

# ---------- Cómo funciona ----------
with tab3:
    st.subheader("Variables más importantes")
    st.write(
        "Entre más alta la barra, más peso tiene esa variable en la predicción "
        f"del modelo. Las variables se eligieron con el método **{paq['mejor_metodo']}**."
    )
    st.bar_chart(imp)
    st.subheader("Cómo interpretar el resultado")
    st.write(
        f"El número que aparece es la estimación de {target} para los valores "
        "que elegiste. Es una estimación basada en los datos de entrenamiento, "
        "no una medición real."
    )
