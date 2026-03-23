import streamlit as st
import os

def inject_custom_css():
    css_path = os.path.join(os.path.dirname(__file__), "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)
