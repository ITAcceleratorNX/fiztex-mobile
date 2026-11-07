// Проверка мобильной модели вставок (CONTENT-EMBED-001) на общем наборе примеров — том же,
// что проверяют бэк (EmbedMarkupTest) и веб (contentEmbeds.test.ts).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');

function load(file) {
  const filename = path.join(root, file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    throw new Error('Unexpected import: ' + id);
  }, mod, mod.exports);
  return mod.exports;
}

const m = load('src/shared/content/embedMarkup.js');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/content-embed-fixtures.json'), 'utf8'));
const { A, B } = fixtures.legend;
const image = (id) => m.embedToken('image', id);
const file = (id) => m.embedToken('file', id);

for (const fixture of fixtures.blocks) {
  const blocks = m.embedBlocks(fixture.text);
  const expected = fixture.blocks.map((block) => ('text' in block
    ? { type: 'text', text: block.text }
    : { type: 'embed', kind: block.kind, id: block.id, line: block.line }));
  assert.deepEqual(blocks, expected, fixture.name);
  assert.equal(m.serializeEmbedBlocks(blocks), fixture.text, fixture.name);
}
for (const fixture of fixtures.ids) assert.deepEqual(m.embedIds(fixture.text), fixture.ids, fixture.name);
for (const fixture of fixtures.strip) assert.equal(m.stripEmbeds(fixture.text), fixture.expected);

// Операции редактора — те же ожидания, что у веба.
assert.equal(m.insertEmbed('Первый\nВторой', { block: 0, offset: 6 }, 'image', A), `Первый\n${image(A)}\nВторой`);
assert.equal(m.insertEmbed('Первый', { block: 0, offset: 3 }, 'file', B), `Пер\n${file(B)}\nвый`);
assert.equal(m.insertEmbed('Текст', null, 'image', A), `Текст\n${image(A)}`);
assert.equal(m.insertEmbed('', null, 'image', A), image(A));
assert.equal(m.removeEmbed(m.insertEmbed('Первый\nВторой', { block: 0, offset: 6 }, 'image', A), 1), 'Первый\nВторой');
assert.equal(m.replaceEmbed(`Текст\n${image(A)}\nещё`, 1, 'file', B), `Текст\n${file(B)}\nещё`);
const value = `Один\nДва\n${image(A)}\nТри`;
assert.equal(m.moveEmbed(value, 1, -1), `Один\n${image(A)}\nДва\nТри`);
assert.equal(m.moveEmbed(value, 1, 1), `Один\nДва\nТри\n${image(A)}`);
assert.equal(m.moveEmbed(m.moveEmbed(value, 1, -1), 1, 1), value);
assert.equal(m.canMoveEmbed(`${image(A)}\nТекст`, 0, -1), false);
assert.equal(m.updateTextBlock(`Текст\n${image(A)}`, 0, ''), image(A));
assert.equal(m.fillSlot(`${image(A)}\n${file(B)}`, 1, 'между'), `${image(A)}\nмежду\n${file(B)}`);

const policy = { image: { maxBytes: 10 * 1024 * 1024, extensions: ['jpg', 'png'] }, file: { maxBytes: 100, extensions: ['pdf'] } };
assert.match(m.embedFileProblem({ name: 'IMG.HEIC', size: 1 }, 'image', policy), /JPG, PNG или WebP/);
assert.match(m.embedFileProblem({ name: 'a.pdf', size: 200 }, 'file', policy), /МБ/);
assert.equal(m.embedFileProblem({ fileName: 'photo.JPG', fileSize: 5 }, 'image', policy), null);
assert.deepEqual(m.mergeEmbeds([{ id: '1', fileName: 'old' }], [{ id: '1', fileName: 'new' }]), [{ id: '1', fileName: 'new' }]);

// Вставка подряд: позиция после первой вставки ставит вторую следом, а не в начало.
const first = m.insertEmbedAt('Первый\nВторой', { block: 0, offset: 6 }, 'image', A);
assert.deepEqual(first, { value: `Первый\n${image(A)}\nВторой`, index: 1 });
const second = m.insertEmbedAt(first.value, { slot: first.index + 1 }, 'file', B);
assert.equal(second.value, `Первый\n${image(A)}\n${file(B)}\nВторой`);
assert.equal(second.index, 2);
assert.deepEqual(m.insertEmbedAt('', null, 'image', A), { value: image(A), index: 0 });
assert.deepEqual(m.insertEmbedAt('Текст', null, 'image', A), { value: `Текст\n${image(A)}`, index: 1 });
assert.equal(m.insertEmbedAt('Текст', { block: 0, offset: 0 }, 'image', A).index, 0);

// Строки редактора: места для текста вокруг вставок, номер строки не скачет при наборе.
const kinds = (value) => m.editorRows(value).map((row) => row.type);
assert.deepEqual(kinds(''), ['text']);
assert.deepEqual(kinds(image(A)), ['slot', 'embed', 'slot']);
assert.deepEqual(kinds(`${image(A)}\n${file(B)}`), ['slot', 'embed', 'slot', 'embed', 'slot']);
assert.deepEqual(kinds(`Текст\n${image(A)}\nещё`), ['text', 'embed', 'text']);
const between = `${image(A)}\nмежду\n${file(B)}`;
assert.equal(m.editorRows(between).length, m.editorRows(m.updateTextBlock(between, 1, '')).length);
const slotRow = m.editorRows(`${image(A)}\n${file(B)}`)[2];
assert.deepEqual(slotRow, { type: 'slot', slot: 1 });
assert.equal(m.editorRows(m.fillSlot(`${image(A)}\n${file(B)}`, slotRow.slot, 'т'))[2].type, 'text');

// Как открыть файл: тип решает, платформа уточняет.
const pdf = { id: '1', contentType: 'application/pdf', extension: 'pdf',
  url: 'https://files.example.kz/content-assets/2026/x?X-Amz-Signature=1', downloadUrl: 'https://files.example.kz/d' };
const docx = { id: '2', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  extension: 'docx', url: 'https://files.example.kz/d2', downloadUrl: 'https://files.example.kz/d2' };
const png = { id: '3', contentType: 'image/png', extension: 'png', url: 'https://files.example.kz/p', downloadUrl: 'https://files.example.kz/pd' };
assert.deepEqual(m.embedOpening(pdf, 'android'), { mode: 'pdf', url: pdf.url, baseUrl: 'https://files.example.kz/' });
assert.deepEqual(m.embedOpening(pdf, 'ios'), { mode: 'pdf', url: pdf.url, baseUrl: 'https://files.example.kz/' });
assert.deepEqual(m.embedOpening(pdf, 'web'), { mode: 'external', url: pdf.url });
assert.deepEqual(m.embedOpening(docx, 'ios'), { mode: 'external', url: docx.downloadUrl });
assert.deepEqual(m.embedOpening(png, 'android'), { mode: 'image', url: png.url });
assert.equal(m.embedOpenLabel(pdf, 'ios'), 'Открыть');
assert.equal(m.embedOpenLabel(pdf, 'web'), 'Открыть');
assert.equal(m.embedOpenLabel(docx, 'android'), 'Скачать');
assert.equal(m.embedExpired({ expiresAt: '2026-11-07T10:00:00Z' }, Date.parse('2026-11-07T10:00:01Z')), true);
assert.equal(m.embedExpired({ expiresAt: '2026-11-07T10:00:00Z' }, Date.parse('2026-11-07T09:00:00Z')), false);
assert.equal(m.embedExpired({}), false);

console.log(`content embeds: ${fixtures.blocks.length} examples and editor operations OK`);
