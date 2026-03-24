from core.storage import load_history
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from frontend.utils import inject_custom_css
import streamlit as st
import pandas as pd

st.set_page_config(page_title="History — FactCheck Engine", layout="wide")

inject_custom_css()

# --- Sidebar Navigation ---------------------------------------------------------
# Native Streamlit navigation is used instead of custom page links.

# --- Page Header ----------------------------------------------------------------


st.markdown("# History")

# --- Retrieve History -----------------------------------------------------------
# Try session state first, if empty, try loading from file
if "history" in st.session_state and st.session_state.history:
    history = st.session_state.history
else:
    history = load_history()
    st.session_state.history = history # populate state for future interactions

if not history:
    st.markdown("""
    <div style="text-align:center;padding:4rem;font-family:'Plus Jakarta Sans',sans-serif;color:#888888;">
      <div style="font-size:1.5rem;margin-top:0.5rem;font-weight:600;">No sessions yet.</div>
      <div style="font-size:0.9rem;color:#888888;margin-top:0.25rem;">Run a fact-check from the Home page.</div>
    </div>
    """, unsafe_allow_html=True)
    st.stop()

# --- Summary Metrics ------------------------------------------------------------
h_col1, h_col2, h_col3, h_col4 = st.columns(4)
with h_col1:
    st.metric("Total Sessions", len(history))
with h_col2:
    avg_score = sum(s.get("overall_accuracy_score", 0) for s in history) / len(history)
    st.metric("Avg Accuracy", f"{avg_score:.1f}/100")
with h_col3:
    total_claims = sum(s.get("total_claims", 0) for s in history)
    st.metric("Total Claims Checked", total_claims)
with h_col4:
    false_claims = sum(s.get("verdict_counts", {}).get("FALSE", 0) for s in history)
    st.metric("Total FALSE Claims Found", false_claims)

st.markdown("---")

# ── History Table ──────────────────────────────────────────────────────────────
rows = []
for i, s in enumerate(reversed(history)):
    vc = s.get("verdict_counts", {})
    rows.append({
        "#": len(history) - i,
        "Session ID": s.get("session_id", "?"),
        "Type": s.get("input_type", "text").upper(),
        "Accuracy": f"{s.get('overall_accuracy_score', 0):.1f}",
        "Trust": f"{s.get('trust_score', 0):.1f}",
        "Claims": s.get("total_claims", 0),
        "TRUE": vc.get("TRUE", 0),
        "FALSE": vc.get("FALSE", 0),
        "PARTIAL": vc.get("PARTIALLY TRUE", 0),
        "UNVERIF.": vc.get("UNVERIFIABLE", 0),
        "AI Prob": f"{s.get('ai_detection', {}).get('ensemble_probability', 0):.0f}%",
    })

df = pd.DataFrame(rows)
st.dataframe(
    df,
    use_container_width=True,
    column_config={
        "Accuracy": st.column_config.NumberColumn(format="%.1f", min_value=0, max_value=100),
        "Trust":    st.column_config.NumberColumn(format="%.1f"),
    },
)

# ── Load Session Section ───────────────────────────────────────────────────────
st.markdown("---")
st.markdown("### Load a Session")
session_ids = [s.get("session_id") for s in history]

load_col1, load_col2 = st.columns([7, 3])
with load_col1:
    selected_id = st.selectbox("Select session to load:", session_ids[::-1])
with load_col2:
    st.markdown("<div style='height: 1.6rem;'></div>", unsafe_allow_html=True)
    load_clicked = st.button("Load Session into Report View", use_container_width=True)

if selected_id:
    selected = next((s for s in history if s.get("session_id") == selected_id), None)
    if selected:
        if load_clicked:
            st.session_state.session_result = selected
            st.switch_page("pages/2_Report.py")

        col1, col2 = st.columns([3, 1])
        with col1:
            summary = selected.get('document_summary') or selected.get('narrative', '')
            st.markdown(f"**Summary:** {summary}")
        with col2:
            vc = selected.get("verdict_counts", {})
            st.markdown("**Verdicts:**")
            for verdict, count in vc.items():
                if count > 0:
                    colors = {"TRUE":"#10b981","FALSE":"#ef4444","PARTIALLY TRUE":"#f59e0b","UNVERIFIABLE":"#9CA3AF"}
                    c = colors.get(verdict, "#9CA3AF")
                    st.markdown(f'<span style="color:{c};font-family:JetBrains Mono,monospace;font-size:0.85rem;">{verdict}: {count}</span>', unsafe_allow_html=True)