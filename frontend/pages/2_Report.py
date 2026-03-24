import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from frontend.utils import inject_custom_css
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import json

st.set_page_config(page_title="Accuracy Report - FactCheck Engine", layout="wide")

inject_custom_css()

# Native Streamlit navigation is used instead of custom page links.


# ── Check for result ──────────────────────────────────────────────────────────
result = st.session_state.get("session_result", None)

if not result:
    st.markdown("""
    <div style="text-align:center;padding:4rem 0;font-family:JetBrains Mono,monospace;color:#888888;">
        <div style="font-size:2rem;margin-bottom:1rem;color:#E36A6A;font-weight:700;">-</div>
        <div style="font-size:1.2rem;font-weight:700;color:#64748b;">No Report Yet</div>
        <div style="font-size:0.85rem;margin-top:0.5rem;">Run a fact-check from the Home page or Load a session from History.</div>
    </div>
    """, unsafe_allow_html=True)
    st.stop()


# ── Helper: verdict → color/class/emoji ──────────────────────────────────────
VERDICT_META = {
    "TRUE":          {"color": "#10b981", "cls": "claim-true",         "emoji": "", "bg": "rgba(16,185,129,0.1)"},
    "FALSE":         {"color": "#ef4444", "cls": "claim-false",        "emoji": "", "bg": "rgba(239,68,68,0.1)"},
    "PARTIALLY TRUE":{"color": "#f59e0b", "cls": "claim-partial",      "emoji": "", "bg": "rgba(245,158,11,0.1)"},
    "UNVERIFIABLE":  {"color": "#9CA3AF", "cls": "claim-unverifiable", "emoji": "", "bg": "rgba(148,163,184,0.05)"},
    "OUTDATED":      {"color": "#a78bfa", "cls": "claim-unverifiable", "emoji": "", "bg": "rgba(167,139,250,0.08)"},
}

def verdict_badge_html(verdict: str) -> str:
    m = VERDICT_META.get(verdict, VERDICT_META["UNVERIFIABLE"])
    return (
        f'<span style="background:{m["bg"]};color:{m["color"]};border:1px solid {m["color"]};'
        f'border-radius:5px;padding:2px 10px;font-family:JetBrains Mono,monospace;'
        f'font-size:0.72rem;font-weight:600;">{m["emoji"]} {verdict}</span>'
    )


# ── HEADER: Accuracy Gauge + Key Metrics ─────────────────────────────────────
st.markdown('<div style="font-family:JetBrains Mono,monospace;color:#E36A6A;font-size:0.75rem;letter-spacing:2px;margin-bottom:0.5rem;">FACT-CHECK REPORT</div>', unsafe_allow_html=True)

overall = result.get("overall_accuracy_score", 0)
trust   = result.get("trust_score", 0)

score_color = "#10b981" if overall >= 70 else "#f59e0b" if overall >= 40 else "#ef4444"

header_col1, header_col2 = st.columns([1, 2])

with header_col1:
    # Plotly gauge
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=overall,
        title={"text": "Credibility Score", "font": {"family": "JetBrains Mono", "color": "#888888", "size": 13}},
        number={"font": {"family": "JetBrains Mono", "size": 48, "color": score_color}, "suffix": ""},
        gauge={
            "axis": {"range": [0, 100], "tickcolor": "#CCCCCC", "tickfont": {"color": "#888888", "size": 10}},
            "bar": {"color": score_color, "thickness": 0.25},
            "bgcolor": "rgba(0,0,0,0.02)",
            "borderwidth": 0,
            "steps": [
                {"range": [0, 40],  "color": "rgba(239,68,68,0.08)"},
                {"range": [40, 70], "color": "rgba(245,158,11,0.08)"},
                {"range": [70, 100],"color": "rgba(16,185,129,0.08)"},
            ],
            "threshold": {
                "line": {"color": score_color, "width": 3},
                "thickness": 0.75,
                "value": overall,
            },
        },
    ))
    fig_gauge.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=20, r=40, t=40, b=20),
        height=260,
    )
    st.plotly_chart(fig_gauge, use_container_width=True)

