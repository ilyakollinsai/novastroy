import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config';

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subdir: 'tenders' | 'applications') {
  const dir = path.join(config.uploadsDir, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

const limits = { fileSize: config.maxUploadSizeBytes };

export const uploadTenderAttachments = multer({ storage: makeStorage('tenders'), limits });
export const uploadApplicationAttachments = multer({
  storage: makeStorage('applications'),
  limits,
});
