import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from frontend.utils import inject_custom_css
import streamlit as st

st.set_page_config(page_title="Live Pipeline", layout="wide")

inject_custom_css()

# Native Streamlit navigation is used instead of custom page links.

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
        icon = "✓" if is_done else "-"
        color = "#E36A6A" if is_done else "#9CA3AF"
        bg = "rgba(227, 106, 106, 0.05)" if is_done else "#FFFFFF"
        border = f"1px solid {color}" if is_done else "1px solid rgba(227, 106, 106, 0.15)"
        st.markdown(f"""
        <div style="background:{bg};border:{border};border-radius:8px;padding:0.75rem;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.02); height: 110px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="color:{color};font-size:1.5rem;line-height:1;">{icon}</div>
          <div style="font-size:0.75rem;font-weight:600;color:{color};margin-top:8px;line-height:1.2;">{name}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("---")
st.markdown("### Execution Log")
if log:
    st.markdown('<div class="terminal-box">' + "<br>".join(f"[{i}] {m}" for i, m in enumerate(log)) + "</div>", unsafe_allow_html=True)
else:
    st.warning("Waiting for pipeline to start on Home page...")