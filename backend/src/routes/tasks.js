const express = require('express');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all tasks (for my tasks view / dashboard)
router.get('/', auth, async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    const conditions = [];
    const vals = [];
    let i = 1;

    // Non-admins only see their own tasks
    if (req.user.role !== 'admin') {
      conditions.push(`t.assigned_to = $${i++}`);
      vals.push(req.user.id);
    } else if (assigned_to) {
      conditions.push(`t.assigned_to = $${i++}`);
      vals.push(assigned_to);
    }

    if (status) { conditions.push(`t.status = $${i++}`); vals.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT t.*, 
        u.name as assigned_to_name,
        l.property_address, l.owner_first_name, l.owner_last_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN leads l ON t.lead_id = l.id
      ${where}
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `, vals);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