with header_col2:
    st.markdown("<br>", unsafe_allow_html=True)
    vc = result.get("verdict_counts", {})
    total_claims = result.get("total_claims", 0)
    ai_prob = result.get("ai_detection", {}).get("ensemble_probability", 0)
    ai_label = result.get("ai_detection", {}).get("label", "N/A")

    col_a, col_b = st.columns(2)
    with col_a:
        st.metric("Trust Score", f"{trust:.1f}/100")
        st.metric("TRUE Claims",  f"{vc.get('TRUE', 0)} / {total_claims}")
        st.metric("FALSE Claims", f"{vc.get('FALSE', 0)} / {total_claims}")
    with col_b:
        st.metric("Avg Confidence", f"{result.get('average_confidence', 0):.1f}%")
        st.metric("PARTIAL Claims", f"{vc.get('PARTIALLY TRUE', 0)} / {total_claims}")
        st.metric("Unverifiable", f"{vc.get('UNVERIFIABLE', 0)} / {total_claims}")

    # AI detection strip
    ai_color = "#ef4444" if ai_prob >= 70 else "#f59e0b" if ai_prob >= 40 else "#10b981"
    st.markdown(f"""
    <div style="background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.1);border-radius:8px;padding:0.75rem 1rem;margin-top:0.5rem;">
    <div style="font-family:JetBrains Mono,monospace;font-size:0.7rem;color:#888888;margin-bottom:0.25rem;">AI TEXT PROBABILITY</div>
    <div style="display:flex;align-items:center;gap:1rem;">
      <div style="font-family:JetBrains Mono,monospace;font-size:1.5rem;font-weight:700;color:{ai_color};">{ai_prob:.0f}%</div>
      <div style="font-size:0.82rem;color:#888888;">{ai_label}</div>
    </div>
    </div>
    """, unsafe_allow_html=True)


# ── Narrative Summary ─────────────────────────────────────────────────────────
st.markdown("---")
narrative = result.get("narrative", "")
if narrative:
    st.markdown(f"""
    <div class="fc-card">
    <div style="font-family:JetBrains Mono,monospace;color:#888888;font-size:0.72rem;letter-spacing:2px;margin-bottom:0.75rem;">EXECUTIVE SUMMARY</div>
    <div style="color:#555555;font-size:1rem;line-height:1.8;font-style:italic;border-left:3px solid #E36A6A;padding-left:1rem;">{narrative}</div>
    </div>
    """, unsafe_allow_html=True)



# ── NEW: Interactive Charts Section ───────────────────────────────────────────
st.markdown("### Analysis Breakdown")

chart_col1, chart_col2 = st.columns(2)

# 1. Verdict Distribution Pie Chart
with chart_col1:
    st.markdown("**Verdict Distribution**")
    
    # Filter out 0 counts for cleaner chart
    labels = [k for k, v in vc.items() if v > 0]
    values = [v for k, v in vc.items() if v > 0]
    
    if labels:
        # Map colors
        pie_colors = [VERDICT_META.get(l, {}).get("color", "#64748b") for l in labels]
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=labels, 
            values=values, 
            hole=.4,
            marker_colors=pie_colors,
            textinfo='label+percent',
            textfont={'color':"#333333", 'family':"JetBrains Mono"},
            hoverinfo='label+value'
        )])
        fig_pie.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=20, b=20, l=20, r=20),
            height=300,
            showlegend=False
        )
        st.plotly_chart(fig_pie, use_container_width=True)
    else:
        st.warning("No verdict data to display.")

# 2. Confidence Distribution Bar Chart
with chart_col2:
    st.markdown("**Confidence Distribution**")
    
    claims_data = result.get("claims", [])
    
    # Buckets: 0-29 (Low), 30-69 (Medium), 70-89 (High), 90-100 (Very High)
    buckets = {"Low (0-29)": 0, "Medium (30-69)": 0, "High (70-89)": 0, "Very High (90-100)": 0}
    
    for c in claims_data:
        conf = c.get("confidence_score", 0)
        if conf <= 29: buckets["Low (0-29)"] += 1
        elif conf <= 69: buckets["Medium (30-69)"] += 1
        elif conf <= 89: buckets["High (70-89)"] += 1
        else: buckets["Very High (90-100)"] += 1
            
    df_conf = pd.DataFrame({
        'Range': list(buckets.keys()),
        'Count': list(buckets.values())
    })
    
    # Colors for bars
    bar_colors = ['#ef4444', '#f59e0b', '#E36A6A', '#10b981']
    
    fig_bar = px.bar(df_conf, x='Range', y='Count', 
                     text='Count',
                     color='Range',
                     color_discrete_sequence=bar_colors)
    
    fig_bar.update_traces(textposition='outside', textfont={'color': '#333333'})
    fig_bar.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(t=20, b=20, l=20, r=20),
        height=300,
        xaxis=dict(title='', showgrid=False, tickfont={'color': '#888888'}),
        yaxis=dict(title='Claims', showgrid=True, gridcolor='rgba(0,0,0,0.05)', tickfont={'color': '#888888'}),
        showlegend=False
    )
    st.plotly_chart(fig_bar, use_container_width=True)

