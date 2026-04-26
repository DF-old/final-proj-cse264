import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { query } from '../db/postgres.js';

// These table names reuse the provided schema, but the app treats them as
// separate stores for users, events, and per-user config.
const userTable = process.env.USER_TABLE;        // title=username, body=hashed password
const eventTable = process.env.EVENT_TABLE; // company=userId, position=title, notes=JSON, status='event'
const configTable = process.env.CONFIG_TABLE;          // title=sentinel '__config__:{userId}', body=JSON

const scrypt = promisify(crypto.scrypt);
const HASH_PREFIX = 'scrypt$';

// Password hashing and verification use scrypt with a random salt. The hash is stored
const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${HASH_PREFIX}${salt}$${derived.toString('hex')}`;
};

// verifies a password against the stored hash, returning a boolean result
const verifyPassword = async (password, storedValue) => {
  if (!storedValue) return false;

  const [, salt, storedHash] = storedValue.split('$');
  if (!salt || !storedHash) return false;

  const derived = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, 'hex');
  const derivedBuffer = Buffer.from(derived);
  if (storedBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedBuffer);
};

const formatDateString = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().split('T')[0];
};

// User routes 

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

      const hashedPassword = await hashPassword(password);

      // Registration stores a password hash
      const result = await query(
        `INSERT INTO ${userTable} (title, body) VALUES ($1, $2) RETURNING review_id`,
        [username, hashedPassword]
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
        `SELECT * FROM ${userTable} WHERE title = $1`,
        [username]
      );
      if (data.rowCount === 0)
        return res.status(404).json({ message: 'No account found with that username or email.' });

      const row = data.rows[0];
      const valid = await verifyPassword(password, row.body);
      if (!valid)
        return res.status(401).json({ message: 'Incorrect password.' });

      // The backend returns a minimal auth payload here; the client merges in
      // config data from a separate request to build the full session object.
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
        `SELECT * FROM ${userTable} WHERE title = $1`,
        [username]
      );
      if (check.rowCount === 0)
        return res.status(401).json({ message: 'Incorrect password.' });

      const row = check.rows[0];
      const valid = await verifyPassword(oldPassword, row.body);
      if (!valid)
        return res.status(401).json({ message: 'Incorrect password.' });

      const hashedNewPassword = await hashPassword(newPassword);
      await query(
        `UPDATE ${userTable} SET body = $1 WHERE title = $2`,
        [hashedNewPassword, username]
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
      // Extra event fields are stored as JSON so the frontend can round-trip
      // the full draft without needing a separate table per field.
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
      // Map the database row into the shape the client expects, including the
      // JSON payload that was packed into the notes column.
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
      // Updates use the same storage format as creation so the event can be
      // edited without changing the client-facing data contract.
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

      // Each config row is stored as JSON text, then parsed back into the
      // client session shape.
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

      // Replace the existing config row so the app always keeps one current
      // record per user instead of managing partial updates.
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
  // Strip id from the stored JSON so the client-sent draft id (which is ''
  // for new events) can never overwrite the real database-assigned id.
  const { id: _discardId, ...safeExtras } = extras;
  return {
    id: String(row.id),
    userId: row.company,
    title: row.position,
    date: row.applied_on ? new Date(row.applied_on).toISOString().split('T')[0] : null,
    ...safeExtras,
  };
};


export { userRoutes, eventRoutes, configRoutes };