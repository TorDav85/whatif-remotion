/**
 * Public titles and publication file names, in one place (scripts and Remotion use the same rules).
 *
 * Title:  « Et si [sujet] ? »             e.g. Et si Marc devenait géant ?
 * Files:  title without the « ? »          e.g. Et si Marc devenait géant.mp4 / .jpg
 * Technical composition ids (MarcGeant…) are never derived from the title.
 */

const PREFIX = 'Et si ';
/** Characters Windows, macOS and Linux refuse in a file name. */
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_LENGTH = 120;

const tidy = (text) => String(text).replace(/[\s  ]+/g, ' ').trim();

/** « Et si [sujet] ? » from a subject (« Marc devenait géant »). */
export const publicTitle = (subject) => {
  let s = tidy(subject).replace(/\s*\?+$/, '');
  if (/^et si\s/i.test(s)) s = s.slice(6);
  if (!s) throw new Error('Sujet vide : impossible de construire le titre.');
  return `${PREFIX}${s} ?`;
};

/** Normalised public title, or an error if it does not follow « Et si … ? ». */
export const checkTitle = (title) => {
  const t = tidy(title).replace(/\s*\?$/, ' ?');
  if (!t.startsWith(PREFIX) || !t.endsWith(' ?') || t.length <= PREFIX.length + 2) {
    throw new Error(`Titre public attendu au format « Et si [sujet] ? » : « ${title} »`);
  }
  return t;
};

/** File-system-safe base name: the title without « ? », forbidden characters removed. */
export const fileBaseName = (title) => {
  let base = checkTitle(title)
    .replace(/\s*\?$/, '')
    .replace(/\s*:\s*/g, ' - ')
    .replace(FORBIDDEN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  if (base.length > MAX_LENGTH) base = base.slice(0, MAX_LENGTH).replace(/[. ]+$/, '');
  if (RESERVED.test(base)) base = `${base}_`;
  return base;
};

/** Names of the files of a publication folder. */
export const publicationFiles = (title) => {
  const base = fileBaseName(title);
  return {title: checkTitle(title), base, video: `${base}.mp4`, cover: `${base}.jpg`, text: 'publication.txt'};
};