# 3. Source Credibility Analysis
st.markdown("---")
st.markdown("### Source Credibility Analysis")

all_evidence = [e for c in claims_data for e in c.get("evidence", [])]

if all_evidence:
    tier_counts = {}
    for e in all_evidence:
        tier = e.get("domain_tier", 4)
        label = {1: "Authoritative", 2: "Reputable", 
                 3: "Moderate", 4: "Others"}.get(tier, "Others")
        tier_counts[label] = tier_counts.get(label, 0) + 1

    df_tiers = pd.DataFrame({
        'Tier': list(tier_counts.keys()),
        'Sources': list(tier_counts.values())
    })
    
    tier_colors_map = {
        "Authoritative": "#10b981",
        "Reputable": "#E36A6A",
        "Moderate": "#f59e0b",
        "Others": "#9CA3AF"
    }
    
    fig_tier = go.Figure(data=[go.Bar(
        x=df_tiers['Tier'],
        y=df_tiers['Sources'],
        marker_color=[tier_colors_map.get(t, "#64748b") for t in df_tiers['Tier']],
        text=df_tiers['Sources'],
        textposition='auto',
        textfont={'color': '#333333'}
    )])
    
    fig_tier.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(t=20, b=20, l=20, r=20),
        height=250,
        xaxis=dict(title='', tickfont={'color': '#888888', 'size': 12}),
        yaxis=dict(title='Count', showgrid=True, gridcolor='rgba(0,0,0,0.05)', tickfont={'color': '#888888'}),
    )
    
    st.plotly_chart(fig_tier, use_container_width=True)
else:
    st.warning("No sources were retrieved for this analysis.")

# ── Claim Cards ───────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown("### Claim-by-Claim Analysis")

# Filters
filter_col1, filter_col2, filter_col3 = st.columns(3)
with filter_col1:
    filter_verdict = st.multiselect(
        "Filter by Verdict",
        ["TRUE", "FALSE", "PARTIALLY TRUE", "UNVERIFIABLE", "OUTDATED"],
        default=["TRUE", "FALSE", "PARTIALLY TRUE", "UNVERIFIABLE", "OUTDATED"],
    )
with filter_col2:
    sort_by = st.selectbox("Sort by", ["Confidence (High to Low)", "Confidence (Low to High)", "Claim ID"])
with filter_col3:
    min_conf = st.slider("Min Confidence %", 0, 100, 0)

claims = result.get("claims", [])

# Apply filters
filtered = [c for c in claims if c.get("verdict", "UNVERIFIABLE") in filter_verdict]
filtered = [c for c in filtered if c.get("confidence_score", 0) >= min_conf]

if sort_by == "Confidence (High→Low)":
    filtered.sort(key=lambda x: x.get("confidence_score", 0), reverse=True)
elif sort_by == "Confidence (Low→High)":
    filtered.sort(key=lambda x: x.get("confidence_score", 0))

st.caption(f"Showing {len(filtered)} of {len(claims)} claims")

