const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Extensions that must NEVER be written to disk or served back.
const BLOCKED_EXTENSIONS = new Set([
  '.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.phps',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.sh', '.bash', '.zsh', '.ksh',
  '.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.dll', '.so', '.bin',
  '.py', '.rb', '.pl', '.cgi', '.asp', '.aspx', '.jsp', '.jar', '.war',
  '.html', '.htm', '.svg', '.xml', '.json', '.env', '.sql', '.htaccess',
]);

// Trusted image signatures (magic bytes). Client-supplied `file.mimetype`
// and `originalname` extensions are never trusted.
const SIGNATURES = {
  png:  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg:  Buffer.from([0xff, 0xd8, 0xff]),
  gif:  Buffer.from([0x47, 0x49, 0x46, 0x38]), // "GIF8"
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]), // "RIFF" .... "WEBP"
};

const EXTENSION_BY_TYPE = { png: '.png', jpg: '.jpg', gif: '.gif', webp: '.webp' };

function hasSignature(buffer, sig) {
  if (!buffer || buffer.length < sig.length) return false;
  return sig.every((byte, i) => buffer[i] === byte);
}

// Returns a server-derived image type ('png' | 'jpg' | 'gif' | 'webp')
// by inspecting the file's magic bytes, or null if unrecognized.
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (hasSignature(buffer, SIGNATURES.png)) return 'png';
  if (hasSignature(buffer, SIGNATURES.jpg)) return 'jpg';
  if (hasSignature(buffer, SIGNATURES.gif)) return 'gif';
  if (hasSignature(buffer, SIGNATURES.webp) &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'webp';
  }
  return null;
}

function blockedExtension(originalName) {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

function makeFileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (blockedExtension(file.originalname)) {
      return cb(new Error('Invalid file type.'));
    }
    // Pre-filter only; authoritative validation happens via magic bytes.
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type.'));
    }
    cb(null, true);
  };
}

// Use in-memory storage so we can validate magic bytes BEFORE anything
// ever touches the filesystem.
const storage = multer.memoryStorage();

const uploadPfp = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: makeFileFilter(['image/jpeg', 'image/png', 'image/webp']),
});

const uploadChat = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: makeFileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
});

// Validates the buffer's magic bytes, derives a safe extension, and writes
// the file to disk under a cryptographically unguessable name.
async function saveImage(buffer, prefix, allowGif = false) {
  const type = detectImageType(buffer);
  if (!type) throw new Error('Invalid image content.');
  if (!allowGif && type === 'gif') throw new Error('Invalid image content.');
  const filename = `${prefix}-${crypto.randomUUID()}${EXTENSION_BY_TYPE[type]}`;
  await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
  return filename;
}

module.exports = { uploadPfp, uploadChat, uploadsDir, saveImage, detectImageType };