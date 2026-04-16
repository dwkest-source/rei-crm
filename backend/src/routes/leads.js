const express = require('express');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// List leads with filters
router.get('/', auth, async (req, res) => {
  try {
    const { status, source, search, assigned_to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const vals = [];
    let i = 1;

    if (status) { conditions.push(`l.status = $${i++}`); vals.push(status); }
    if (source) { conditions.push(`l.source = $${i++}`); vals.push(source); }
    // Non-admins only see their own leads
    if (req.user.role !== 'admin') {
      conditions.push(`l.assigned_to = $${i++}`);
      vals.push(req.user.id);
    } else if (assigned_to) {
      conditions.push(`l.assigned_to = $${i++}`);
      vals.push(assigned_to);
    }
    if (search) {
      conditions.push(`(l.owner_first_name ILIKE $${i} OR l.owner_last_name ILIKE $${i} OR l.property_address ILIKE $${i} OR l.owner_phone ILIKE $${i} OR l.owner_phone2 ILIKE $${i} OR l.owner_phone3 ILIKE $${i} OR l.owner_email ILIKE $${i})`);
      vals.push(`%${search}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [leadsResult, countResult] = await Promise.all([
      pool.query(`
        SELECT l.*, 
          u1.name as assigned_to_name,
          u2.name as created_by_name,
          (SELECT COUNT(*) FROM notes WHERE lead_id = l.id) as note_count,
          (SELECT COUNT(*) FROM tasks WHERE lead_id = l.id AND status != 'Completed') as open_tasks,
          (SELECT MIN(due_date) FROM tasks WHERE lead_id = l.id AND status != 'Completed' AND due_date IS NOT NULL) as next_task_date
        FROM leads l
        LEFT JOIN users u1 ON l.assigned_to = u1.id
        LEFT JOIN users u2 ON l.created_by = u2.id
        ${where}
        ORDER BY l.updated_at DESC
        LIMIT $${i} OFFSET $${i+1}
      `, [...vals, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM leads l ${where}`, vals)
    ]);

    res.json({
      leads: leadsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const [leadResult, notesResult, tasksResult, activityResult, propertiesResult] = await Promise.all([
      pool.query(`
        SELECT l.*, 
          u1.name as assigned_to_name,
          u2.name as created_by_name
        FROM leads l
        LEFT JOIN users u1 ON l.assigned_to = u1.id
        LEFT JOIN users u2 ON l.created_by = u2.id
        WHERE l.id = $1
      `, [req.params.id]),
      pool.query(`
        SELECT n.*, u.name as author_name FROM notes n 
        LEFT JOIN users u ON n.user_id = u.id 
        WHERE n.lead_id = $1 ORDER BY n.created_at DESC
      `, [req.params.id]),
      pool.query(`
        SELECT t.*, u.name as assigned_to_name FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.lead_id = $1 ORDER BY t.due_date ASC NULLS LAST
      `, [req.params.id]),
      pool.query(`
        SELECT a.*, u.name as user_name FROM activities a 
        LEFT JOIN users u ON a.user_id = u.id 
        WHERE a.lead_id = $1 ORDER BY a.created_at DESC LIMIT 50
      `, [req.params.id]),
      pool.query('SELECT * FROM properties WHERE lead_id = $1 ORDER BY sort_order, created_at', [req.params.id]),
    ]);

    if (!leadResult.rows[0]) return res.status(404).json({ error: 'Lead not found' });

    res.json({
      ...leadResult.rows[0],
      notes: notesResult.rows,
      tasks: tasksResult.rows,
      activities: activityResult.rows,
      properties: propertiesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create lead
router.post('/', auth, async (req, res) => {
  const fields = [
    'property_address','property_city','property_state','property_zip','property_type',
    'owner_first_name','owner_last_name','owner_email','owner_phone','owner_phone2','owner_phone3',
    'owner_mailing_address','owner_mailing_city','owner_mailing_state','owner_mailing_zip',
    'source','status','motivation','asking_price','estimated_arv','estimated_repair','offer_price',
    'campaign','list_name','assigned_to','bedrooms','bathrooms','sqft','lot_sqft','property_notes'
  ];
  try {
    const cols = ['created_by'];
    const vals = [req.user.id];
    let i = 2;
    // Auto-assign to creator if they're not admin
    if (req.user.role !== 'admin' && !req.body.assigned_to) {
      cols.push('assigned_to');
      vals.push(req.user.id);
      i++;
    }

    for (const f of fields) {
      if (req.body[f] !== undefined && req.body[f] !== '') {
        cols.push(f);
        vals.push(req.body[f]);
        i++;
      }
    }

    const result = await pool.query(
      `INSERT INTO leads (${cols.join(',')}) VALUES (${cols.map((_,idx) => `$${idx+1}`).join(',')}) RETURNING *`,
      vals
    );

    await pool.query(
      'INSERT INTO activities (lead_id, user_id, type, description) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, req.user.id, 'created', 'Lead created']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lead
router.patch('/:id', auth, async (req, res) => {
  const fields = [
    'property_address','property_city','property_state','property_zip','property_type',
    'owner_first_name','owner_last_name','owner_email','owner_phone','owner_phone2','owner_phone3',
    'owner_mailing_address','owner_mailing_city','owner_mailing_state','owner_mailing_zip',
    'source','status','motivation','asking_price','estimated_arv','estimated_repair','offer_price',
    'campaign','list_name','assigned_to','bedrooms','bathrooms','sqft','lot_sqft','property_notes'
  ];
  try {
    const updates = [];
    const vals = [];
    let i = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i++}`);
        vals.push(req.body[f] === '' ? null : req.body[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);

    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );

    if (req.body.status) {
      await pool.query(
        'INSERT INTO activities (lead_id, user_id, type, description) VALUES ($1, $2, $3, $4)',
        [req.params.id, req.user.id, 'status_change', `Status changed to: ${req.body.status}`]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Notes ---
router.post('/:id/notes', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await pool.query(
      'INSERT INTO notes (lead_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content]
    );
    await pool.query(
      'INSERT INTO activities (lead_id, user_id, type, description) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'note', 'Note added']
    );
    await pool.query('UPDATE leads SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    const note = await pool.query('SELECT n.*, u.name as author_name FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = $1', [result.rows[0].id]);
    res.status(201).json(note.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/notes/:noteId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [req.params.noteId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Tasks ---
router.post('/:id/tasks', auth, async (req, res) => {
  const { title, description, due_date, priority, assigned_to } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      'INSERT INTO tasks (lead_id, created_by, assigned_to, title, description, due_date, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.params.id, req.user.id, assigned_to || req.user.id, title, description, due_date || null, priority || 'Medium']
    );
    await pool.query(
      'INSERT INTO activities (lead_id, user_id, type, description) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'task', `Task created: ${title}`]
    );
    await pool.query('UPDATE leads SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    const task = await pool.query('SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = $1', [result.rows[0].id]);
    res.status(201).json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/tasks/:taskId', auth, async (req, res) => {
  const { title, description, due_date, priority, status, assigned_to } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, due_date, priority, status, assigned_to, req.params.taskId]
    );
    const task = await pool.query('SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = $1', [req.params.taskId]);
    res.json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/tasks/:taskId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// --- Properties ---
router.get('/:id/properties', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE lead_id = $1 ORDER BY sort_order, created_at', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/properties', auth, async (req, res) => {
  const { address, city, state, zip, property_type, bedrooms, bathrooms, sqft } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO properties (lead_id, address, city, state, zip, property_type, bedrooms, bathrooms, sqft) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.params.id, address, city, state, zip, property_type, bedrooms||null, bathrooms||null, sqft||null]
    );
    await pool.query('UPDATE leads SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/properties/:propId', auth, async (req, res) => {
  const { address, city, state, zip, property_type, bedrooms, bathrooms, sqft } = req.body;
  try {
    const result = await pool.query(
      `UPDATE properties SET address=$1, city=$2, state=$3, zip=$4, property_type=$5, bedrooms=$6, bathrooms=$7, sqft=$8 WHERE id=$9 RETURNING *`,
      [address, city, state, zip, property_type, bedrooms||null, bathrooms||null, sqft||null, req.params.propId]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/properties/:propId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM properties WHERE id = $1', [req.params.propId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Stats
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const params = isAdmin ? [] : [req.user.id];
    const whereClause = isAdmin ? '' : 'WHERE assigned_to = $1';
    const andClause = isAdmin ? '' : 'AND assigned_to = $1';

    const [statusCounts, sourceCounts, recentLeads, tasksDue] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM leads ${whereClause} GROUP BY status ORDER BY count DESC`, params),
      pool.query(`SELECT source, COUNT(*) as count FROM leads ${whereClause} GROUP BY source ORDER BY count DESC`, params),
      pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '30 days' ${andClause}`, params),
      pool.query(`SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND due_date < NOW() + INTERVAL '3 days' AND due_date >= NOW()`),
    ]);
    res.json({
      byStatus: statusCounts.rows,
      bySource: sourceCounts.rows,
      last30Days: parseInt(recentLeads.rows[0].count),
      tasksDueSoon: parseInt(tasksDue.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
