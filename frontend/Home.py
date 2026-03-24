import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from frontend.utils import inject_custom_css
import streamlit as st
import json

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="FactCheck Engine",

    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Global CSS ────────────────────────────────────────────────────────────────
inject_custom_css()

# ── Session state init ────────────────────────────────────────────────────────
if "session_result" not in st.session_state:
    st.session_state.session_result = None
if "pipeline_log" not in st.session_state:
    st.session_state.pipeline_log = []
if "stop_requested" not in st.session_state:
    st.session_state.stop_requested = False

# Load history
try:
    from core.storage import load_history
    if "history" not in st.session_state:
        st.session_state.history = load_history()
except ImportError:
    if "history" not in st.session_state:
        st.session_state.history = []

# ── Sidebar ───────────────────────────────────────────────────────────────────
# Native Streamlit navigation is used instead of custom page links.

# ── Hero ──────────────────────────────────────────────────────────────────────
st.markdown('<div class="fc-hero">Every Claim.<br><span>Verified.</span></div><div class="fc-subtitle">AI-powered fact-checking engine - claim extraction -> web evidence -> verdict scoring</div>', unsafe_allow_html=True)

# ── Input Section ─────────────────────────────────────────────────────────────
st.markdown("### Input Source")

tab_text, tab_url, tab_pdf = st.tabs(["Paste Text", "Enter URL", "Upload PDF"])

input_text, input_url = "", ""
input_pdf_bytes = b""

with tab_text:
    input_text = st.text_area("Paste any text, article, or claim-rich document:", height=200, placeholder="Paste news article here...", key="input_text_area")
    if input_text: st.caption(f"{len(input_text.split())} words")

with tab_url:
    input_url = st.text_input("Enter article / news URL:", placeholder="https://example.com/news-article", key="input_url_field")

with tab_pdf:
    uploaded_file = st.file_uploader("Upload PDF document", type=["pdf"], key="pdf_upload")
    if uploaded_file:
        input_pdf_bytes = uploaded_file.read()
        st.caption(f"PDF loaded: {uploaded_file.name}")

# Advanced settings moved to popover over input section

# ── Verify Button ─────────────────────────────────────────────────────────────
st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
has_input = bool(input_text.strip() or input_url.strip() or input_pdf_bytes)

btn_adv, btn_spacer, btn_verify = st.columns([2.5, 4, 2])

with btn_adv:
    with st.popover("Advanced Settings", use_container_width=True):
        depth = st.selectbox("Search Depth", ["quick", "standard", "deep"], index=1, format_func=lambda x: f"{x.capitalize()} Depth")
        min_source_quality = st.selectbox(
            "Minimum Source Quality", [1, 2, 3, 4], index=1,
            format_func=lambda x: {1: "Tier 1 (Basic)", 2: "Tier 2 (Standard)", 3: "Tier 3 (High)", 4: "Tier 4 (Advanced)"}[x]
        )
        max_claims = st.slider("Max Claims to Extract", 5, 50, 20)
        sources_per_claim = st.slider("Sources per Claim", 3, 10, 5)

with btn_verify:
    verify_clicked = st.button("Verify Claims", disabled=not has_input, use_container_width=True)

