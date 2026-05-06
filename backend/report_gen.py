"""
Generate a simple PDF report from analysis results.
Uses reportlab for PDF generation.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


def generate_pdf_report(analysis: dict) -> bytes:
    """
    Generate a simple PDF report from analysis results.
    Returns bytes of the PDF.
    """
    try:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=40, bottomMargin=40)
        story = []
        styles = getSampleStyleSheet()

        # Title
        story.append(Paragraph("SkillSync Resume Analysis Report", styles['Heading1']))
        story.append(Spacer(1, 20))

        # Match Score
        score = analysis.get("match", {}).get("final_score", 0)
        story.append(Paragraph(f"<b>Match Score: {score}%</b>", styles['Heading2']))
        story.append(Spacer(1, 12))

        # Resume Skills
        resume_skills = analysis.get("resume_skills", {})
        hard_skills = resume_skills.get("hard") or []
        soft_skills = resume_skills.get("soft") or []

        story.append(Paragraph("Your Skills", styles['Heading2']))
        if hard_skills:
            story.append(Paragraph(f"<b>Hard Skills:</b> {', '.join(hard_skills)}", styles['Normal']))
        else:
            story.append(Paragraph("Hard Skills: None detected", styles['Normal']))

        if soft_skills:
            story.append(Paragraph(f"<b>Soft Skills:</b> {', '.join(soft_skills)}", styles['Normal']))
        else:
            story.append(Paragraph("Soft Skills: None detected", styles['Normal']))
        story.append(Spacer(1, 12))

        # JD Skills
        jd_skills = analysis.get("jd_skills", {})
        jd_hard = jd_skills.get("hard") or []
        jd_soft = jd_skills.get("soft") or []

        story.append(Paragraph("Job Description Skills", styles['Heading2']))
        if jd_hard:
            story.append(Paragraph(f"<b>Hard Skills:</b> {', '.join(jd_hard)}", styles['Normal']))
        else:
            story.append(Paragraph("Hard Skills: None", styles['Normal']))

        if jd_soft:
            story.append(Paragraph(f"<b>Soft Skills:</b> {', '.join(jd_soft)}", styles['Normal']))
        else:
            story.append(Paragraph("Soft Skills: None", styles['Normal']))
        story.append(Spacer(1, 12))

        # Matched Skills
        match_data = analysis.get("match", {})
        matched_hard = match_data.get("matched_hard") or []
        matched_soft = match_data.get("matched_soft") or []

        story.append(Paragraph("Matched Skills", styles['Heading2']))
        if matched_hard or matched_soft:
            all_matched = matched_hard + matched_soft
            story.append(Paragraph(f"{', '.join(all_matched)}", styles['Normal']))
        else:
            story.append(Paragraph("No skills matched", styles['Normal']))
        story.append(Spacer(1, 12))

        # Missing Skills
        missing_skills = match_data.get("missing_skills") or []
        if missing_skills:
            story.append(Paragraph("Skills to Develop", styles['Heading2']))
            for item in missing_skills[:10]:
                skill = item.get("skill", "Unknown")
                skill_type = item.get("type", "")
                story.append(Paragraph(f"• {skill} ({skill_type})", styles['Normal']))
            story.append(Spacer(1, 12))

        # Recommended Roles
        roles = analysis.get("roles") or []
        if roles:
            story.append(Paragraph("Recommended IT Roles", styles['Heading2']))
            for role in roles[:5]:
                role_name = role.get("role", "Unknown")
                score = role.get("score", 0)
                story.append(Paragraph(f"• {role_name}: {score}%", styles['Normal']))
            story.append(Spacer(1, 12))

        # Trending Skills
        trending = analysis.get("trending") or []
        if trending:
            story.append(Paragraph("Trending Skills", styles['Heading2']))
            for item in trending[:5]:
                skill = item.get("skill", "Unknown")
                trend = item.get("trend", "")
                story.append(Paragraph(f"• {skill} ({trend})", styles['Normal']))

        # Build the PDF
        doc.build(story)
        pdf_bytes = buf.getvalue()
        buf.close()
        return pdf_bytes

    except Exception as e:
        raise Exception(f"PDF generation error: {str(e)}")
