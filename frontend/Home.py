import sys, os
# Ensure core package can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import json
import asyncio

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="FactCheck Engine",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Global CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
html, body, [class*="css"] { font-family: 'DM Sans', sans-serif !important; }
.stApp { background: #080b14; color: #e2e8f0; }
#MainMenu, footer, header { visibility: hidden; }
.fc-hero { font-family: 'IBM Plex Mono', monospace !important; font-size: 3.2rem; font-weight: 700; color: #e2e8f0; line-height: 1.1; margin-bottom: 0.5rem; }
.fc-hero span { color: #3b82f6; }
.fc-subtitle { font-family: 'IBM Plex Mono', monospace; font-size: 1rem; color: #64748b; margin-bottom: 2rem; }
.terminal-box { background: #020408; border: 1px solid #1e2d4a; border-radius: 8px; padding: 1rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; color: #22c55e; max-height: 250px; overflow-y: auto; line-height: 1.7; }
</style>
""", unsafe_allow_html=True)

# ── Session state init ────────────────────────────────────────────────────────
if "session_result" not in st.session_state:
    st.session_state.session_result = None
if "pipeline_log" not in st.session_state:
    st.session_state.pipeline_log = []
if "history" not in st.session_state:
    # Load from local storage if available
    try:
        from core.storage import load_history
        st.session_state.history = load_history()
    except ImportError:
        st.session_state.history = []

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<div style="font-family:IBM Plex Mono,monospace;color:#3b82f6;font-size:1.1rem;font-weight:700;margin-bottom:1.5rem;">🔍 FACTCHECK ENGINE</div>', unsafe_allow_html=True)
    st.page_link("Home.py", label="🏠 Home & Input")
    st.page_link("pages/1_Pipeline.py", label="⚡ Live Pipeline")
    st.page_link("pages/2_Report.py", label="📊 Accuracy Report")
    st.page_link("pages/3_History.py", label="📁 Session History")

# ── Hero ──────────────────────────────────────────────────────────────────────
st.markdown('<div class="fc-hero">Every Claim.<br><span>Verified.</span></div><div class="fc-subtitle">AI-powered fact-checking engine — claim extraction → web evidence → verdict scoring</div>', unsafe_allow_html=True)

# ── Input Section ─────────────────────────────────────────────────────────────
st.markdown("### Input Source")
tab_text, tab_url, tab_pdf = st.tabs(["📝 Paste Text", "🌐 Enter URL", "📄 Upload PDF"])

input_text, input_url = "", ""
input_pdf_bytes = b""

with tab_text:
    input_text = st.text_area("Paste any text, article, or claim-rich document:", height=220, placeholder="Paste news article here...", key="input_text_area")
    if input_text: st.caption(f"📊 {len(input_text.split())} words")

with tab_url:
    input_url = st.text_input("Enter article / news URL:", placeholder="https://example.com/news-article", key="input_url_field")

with tab_pdf:
    uploaded_file = st.file_uploader("Upload PDF document", type=["pdf"], key="pdf_upload")
    if uploaded_file:
        input_pdf_bytes = uploaded_file.read()
        st.caption(f"✓ PDF loaded: {uploaded_file.name}")

# ── Advanced Settings ─────────────────────────────────────────────────────────
with st.expander("⚙️ Advanced Settings", expanded=False):
    adv_col1, adv_col2 = st.columns(2)
    with adv_col1:
        model_choice = st.selectbox("LLM Model", ["meta-llama/llama-3.3-70b-instruct", "gpt-4o"], index=0)
        depth = st.selectbox("Search Depth", ["quick", "standard", "deep"], index=1, format_func=lambda x: f"{x.capitalize()} Depth")
    with adv_col2:
        max_claims = st.slider("Max Claims to Extract", 5, 50, 20)
        sources_per_claim = st.slider("Sources per Claim", 3, 10, 5)
        min_source_quality = st.selectbox("Minimum Source Quality", [1, 2, 3, 4], index=2, format_func=lambda x: f"Tier {x}")

# ── Verify Button ─────────────────────────────────────────────────────────────
st.markdown("---")
has_input = bool(input_text.strip() or input_url.strip() or input_pdf_bytes)

col_btn, col_hint = st.columns([1, 3])
with col_btn:
    verify_clicked = st.button("🔍 VERIFY CLAIMS", disabled=not has_input, use_container_width=True, type="primary")

# ── Pipeline Execution ────────────────────────────────────────────────────────
if verify_clicked and has_input:
    from core.pipeline import run_pipeline
    # Import storage only if needed
    try:
        from core.storage import save_history
        use_persistent_storage = True
    except ImportError:
        use_persistent_storage = False

    st.session_state.pipeline_log = []
    log_messages = []

    STAGES = [
        ("stage_01", "STAGE 01: Source Authentication"),
        ("stage_02", "STAGE 02: Linguistic Pattern Matching"),
        ("stage_03", "STAGE 03: Cross-Reference Synthesis"),
        ("stage_04", "STAGE 04: Claim Verification"),
        ("stage_05", "STAGE 05: Conflict Resolution"),
        ("stage_06", "STAGE 06: Report Assembly"),
        ("stage_07", "STAGE 07: AI Content Detection"),
    ]
    stage_status = {s[0]: "pending" for s in STAGES}

    st.markdown("---")
    st.markdown("### 🔄 Live Pipeline")
    progress_bar = st.progress(0)
    status_text  = st.empty()
    stage_display = st.empty()
    log_display   = st.empty()

    def render_stages(current_stage: str, done_stages: set):
        rows = ""
        for sid, label in STAGES:
            if sid in done_stages: icon, cls = "✓", "stage-done"
            elif sid == current_stage: icon, cls = "▶", "stage-active"
            else: icon, cls = "○", ""
            rows += f'<div class="stage-row {cls}"><span>{icon}</span><span>{label}</span></div>'
        stage_display.markdown(f'<div class="fc-card">{rows}</div>', unsafe_allow_html=True)

    done_stages = set()
    current_stage_ref = ["stage_01"]

    def progress_callback(stage: str, message: str, pct: int):
        if stage != "complete":
            current_stage_ref[0] = stage
            if stage not in done_stages and pct > 0:
                prev_idx = [s[0] for s in STAGES].index(stage) if stage in [s[0] for s in STAGES] else -1
                if prev_idx > 0: done_stages.add(STAGES[prev_idx - 1][0])

        progress_bar.progress(pct / 100)
        status_text.markdown(f'<div style="font-family:IBM Plex Mono,monospace;color:#3b82f6;font-size:0.85rem;">{message}</div>', unsafe_allow_html=True)
        render_stages(stage, done_stages)
        log_messages.append(f"[{pct:3d}%] {message}")
        st.session_state.pipeline_log = log_messages.copy()
        log_display.markdown('<div class="terminal-box">' + "<br>".join(f"<span style='color:#64748b'>[{i}]</span> {m}" for i, m in enumerate(log_messages[-12:])) + "</div>", unsafe_allow_html=True)

    # --- CORRECTED TRY/EXCEPT BLOCK ---
    try:
        with st.spinner("Running verification pipeline..."):
            result = run_pipeline(
                input_text=input_text, 
                input_url=input_url, 
                input_pdf_bytes=input_pdf_bytes,
                max_claims=max_claims, 
                depth=depth, 
                sources_per_claim=sources_per_claim,
                min_source_quality=min_source_quality, 
                progress_callback=progress_callback
            )

        # Mark all done
        for s in STAGES: 
            done_stages.add(s[0])
        render_stages("complete", done_stages)
        progress_bar.progress(1.0)

        # Save result
        st.session_state.session_result = result
        st.session_state.history.append(result)
        
        # Save to local file if available
        if use_persistent_storage:
            save_history(st.session_state.history)

        st.success(f"✓ Pipeline complete — {result['total_claims']} claims verified")

        # --- Quick Results Section ---
        st.markdown("---")
        st.markdown("### Quick Results")
        qr_col1, qr_col2, qr_col3, qr_col4 = st.columns(4)
        with qr_col1: st.metric("Overall Accuracy", f"{result['overall_accuracy_score']:.1f}/100")
        with qr_col2: st.metric("Trust Score", f"{result.get('trust_score', 0):.1f}/100")
        with qr_col3: st.metric("TRUE Claims", result["verdict_counts"].get("TRUE", 0))
        with qr_col4: st.metric("FALSE Claims", result["verdict_counts"].get("FALSE", 0))
        
        st.info("📊 View the full interactive report → **Report** page in the sidebar")
        
        if st.button("🔄 NEW CHECK"):
            st.session_state.session_result = None
            st.rerun()

    except Exception as e:
        st.error(f"Pipeline error: {str(e)}")
        st.exception(e)