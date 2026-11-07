const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { staff } = require('../middleware/auth');
const { httpError } = require('../utils/helpers');

const DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(DIR, { recursive: true });

// SVG is deliberately not allowed (it can carry scripts)
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico' };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(httpError(400, 'Only JPG, PNG, WEBP, GIF or ICO images are allowed'))),
});

const base = (req) => (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`) + '/api/media/uploads/';

// POST /api/uploads  (multipart, field "files" or "file")  ->  { urls: [...] }
router.post('/', staff, upload.any(), (req, res) => {
  if (!req.files?.length) throw httpError(400, 'No file uploaded');
  res.status(201).json({ urls: req.files.map((f) => base(req) + f.filename) });
});

module.exports = router;
