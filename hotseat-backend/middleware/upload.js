const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_PFP_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_CHAT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function safeFilename(prefix, originalName) {
  const uuid = crypto.randomUUID();
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').substring(0, 5);
  return `${prefix}-${uuid}${ext}`;
}

const pfpStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, safeFilename('pfp', file.originalname)),
});

const uploadPfp = multer({
  storage: pfpStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_PFP_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid format. Use JPG, PNG, or WebP.'));
    }
  },
});

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, safeFilename('chat', file.originalname)),
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_CHAT_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid format.'));
    }
  },
});

module.exports = { uploadPfp, uploadChat, uploadsDir };