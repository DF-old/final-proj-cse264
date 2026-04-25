import { query } from '../db/postgres.js';

const userTable = process.env.USER_TABLE;        // title=username, body=hashed password
const eventTable = process.env.EVENT_TABLE; // company=userId, position=title, notes=JSON, status='event'
const configTable = process.env.CONFIG_TABLE;          // title=sentinel '__config__:{userId}', body=JSON

const formatDateString = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().split('T')[0];
};

// ─── User routes ─────────────────────────────────────────────────────────────

const userRoutes = (app) => {

  // POST /users — register
  app.post('/users', async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required' });

      const existing = await query(
        `SELECT 1 FROM ${userTable} WHERE title = $1`, [username]
      );
      if (existing.rowCount > 0)
        return res.status(400).json({ message: 'Username already taken.' });

      const result = await query(
        `INSERT INTO ${userTable} (title, body) VALUES ($1, $2) RETURNING review_id`,
        [username, password]
      );
      res.status(201).json({
        id: String(result.rows[0].review_id),
        message: '1 user(s) created successfully.',
      });
    } catch (err) { next(err); }
  });

  // POST /users/login — login, returns user object
  app.post('/users/login', async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required' });

      const data = await query(
        `SELECT * FROM ${userTable} WHERE title = $1 AND body = $2`,
        [username, password]
      );
      if (data.rowCount === 0)
        return res.status(404).json({ message: 'No account found with that username or email.' });

      const row = data.rows[0];
      res.json({
        id: String(row.review_id),
        username: row.title,
        createdAt: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // PUT /users — change password
  app.put('/users', async (req, res, next) => {
    try {
      const { username, oldPassword, newPassword } = req.body;
      if (!username || !oldPassword || !newPassword)
        return res.status(400).json({ message: 'username, oldPassword, and newPassword are required' });

      const check = await query(
        `SELECT 1 FROM ${userTable} WHERE title = $1 AND body = $2`,
        [username, oldPassword]
      );
      if (check.rowCount === 0)
        return res.status(401).json({ message: 'Incorrect password.' });

      await query(
        `UPDATE ${userTable} SET body = $1 WHERE title = $2`,
        [newPassword, username]
      );
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) { next(err); }
  });
};

// Event routes
// Mapping: company=userId, position=event title, status='event',
//          applied_on=event date, notes=JSON of extra EventDraft fields

const eventRoutes = (app) => {

  // POST /events — create a new event
  // Body: { userId, title, date, ...rest }
  app.post('/events', async (req, res, next) => {
    try {
      const { userId, title, date, ...rest } = req.body;
      if (!userId || !title)
        return res.status(400).json({ message: 'userId and title are required' });

      const eventDate = date || formatDateString();
      const notes = JSON.stringify({ date: eventDate, ...rest });

      const result = await query(
        `INSERT INTO ${eventTable} (company, position, status, applied_on, notes)
         VALUES ($1, $2, 'event', $3, $4)
         RETURNING id`,
        [userId, title, eventDate, notes]
      );
      res.status(201).json({ id: String(result.rows[0].id), message: '1 event(s) created successfully.' });
    } catch (err) { next(err); }
  });

  // GET /events?userId=... — all events for a user
  app.get('/events', async (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId)
        return res.status(400).json({ message: 'userId query param is required' });

      const data = await query(
        `SELECT * FROM ${eventTable}
         WHERE company = $1 AND status = 'event'
         ORDER BY applied_on ASC, id ASC`,
        [userId]
      );
      res.json(data.rows.map(mapEventRow));
    } catch (err) { next(err); }
  });

  // GET /events/:eventId — single event
  app.get('/events/:eventId', async (req, res, next) => {
    try {
      const data = await query(
        `SELECT * FROM ${eventTable} WHERE id = $1 AND status = 'event'`,
        [req.params.eventId]
      );
      if (data.rowCount === 0)
        return res.status(404).json({ message: 'Event not found' });

      res.json(mapEventRow(data.rows[0]));
    } catch (err) { next(err); }
  });

  // PUT /events/:eventId — full update
  // Body: { userId, title, date, ...rest }
  app.put('/events/:eventId', async (req, res, next) => {
    try {
      const { userId, title, date, ...rest } = req.body;
      if (!userId || !title)
        return res.status(400).json({ message: 'userId and title are required' });

      const eventDate = date || formatDateString();
      const notes = JSON.stringify({ date: eventDate, ...rest });

      const result = await query(
        `UPDATE ${eventTable}
         SET company = $1, position = $2, applied_on = $3, notes = $4
         WHERE id = $5 AND status = 'event'
         RETURNING id`,
        [userId, title, eventDate, notes, req.params.eventId]
      );
      if (result.rowCount === 0)
        return res.status(404).json({ message: 'Event not found' });

      res.status(200).json({ message: 'Event updated successfully' });
    } catch (err) { next(err); }
  });

  // DELETE /events/:eventId
  app.delete('/events/:eventId', async (req, res, next) => {
    try {
      const result = await query(
        `DELETE FROM ${eventTable} WHERE id = $1 AND status = 'event'`,
        [req.params.eventId]
      );
      if (result.rowCount === 0)
        return res.status(404).json({ message: 'Event not found' });

      res.status(200).json({ message: `${result.rowCount} event(s) deleted successfully.` });
    } catch (err) { next(err); }
  });
};

// Config routes 
// One row per user in films_del226: title='__config__:{userId}', body=JSON

const configRoutes = (app) => {

  // GET /config?userId=...
  app.get('/config', async (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId)
        return res.status(400).json({ message: 'userId query param is required' });

      const data = await query(
        `SELECT body FROM ${configTable} WHERE title = $1`,
        [`__config__:${userId}`]
      );
      if (data.rowCount === 0)
        return res.json({});

      try { res.json(JSON.parse(data.rows[0].body)); }
      catch { res.json({}); }
    } catch (err) { next(err); }
  });

  // PUT /config?userId=...
  app.put('/config', async (req, res, next) => {
    try {
      const { userId } = req.query;
      if (!userId)
        return res.status(400).json({ message: 'userId query param is required' });

      const sentinelTitle = `__config__:${userId}`;
      const payload = JSON.stringify(req.body);

      // Delete any existing row, then insert fresh
      await query(
        `DELETE FROM ${configTable} WHERE title = $1`,
        [sentinelTitle]
      );
      await query(
        `INSERT INTO ${configTable} (title, body) VALUES ($1, $2)`,
        [sentinelTitle, payload]
      );

      res.status(200).json({ message: 'Config saved successfully' });
    } catch (err) { next(err); }
  });
};


const mapEventRow = (row) => {
  let extras = {};
  try { extras = JSON.parse(row.notes || '{}'); } catch { /* ignore */ }
  return {
    id: String(row.id),
    userId: row.company,
    title: row.position,
    date: row.applied_on ? new Date(row.applied_on).toISOString().split('T')[0] : null,
    ...extras,
  };
};


export { userRoutes, eventRoutes, configRoutes };