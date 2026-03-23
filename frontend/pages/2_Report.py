import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from frontend.utils import inject_custom_css
import streamlit as st
import plotly.graph_objects as go
import pandas as pd
import json

st.set_page_config(page_title="Accuracy Report", layout="wide", page_icon="📊")

inject_custom_css()

# Native Streamlit navigation is used instead of custom page links.

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
if st.button("NEW CHECK"):
    st.session_state.session_result = None
    st.switch_page("Home.py")