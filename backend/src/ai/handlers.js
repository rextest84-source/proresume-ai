import { grokChat, parseJsonFromModel } from '../services/grok.js';

const SYSTEM = `You are a professional resume writing assistant for ProResume AI.
Rules:
- Be factual and conservative. Never invent employers, degrees, dates, or metrics the user did not provide.
- Use clear, ATS-friendly language with strong action verbs.
- Return ONLY the format requested (plain text or JSON). No markdown unless asked.
- Assistive suggestions only — the user reviews everything before exporting.`;

function resumeContext(resume = {}) {
  return JSON.stringify({
    name: resume.name || '',
    title: resume.title || '',
    summary: resume.summary || '',
    skills: resume.skills || '',
    experience: resume.experience || [],
    education: resume.education || []
  }, null, 2);
}

export async function runAiAction(action, { resume, jobText, experienceIndex, regenerate }) {
  switch (action) {
    case 'enhance_summary':
    case 'regenerate_summary': {
      const content = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `${regenerate ? 'Write a fresh variation of' : 'Improve'} this professional summary for a ${resume.title || 'professional'} role.
Keep 3–4 sentences, 50–90 words, ATS-friendly. Do not invent employers or metrics.

Current summary:
${resume.summary || '(empty — write a starter summary from their title and skills)'}

Skills: ${resume.skills || 'none listed'}
Experience snapshot: ${JSON.stringify((resume.experience || []).slice(0, 2))}

Return ONLY the improved summary text.`
        }
      ], { maxTokens: 400 });
      return { summary: content.trim() };
    }

    case 'enhance_exp': {
      const exp = resume.experience?.[experienceIndex];
      if (!exp) throw Object.assign(new Error('Experience entry not found'), { status: 400 });
      const content = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Improve these resume bullet points for the role "${exp.role || resume.title || 'Professional'}".
Use 3–5 bullet lines starting with strong action verbs. Only use plausible metrics if implied by the original text — do not invent numbers.

Current bullets:
${exp.description || '(empty — write 3 starter bullets for this role)'}

Target role context: ${resume.title || ''}
Skills: ${resume.skills || ''}

Return ONLY the bullet lines, one per line, no numbering.`
        }
      ], { maxTokens: 600 });
      return { description: content.trim() };
    }

    case 'suggest_skills': {
      const content = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Suggest 10–14 relevant skills for a ${resume.title || 'professional'} resume.
Merge with existing skills where appropriate. Return a comma-separated list only.

Existing skills: ${resume.skills || 'none'}`
        }
      ], { maxTokens: 200 });
      return { skills: content.replace(/\n/g, ', ').trim() };
    }

    case 'build_resume': {
      if (!resume.title?.trim()) {
        throw Object.assign(new Error('Job title is required'), { status: 400 });
      }
      const raw = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Create starter resume content for someone targeting: "${resume.title}".
${resume.name ? `Name: ${resume.name}` : ''}

Return JSON only:
{
  "summary": "3-4 sentence professional summary",
  "skills": "comma-separated skills",
  "experience": [{"company": "Example Company", "role": "...", "dates": "2020 – Present", "description": "bullet\\nbullet\\nbullet"}],
  "education": [{"school": "University Name", "degree": "Bachelor's Degree", "year": "2020"}]
}

Use placeholder company/school names clearly generic (e.g. "Previous Employer") if unknown. Do not use real company names.`
        }
      ], { maxTokens: 1200, temperature: 0.7 });
      const parsed = parseJsonFromModel(raw);
      return {
        summary: String(parsed.summary || '').trim(),
        skills: String(parsed.skills || '').trim(),
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : []
      };
    }

    case 'job_match': {
      if (!jobText?.trim()) {
        throw Object.assign(new Error('Job description is required'), { status: 400 });
      }
      const raw = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Align this resume to the job posting with assistive edits — not a full rewrite.
Keep the user's real employers and dates. Adjust summary, skills, and bullet emphasis toward relevant keywords.

Resume:
${resumeContext(resume)}

Job posting:
${jobText.slice(0, 6000)}

Return JSON only:
{
  "summary": "aligned summary",
  "skills": "comma-separated skills emphasizing job keywords",
  "experience": [{"company": "...", "role": "...", "dates": "...", "description": "bullets"}],
  "keywordOverlap": 0-100
}`
        }
      ], { maxTokens: 1800, temperature: 0.6 });
      const parsed = parseJsonFromModel(raw);
      return {
        summary: String(parsed.summary || resume.summary || '').trim(),
        skills: String(parsed.skills || resume.skills || '').trim(),
        experience: Array.isArray(parsed.experience) ? parsed.experience : resume.experience,
        keywordOverlap: Math.min(100, Math.max(0, parseInt(parsed.keywordOverlap, 10) || 70))
      };
    }

    case 'cover_letter': {
      const content = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Write a professional cover letter draft from this resume.
${jobText?.trim() ? `Target job:\n${jobText.slice(0, 4000)}\n` : ''}
Resume:
${resumeContext(resume)}

Return the full letter as plain text with greeting and sign-off using the candidate's name if provided.`
        }
      ], { maxTokens: 900 });
      return { text: content.trim() };
    }

    case 'linkedin_tips': {
      const content = await grokChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Based on this resume, provide LinkedIn profile tips:
1) Headline suggestion
2) About section opening (2-3 sentences)
3) Skills to pin
4) Experience consistency tip
5) Keyword boost for their target role

Resume:
${resumeContext(resume)}

Return plain text with clear section labels.`
        }
      ], { maxTokens: 700 });
      return { text: content.trim() };
    }

    default:
      throw Object.assign(new Error(`Unknown AI action: ${action}`), { status: 400 });
  }
}
