import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st

st.set_page_config(page_title="Live Pipeline", layout="wide", page_icon="⚡")

st.markdown("""
<style>
.stApp { background: #080b14; }
.terminal-box { background: #020408; border: 1px solid #1e2d4a; border-radius: 8px; padding: 1rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; color: #22c55e; max-height: 450px; overflow-y: auto; line-height: 1.7; }
</style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.page_link("Home.py", label="🏠 Home & Input")
    st.page_link("pages/1_Pipeline.py", label="⚡ Live Pipeline")
    st.page_link("pages/2_Report.py", label="📊 Accuracy Report")
    st.page_link("pages/3_History.py", label="📁 Session History")

st.markdown("# Live Pipeline Status")
result = st.session_state.get("session_result", None)
log = st.session_state.get("pipeline_log", [])

STAGES = [
    ("stage_01", "Source Authentication"), ("stage_02", "Linguistic Pattern Matching"),
    ("stage_03", "Cross-Reference Synthesis"), ("stage_04", "Claim Verification"),
    ("stage_05", "Conflict Resolution"), ("stage_06", "Report Assembly"),
    ("stage_07", "AI Content Detection"),
]

cols = st.columns(len(STAGES))
for i, (sid, name) in enumerate(STAGES):
    with cols[i]:
        is_done = result is not None
        icon = "✓" if is_done else "○"
        color = "#10b981" if is_done else "#475569"
        st.markdown(f"""
        <div style="background:#0d1424;border:1px solid {color};border-radius:8px;padding:0.75rem;text-align:center;">
          <div style="color:{color};font-size:1.5rem;">{icon}</div>
          <div style="font-size:0.72rem;font-weight:600;color:{color};margin-top:4px;">{name}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("---")
st.markdown("### Execution Log")
if log:
    st.markdown('<div class="terminal-box">' + "<br>".join(f"[{i}] {m}" for i, m in enumerate(log)) + "</div>", unsafe_allow_html=True)
else:
    st.info("Waiting for pipeline to start on Home page...")