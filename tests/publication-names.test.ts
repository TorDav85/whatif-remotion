import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkTitle, fileBaseName, publicTitle, publicationFiles} from '../src/core/publication-names.mjs';

test('titre public au format « Et si … ? »', () => {
  assert.equal(publicTitle('Marc devenait géant'), 'Et si Marc devenait géant ?');
  assert.equal(publicTitle('et si Marc devenait géant?'), 'Et si Marc devenait géant ?');
  assert.equal(checkTitle('Et si Marc devenait géant ?'), 'Et si Marc devenait géant ?');
  assert.throws(() => checkTitle('Marc devient géant'));
  assert.throws(() => checkTitle('Et si Marc devenait géant'));
});

test('noms de fichiers : sans « ? », accents et espaces conservés', () => {
  assert.deepEqual(publicationFiles('Et si Marc devenait géant ?'), {
    title: 'Et si Marc devenait géant ?',
    base: 'Et si Marc devenait géant',
    video: 'Et si Marc devenait géant.mp4',
    cover: 'Et si Marc devenait géant.jpg',
    text: 'publication.txt',
  });
  assert.equal(fileBaseName("Et si Marc ne buvait plus d'eau ?"), "Et si Marc ne buvait plus d'eau");
});

test('caractères interdits retirés', () => {
  assert.equal(fileBaseName('Et si Marc : partie 2 ?'), 'Et si Marc - partie 2');
  assert.equal(fileBaseName('Et si "Marc" avait 1/2 cerveau* ?'), 'Et si Marc avait 12 cerveau');
  assert.ok(!/[<>:"/\\|?*]/.test(fileBaseName('Et si a<b>c|d ?')));
});
