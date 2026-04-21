const express = require('express');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get my notifications
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, 
        u.name as from_user_name,
        l.property_address, l.owner_first_name, l.owner_last_name
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN leads l ON n.lead_id = l.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
