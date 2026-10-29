const fail = (message) => {throw new Error(`Audio-First : ${message}`);};
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const positive = (n) => finite(n) && n > 0;
const filePath = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.includes('\\') && !value.includes(':') && !value.split('/').includes('..');

export function readTimeline(value) {
  if (value?.schemaVersion !== 1 || value.scene !== 'bridge') fail('version ou scène inconnue.');
  if (value.timeUnit !== 'seconds' || value.wordTimeBase !== 'global') fail('convention temporelle invalide.');
  for (const key of ['fps', 'width', 'height']) if (!Number.isInteger(value[key]) || value[key] <= 0) fail(`${key} invalide.`);
  if (!positive(value.duration) || !finite(value.usefulEnd) || !finite(value.endPadding) || value.endPadding < 0 || Math.abs(value.duration - value.usefulEnd - value.endPadding) > 1e-6) fail('durée finale incohérente.');
  if (!Array.isArray(value.beats) || !value.beats.length) fail('narration absente.');
  const ids = new Set();
  const unique = (id) => {if (typeof id !== 'string' || !id || ids.has(id)) fail(`identifiant absent ou dupliqué : ${id}`); ids.add(id);};
  let previousEnd = 0;
  for (const beat of value.beats) {
    unique(beat.id);
    const end = beat.audioStart + beat.audioDuration;
    if (!filePath(beat.audioFile) || !positive(beat.audioDuration) || !finite(beat.audioStart) || beat.audioStart < previousEnd - 1e-6 || end > value.duration + 1e-6) fail(`fichier ou placement audio invalide : ${beat.id}`);
    if (!finite(beat.speechStart) || !finite(beat.speechEnd) || beat.speechStart < beat.audioStart - 1e-6 || beat.speechEnd > end + 1e-6 || beat.speechEnd <= beat.speechStart) fail(`parole hors du fichier : ${beat.id}`);
    if (!beat.alignment?.textMatch || !Array.isArray(beat.words) || !beat.words.length) fail(`alignement non contrôlé : ${beat.id}`);
    if (beat.words.map((word) => word.text).join(' ') !== beat.text.replace(/\s+/g, ' ').trim()) fail(`les mots remplacent le texte source : ${beat.id}`);
    let previous = beat.audioStart;
    for (const word of beat.words) {
      if (typeof word.text !== 'string' || !finite(word.start) || !finite(word.end) || word.start < previous - 1e-6 || word.end <= word.start || word.end > end + 1e-6) fail(`mots invalides : ${beat.id}`);
      previous = word.start;
    }
    previousEnd = end;
  }
  const types = new Set(['metalWeakening', 'bridgeCollapse', 'cameraMove']);
  if (!Array.isArray(value.events) || value.events.length !== 3) fail('les trois événements du pont sont requis.');
  for (const event of value.events) {
    if (!types.delete(event.type)) fail(`type inconnu ou dupliqué : ${event.type}`);
  }
  const anchorIds = new Set();
  for (const record of [...value.events, ...value.editorials, value.conclusion]) {
    unique(record.id);
    if (!finite(record.start) || record.start < 0 || !positive(record.duration) || !finite(record.end) || Math.abs(record.end - record.start - record.duration) > 1e-6 || record.end > value.duration + 1e-6) fail(`événement hors composition : ${record.id}`);
    const anchor = record.anchor;
    if (!anchor || !finite(anchor.resolvedAt) || !anchor.references?.length || !anchor.id || anchorIds.has(anchor.id)) fail(`ancre invalide : ${record.id}`);
    for (const ref of anchor.references) if (!value.beats.find((beat) => beat.id === ref.beatId)?.words[ref.wordIndex]) fail(`référence d’ancre absente : ${record.id}`);
    const referenced = anchor.references.map((ref) => value.beats.find((beat) => beat.id === ref.beatId).words[ref.wordIndex]);
    const expected = anchor.edge === 'start' ? Math.min(...referenced.map((word) => word.start)) : Math.max(...referenced.map((word) => word.end));
    if (Math.abs(expected - anchor.resolvedAt) > 1e-6 || !finite(record.offset) || Math.abs(record.start - anchor.resolvedAt - record.offset) > 1e-6) fail(`temps d’ancre incohérent : ${record.id}`);
    anchorIds.add(anchor.id);
  }
  for (const subtitle of value.subtitles) {
    if (!finite(subtitle.start) || !finite(subtitle.end) || subtitle.end <= subtitle.start || subtitle.end > value.duration) fail(`sous-titre hors composition : ${subtitle.id}`);
  }
  for (const field of ['voiceVolume', 'ambienceVolume', 'speechDuck', 'impactVolume']) if (!finite(value.mix?.[field]) || value.mix[field] < 0 || value.mix[field] > 1) fail(`mixage invalide : ${field}`);
  if (!filePath(value.mix.ambienceFile) || !filePath(value.mix.impactFile)) fail('fichiers de mixage invalides.');
  if (!positive(value.mix.impactDuration)) fail('durée de l’impact invalide.');
  const useful = Math.max(...value.beats.map((beat) => beat.audioStart + beat.audioDuration),
    ...[...value.events, ...value.editorials, value.conclusion].map((record) => record.end),
    eventOf(value, 'bridgeCollapse').start + value.mix.impactDuration);
  if (Math.abs(useful - value.usefulEnd) > 1e-6) fail('fin utile incohérente avec les médias et animations.');
  return value;
}

export function timelineMetadata(value) {
  const timeline = readTimeline(value);
  return {durationInFrames: compositionFrames(timeline), fps: timeline.fps, width: timeline.width, height: timeline.height};
}

export function audioFrameWindow(beat, fps) {
  return {from: Math.round(beat.audioStart * fps), durationInFrames: Math.ceil(beat.audioDuration * fps) + 1};
}

export function compositionFrames(timeline) {
  return Math.max(Math.ceil(timeline.duration * timeline.fps), ...timeline.beats.map((beat) => {
    const window = audioFrameWindow(beat, timeline.fps);
    return window.from + window.durationInFrames;
  }));
}

export function eventOf(timeline, type) {
  const event = timeline.events.find((candidate) => candidate.type === type);
  if (!event) fail(`événement manquant : ${type}`);
  return event;
}

export function eventProgress(event, time) {
  const x = Math.max(0, Math.min(1, (time - event.start) / event.duration));
  return x * x * (3 - 2 * x);
}

export function speechGain(timeline, time) {
  let activity = 0;
  for (const beat of timeline.beats) {
    const attack = Math.max(0, Math.min(1, (time - beat.speechStart + 0.08) / 0.08));
    const release = Math.max(0, Math.min(1, (beat.speechEnd + 0.2 - time) / 0.2));
    activity = Math.max(activity, Math.min(attack, release));
  }
  return 1 - activity * (1 - timeline.mix.speechDuck);
}
