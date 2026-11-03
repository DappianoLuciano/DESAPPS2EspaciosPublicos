const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createUploadRoutes } = require('../../src/interfaces/http/routes/uploadRoutes');
const { SupabaseStorageService } = require('../../src/infrastructure/storage/SupabaseStorageService');

function appFor(role, storage) {
  const app = express();
  app.use((req, _res, next) => {
    if (role) req.user = { id: 'test-admin', role };
    next();
  });
  app.use('/api/uploads', createUploadRoutes(storage));
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 400).json({ message: err.message });
  });
  return app;
}

test('sube la imagen del espacio con permiso municipal y devuelve la URL', async () => {
  let uploads = 0;
  const storage = { uploadPublicSpaceImage: async file => {
    uploads++;
    assert.equal(file.mimetype, 'image/png');
    return 'https://storage.test/public-spaces/example.png';
  } };
  const res = await request(appFor('municipal_admin', storage))
    .post('/api/uploads/public-space-image')
    .attach('file', Buffer.from('test image'), { filename: 'space.png', contentType: 'image/png' });
  assert.equal(res.status, 201);
  assert.equal(res.body.imageUrl, 'https://storage.test/public-spaces/example.png');
  assert.equal(uploads, 1);
});

test('no permite subir sin sesión ni con rol ciudadano', async () => {
  let uploads = 0;
  const storage = { uploadPublicSpaceImage: async () => { uploads++; } };
  for (const role of [undefined, 'citizen']) {
    const res = await request(appFor(role, storage)).post('/api/uploads/public-space-image');
    assert.equal(res.status, role ? 403 : 401);
  }
  assert.equal(uploads, 0);
});

test('rechaza falta de archivo y archivos mayores a 5 MB', async () => {
  let uploads = 0;
  const app = appFor('municipal_admin', { uploadPublicSpaceImage: async () => { uploads++; } });
  const empty = await request(app).post('/api/uploads/public-space-image');
  assert.equal(empty.status, 400);
  assert.match(empty.body.message, /adjuntar/);
  const large = await request(app).post('/api/uploads/public-space-image')
    .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png');
  assert.equal(large.status, 400);
  assert.equal(uploads, 0);
});

test('valida formato y contenido de la imagen antes de acceder a Supabase', async () => {
  const storage = new SupabaseStorageService();
  await assert.rejects(storage.uploadPublicSpaceImage({ mimetype: 'image/svg+xml', buffer: Buffer.from('<svg/>') }), /JPG, PNG o WEBP/);
  await assert.rejects(storage.uploadPublicSpaceImage({ mimetype: 'image/png', buffer: Buffer.from('not a png') }), /contenido del archivo/);
});