for claim in filtered:
    verdict  = claim.get("verdict", "UNVERIFIABLE")
    meta     = VERDICT_META.get(verdict, VERDICT_META["UNVERIFIABLE"])
    conf     = claim.get("confidence_score", 0)
    claim_id = claim.get("id", "?")
    audited  = claim.get("audit_flagged", False)

    with st.expander(
        f"[{claim_id.upper()}] {claim.get('text', '')[:100]}{'...' if len(claim.get('text','')) > 100 else ''}",
        expanded=False,
    ):
        card_col1, card_col2 = st.columns([5, 1])

        with card_col1:
            st.markdown(f"**Full Claim:** {claim.get('text', '')}")
            st.markdown(f"**Type:** `{claim.get('type', 'GENERAL')}` {'Temporally Sensitive' if claim.get('temporally_sensitive') else ''}")

            # Reasoning
            if claim.get("reasoning"):
                st.markdown("**Verification Reasoning:**")
                st.markdown(f"> {claim['reasoning']}")

            # Self-reflection
            if claim.get("self_reflection"):
                st.markdown(f"**Self-Reflection:** *{claim['self_reflection']}*")

            if audited:
                st.warning("This verdict was flagged by the hallucination self-audit and may have been corrected.")

            # Contradiction
            if claim.get("contradictions_detected"):
                st.error(f"**Conflict Detected:** {claim.get('contradiction_explanation', 'Sources disagree.')}")

            # Temporal note
            if claim.get("temporal_note"):
                st.warning(f"{claim['temporal_note']}")

        with card_col2:
            # Verdict badge
            st.markdown(verdict_badge_html(verdict), unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)

            # Confidence bar
            bar_color = "#10b981" if conf >= 70 else "#f59e0b" if conf >= 40 else "#ef4444"
            st.markdown(f"""
            <div style="font-family:JetBrains Mono,monospace;font-size:0.7rem;color:#64748b;margin-bottom:4px;">CONFIDENCE</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:1.8rem;font-weight:700;color:{bar_color};">{conf}%</div>
            <div style="background:rgba(0,0,0,0.1);border-radius:4px;height:6px;margin-top:6px;">
              <div style="background:{bar_color};width:{conf}%;height:100%;border-radius:4px;"></div>
            </div>
            """, unsafe_allow_html=True)

        # Evidence sources
        evidence = claim.get("evidence", [])
        citations = claim.get("supporting_citations", [])
        contradicting = claim.get("contradicting_citations", [])

        if evidence:
            st.markdown("**Evidence Sources:**")
            for ev in evidence[:4]:
                tier = ev.get("domain_tier", 4)
                tier_color = {1: "#10b981", 2: "#E36A6A", 3: "#f59e0b", 4: "#64748b"}.get(tier, "#64748b")
                method_color = {"bs4": "#E36A6A", "selenium": "#f97316", "playwright": "#a855f7", "scrapling": "#10b981"}.get(ev.get("method",""), "#64748b")

                is_supporting = ev.get("url") in citations
                is_contradicting = ev.get("url") in contradicting
                border = "#10b981" if is_supporting else "#ef4444" if is_contradicting else "rgba(0,0,0,0.1)"

                st.markdown(f"""
                <div style="border:1px solid {border};border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.4rem;background:#FFFFFF;">
                  <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                    <span style="color:{method_color};font-family:JetBrains Mono,monospace;font-size:0.68rem;background:rgba(0,0,0,0.08);padding:1px 6px;border-radius:4px;">{ev.get('method','').upper()}</span>
                    <span style="color:{tier_color};font-family:JetBrains Mono,monospace;font-size:0.68rem;">T{tier}</span>
                    <a href="{ev.get('url','#')}" target="_blank" style="color:#E36A6A;font-size:0.8rem;text-decoration:none;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">{ev.get('domain', ev.get('url',''))}</a>
                    {'<span style="color:#10b981;font-size:0.7rem;">Supporting</span>' if is_supporting else ''}
                    {'<span style="color:#ef4444;font-size:0.7rem;">Contradicting</span>' if is_contradicting else ''}
                  </div>
                </div>
                """, unsafe_allow_html=True)


# ── Export Section ────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown("### Export Report")
exp_col1, exp_col2, exp_col3 = st.columns(3)

with exp_col1:
    # JSON export
    json_str = json.dumps(result, indent=2, default=str)
    st.download_button(
        "Download JSON Report",
        data=json_str,
        file_name=f"factcheck_{result['session_id']}.json",
        mime="application/json",
        use_container_width=True,
    )

with exp_col2:
    # CSV export of claims
    claims_df = pd.DataFrame([{
        "id": c.get("id"),
        "claim": c.get("text"),
        "type": c.get("type"),
        "verdict": c.get("verdict"),
        "confidence": c.get("confidence_score"),
        "reasoning": c.get("reasoning"),
        "supporting_sources": len(c.get("supporting_citations", [])),
        "contradicting_sources": len(c.get("contradicting_citations", [])),
        "temporally_sensitive": c.get("temporally_sensitive", False),
    } for c in claims])
    st.download_button(
        "Download CSV (Claims)",
        data=claims_df.to_csv(index=False),
        file_name=f"claims_{result['session_id']}.csv",
        mime="text/csv",
        use_container_width=True,
    )

with exp_col3:
    # AI detection report
    ai_json = json.dumps(result.get("ai_detection", {}), indent=2, default=str)
    st.download_button(
        "Download AI Detection Report",
        data=ai_json,
        file_name=f"ai_detection_{result['session_id']}.json",
        mime="application/json",
        use_container_width=True,
    )

if st.button("New Check"):

    st.session_state.session_result = None
    st.switch_page("Home.py")