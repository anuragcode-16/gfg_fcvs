import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import json

st.set_page_config(page_title="Accuracy Report", layout="wide", page_icon="📊")

# CSS
st.markdown("""<style>.stApp{background:#080b14} .fc-card{background:#0d1424;border:1px solid #1e2d4a;border-radius:12px;padding:1.25rem;margin-bottom:1rem}</style>""", unsafe_allow_html=True)

with st.sidebar:
    st.page_link("Home.py", label="🏠 Home & Input")
    st.page_link("pages/1_Pipeline.py", label="⚡ Live Pipeline")
    st.page_link("pages/2_Report.py", label="📊 Accuracy Report")
    st.page_link("pages/3_History.py", label="📁 Session History")

result = st.session_state.get("session_result", None)
if not result:
    st.warning("No report yet. Run a check on the Home page.")
    st.stop()

# Header
st.markdown("### Fact-Check Report")
col1, col2 = st.columns([1, 2])
with col1:
    fig = go.Figure(go.Indicator(mode="gauge+number", value=result['overall_accuracy_score'],
        title={'text': "Credibility"}, gauge={'axis': {'range': [0, 100]}}))
    st.plotly_chart(fig, use_container_width=True)
with col2:
    st.metric("Total Claims", result['total_claims'])
    st.metric("AI Probability", f"{result['ai_detection']['ensemble_probability']:.1f}%")
    st.write(result['narrative'])

# Claims
st.markdown("---")
st.markdown("### Claims")
for c in result['claims']:
    with st.expander(f"**{c.get('text', '')[:100]}..."):
        st.markdown(f"**Verdict:** {c.get('verdict')}")
        st.markdown(f"**Confidence:** {c.get('confidence_score')}%")
        st.markdown(f"**Reasoning:** {c.get('reasoning')}")
        if c.get('evidence'):
            st.markdown("**Evidence:**")
            for ev in c['evidence']:
                st.markdown(f"- [{ev.get('domain')}]({ev.get('url')}) (Tier {ev.get('domain_tier')})")

# Export
if st.button("🔄 NEW CHECK"):
    st.session_state.session_result = None
    st.switch_page("Home.py")