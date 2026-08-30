import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { getPlanLimits } from '../plans.js';
import { notifyResumeUpdated } from '../services/realtime.js';
import {
  saveResumeVersion,
  listResumeVersions,
  getResumeVersion
} from '../services/resume-history.js';

const router = Router();

const DEFAULT_RESUME = {
  name: '', title: '', email: '', phone: '', location: '',
  summary: '',
  experience: [{ company: '', role: '', dates: '', description: '' }],
  education: [{ school: '', degree: '', year: '' }],
  skills: '',
  template: 'modern'
};

function normalizeResumeData(data) {
  return { ...DEFAULT_RESUME, ...(data || {}) };
}

router.use(requireAuth, loadUser);

/** List all resumes for the logged-in user */
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, is_default, updated_at, created_at,
              data->>'name' AS preview_name, data->>'title' AS preview_title
       FROM resumes WHERE user_id = $1 ORDER BY is_default DESC, updated_at DESC`,
      [req.userId]
    );
    res.json({ resumes: rows });
  } catch (err) {
    console.error('list resumes:', err);
    res.status(500).json({ error: 'Failed to load resumes' });
  }
});

/** List version history for a resume */
router.get('/:id/history', async (req, res) => {
  try {
    const owned = await query(
      'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!owned.rows[0]) return res.status(404).json({ error: 'Resume not found' });

    const versions = await listResumeVersions(req.params.id, req.userId);
    res.json({ versions });
  } catch (err) {
    console.error('list resume history:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

/** Save an explicit history snapshot (e.g. page unload beacon) */
router.post('/:id/history', async (req, res) => {
  try {
    const owned = await query(
      'SELECT id, title FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!owned.rows[0]) return res.status(404).json({ error: 'Resume not found' });

    const normalized = normalizeResumeData(req.body?.data);
    const title = (req.body?.title || owned.rows[0].title || 'My Resume').trim();
    const source = (req.body?.source || 'snapshot').slice(0, 50);

    const version = await saveResumeVersion({
      resumeId: req.params.id,
      userId: req.userId,
      data: normalized,
      title,
      source
    });

    res.status(version ? 201 : 200).json({ version, skipped: !version });
  } catch (err) {
    console.error('save resume history:', err);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

/** Get one resume */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, title, data, is_default, updated_at FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' });
    res.json({ resume: rows[0] });
  } catch (err) {
    console.error('get resume:', err);
    res.status(500).json({ error: 'Failed to load resume' });
  }
});

/** Get one history version with full data */
router.get('/:id/history/:versionId', async (req, res) => {
  try {
    const version = await getResumeVersion(req.params.versionId, req.userId);
    if (!version || version.resume_id !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json({ version });
  } catch (err) {
    console.error('get resume version:', err);
    res.status(500).json({ error: 'Failed to load version' });
  }
});

/** Create a new resume */
router.post('/', async (req, res) => {
  try {
    const limits = getPlanLimits(req.user.plan);
    const count = await query('SELECT COUNT(*)::int AS n FROM resumes WHERE user_id = $1', [req.userId]);
    if (count.rows[0].n >= limits.maxResumes) {
      return res.status(403).json({
        error: `Your ${req.user.plan} plan allows up to ${limits.maxResumes} resume(s). Upgrade to add more.`
      });
    }
    const { title, data } = req.body;
    const normalized = normalizeResumeData(data);
    const { rows } = await query(
      `INSERT INTO resumes (user_id, title, data, is_default)
       VALUES ($1, $2, $3, false)
       RETURNING id, title, data, is_default, updated_at`,
      [req.userId, (title || 'Untitled Resume').trim(), JSON.stringify(normalized)]
    );

    res.status(201).json({ resume: rows[0] });
  } catch (err) {
    console.error('create resume:', err);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

/** Save / update resume data */
router.put('/:id', async (req, res) => {
  try {
    const { title, data } = req.body;
    const normalized = normalizeResumeData(data);
    const fields = [JSON.stringify(normalized), req.params.id, req.userId];
    let sql = `UPDATE resumes SET data = $1, updated_at = NOW()`;
    if (title?.trim()) {
      sql += `, title = $4`;
      fields.push(title.trim());
    }
    sql += ` WHERE id = $2 AND user_id = $3 RETURNING id, title, data, is_default, updated_at`;

    const { rows } = await query(sql, fields);
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' });

    notifyResumeUpdated({
      userId: req.userId,
      resumeId: rows[0].id,
      resume: rows[0],
      clientId: req.body?.clientId || null
    }).catch((err) => console.warn('Resume sync notify failed:', err.message));

    res.json({ resume: rows[0] });
  } catch (err) {
    console.error('update resume:', err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

/** Restore a history version as the current resume */
router.post('/:id/history/:versionId/restore', async (req, res) => {
  try {
    const version = await getResumeVersion(req.params.versionId, req.userId);
    if (!version || version.resume_id !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const normalized = normalizeResumeData(version.data);
    const { rows } = await query(
      `UPDATE resumes SET data = $1, title = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, title, data, is_default, updated_at`,
      [JSON.stringify(normalized), version.title || 'My Resume', req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' });

    notifyResumeUpdated({
      userId: req.userId,
      resumeId: rows[0].id,
      resume: rows[0],
      clientId: req.body?.clientId || null
    }).catch((err) => console.warn('Resume sync notify failed:', err.message));

    res.json({ resume: rows[0], restoredFrom: version.id });
  } catch (err) {
    console.error('restore resume version:', err);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

/** Set default resume */
router.post('/:id/default', async (req, res) => {
  try {
    await query('UPDATE resumes SET is_default = false WHERE user_id = $1', [req.userId]);
    const { rows } = await query(
      `UPDATE resumes SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_default`,
      [req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' });
    res.json({ resume: rows[0] });
  } catch (err) {
    console.error('set default:', err);
    res.status(500).json({ error: 'Failed to set default resume' });
  }
});

/** Delete resume */
router.delete('/:id', async (req, res) => {
  try {
    const count = await query('SELECT COUNT(*)::int AS n FROM resumes WHERE user_id = $1', [req.userId]);
    if (count.rows[0].n <= 1) {
      return res.status(400).json({ error: 'You must keep at least one resume' });
    }
    const { rowCount } = await query(
      'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Resume not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('delete resume:', err);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