# ── Pipeline Execution ────────────────────────────────────────────────────────
if verify_clicked and has_input:
    from core.pipeline import run_pipeline
    try:
        from core.storage import save_history
        use_persistent_storage = True
    except ImportError:
        use_persistent_storage = False

    # Reset stop flag at start
    st.session_state.stop_requested = False
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
    
    st.markdown("---")
    st.markdown("### Live Pipeline")
    
    # Create a placeholder for the stop button right under the header
    stop_placeholder = st.empty()
    
    progress_bar = st.progress(0)
    status_text  = st.empty()
    stage_display = st.empty()
    log_display   = st.empty()

    def render_stages(current_stage: str, done_stages: set):
        rows = ""
        for sid, label in STAGES:
            if sid in done_stages: icon, cls = "Done", "stage-done"
            elif sid == current_stage: icon, cls = "Run", "stage-active"
            else: icon, cls = "-", ""
            rows += f'<div class="stage-row {cls}"><span>{icon}</span><span>{label}</span></div>'
        stage_display.markdown(f'<div class="fc-card">{rows}</div>', unsafe_allow_html=True)

    done_stages = set()

    def progress_callback(stage: str, message: str, pct: int):
        if stage != "complete":
            if stage not in done_stages and pct > 0:
                prev_idx = [s[0] for s in STAGES].index(stage) if stage in [s[0] for s in STAGES] else -1
                if prev_idx > 0: done_stages.add(STAGES[prev_idx - 1][0])

        progress_bar.progress(pct / 100)
        status_text.markdown(f'<div style="font-family:JetBrains Mono,monospace;color:#E36A6A;font-size:0.85rem;">{message}</div>', unsafe_allow_html=True)
        render_stages(stage, done_stages)
        log_messages.append(f"[{pct:3d}%] {message}")
        st.session_state.pipeline_log = log_messages.copy()
        log_display.markdown('<div class="terminal-box">' + "<br>".join(f"<span style='color:#64748b'>[{i}]</span> {m}" for i, m in enumerate(log_messages[-12:])) + "</div>", unsafe_allow_html=True)

    # Define stop check function
    def should_stop():
        return st.session_state.stop_requested

    try:
        # Show Stop Button
        with stop_placeholder.container():
            if st.button("STOP ANALYSIS", key="stop_btn_active", use_container_width=True):
                st.session_state.stop_requested = True
                st.warning("Attempting to stop pipeline... please wait for current step to finish.")

        with st.spinner("Running verification pipeline..."):
            result = run_pipeline(
                input_text=input_text, 
                input_url=input_url, 
                input_pdf_bytes=input_pdf_bytes,
                max_claims=max_claims, 
                depth=depth, 
                sources_per_claim=sources_per_claim,
                min_source_quality=min_source_quality, 
                progress_callback=progress_callback,
                stop_check=should_stop  # Pass stop check
            )

        # Clear stop button
        stop_placeholder.empty()

        # Check if stopped
        if st.session_state.stop_requested:
            st.error("Analysis was stopped by user.")
        
        # Mark all done
        for s in STAGES: done_stages.add(s[0])
        render_stages("complete", done_stages)
        progress_bar.progress(1.0)

        # Save result
        st.session_state.session_result = result
        st.session_state.history.append(result)
        
        if use_persistent_storage:
            save_history(st.session_state.history)

        st.success(f"Pipeline complete - {result['total_claims']} claims verified")

        # --- Quick Results Section ---
        st.markdown("---")
        st.markdown("### Quick Results")
        qr_col1, qr_col2, qr_col3, qr_col4 = st.columns(4)
        with qr_col1: st.metric("Overall Accuracy", f"{result['overall_accuracy_score']:.1f}/100")
        with qr_col2: st.metric("Trust Score", f"{result.get('trust_score', 0):.1f}/100")
        with qr_col3: st.metric("TRUE Claims", result["verdict_counts"].get("TRUE", 0))
        with qr_col4: st.metric("FALSE Claims", result["verdict_counts"].get("FALSE", 0))
        
        # --- NEW: Relevant Sources Section ---
        st.markdown("### Relevant Sources Consulted")
        st.caption("Click links to verify sources manually. Sources are grouped by the claim they support.")
        
        if result.get("claims"):
            for claim in result["claims"]:
                evidence = claim.get("evidence", [])
                if evidence:
                    with st.expander(f"**Claim:** {claim.get('text', '')[:80]}...", expanded=False):
                        st.markdown(f"**Verdict:** `{claim.get('verdict', 'N/A')}`")
                        for ev in evidence:
                            tier = ev.get("domain_tier", 4)
                            tier_icon = ""
                            st.markdown(
                                f'<div style="margin-bottom:5px;">{tier_icon} <a href="{ev.get("url")}" target="_blank" class="source-link">{ev.get("domain")}</a> <span style="color:#64748b;font-size:0.8rem;">({ev.get("method")})</span></div>',
                                unsafe_allow_html=True
                            )
        else:
            st.warning("No sources were retrieved for this analysis.")
            
        st.markdown("---")
        st.warning("View the full interactive report - Report page in the sidebar")
        
        if st.button("NEW CHECK"):
            st.session_state.session_result = None
            st.rerun()

    except Exception as e:
        st.error(f"Pipeline error: {str(e)}")
        st.exception(e)