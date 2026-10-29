"""Pure Audio-First compiler. Local word timestamps in; global seconds out."""
from copy import deepcopy
import math
import re
import unicodedata

EVENT_TYPES = {'metalWeakening', 'bridgeCollapse', 'cameraMove'}
IDENTIFIER = re.compile(r'^[a-z][a-z0-9-]*$')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, label, minimum=0, strict=False):
    require(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value), f'{label} doit être un nombre fini.')
    require(value > minimum if strict else value >= minimum, f'{label} doit être {">" if strict else ">="} {minimum}.')
    return float(value)


def tokens(text):
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if not unicodedata.combining(c))
    return re.findall(r'[^\W_]+', normalized, flags=re.UNICODE)


def unique_ids(items, label):
    ids = [item.get('id') for item in items]
    require(all(isinstance(id, str) and IDENTIFIER.fullmatch(id) for id in ids), f'{label} : identifiants invalides.')
    require(len(ids) == len(set(ids)), f'{label} : identifiants dupliqués.')


def align_source(text, observed_words, audio_duration, beat_id):
    """Keep source spelling. A mismatch fails; ASR never rewrites the narration."""
    expected = [(word, tokens(word)) for word in text.split()]
    expected_tokens = [token for _, word_tokens in expected for token in word_tokens]
    observed_tokens = []
    previous_start = -1
    for word in observed_words:
        start = number(word.get('start'), f'{beat_id}: début de mot')
        end = number(word.get('end'), f'{beat_id}: fin de mot')
        require(start >= previous_start and end > start and end <= audio_duration + 0.02,
                f'{beat_id} : timestamps de mots invalides ({word}).')
        previous_start = start
        require(isinstance(word.get('text'), str), f'{beat_id} : texte de mot manquant.')
        observed_tokens.extend((token, start, end) for token in tokens(word['text']))
    actual = [token for token, _, _ in observed_tokens]
    require(expected_tokens == actual,
            f'{beat_id} : texte/audio différents. Attendu : {expected_tokens}. Reconnu : {actual}. '
            'Écoutez, régénérez ou fournissez un alignement corrigé et contrôlé ; le texte source est conservé.')
    require(bool(actual), f'{beat_id} : aucun mot reconnu.')
    cursor = 0
    words = []
    for source_word, word_tokens in expected:
        if not word_tokens:
            continue
        segment = observed_tokens[cursor:cursor + len(word_tokens)]
        start, raw_end = min(w[1] for w in segment), max(w[2] for w in segment)
        end = min(raw_end, audio_duration)
        require(end > start, f'{beat_id} : mot hors du média.')
        word = {'text': source_word, 'start': start, 'end': end}
        if raw_end > end:
            word['mediaEndClampedBy'] = raw_end - end
        words.append(word)
        cursor += len(word_tokens)
    return words


def resolve_anchor(anchor, beats):
    require(isinstance(anchor, dict) and isinstance(anchor.get('text'), str), 'Ancre sans expression textuelle.')
    needle = tokens(anchor['text'])
    require(bool(needle), f'Ancre vide : {anchor.get("id")}')
    edge = anchor.get('edge', 'start')
    require(edge in ('start', 'end'), f'Borne d’ancre inconnue : {edge}')
    if anchor.get('beatId'):
        require(any(beat['id'] == anchor['beatId'] for beat in beats), f'Beat d’ancre inconnu : {anchor["beatId"]}')
    flattened = []
    for beat in beats:
        if anchor.get('beatId') and beat['id'] != anchor['beatId']:
            continue
        for index, word in enumerate(beat['words']):
            flattened.extend({'token': token, 'start': word['start'], 'end': word['end'], 'beatId': beat['id'], 'wordIndex': index}
                             for token in tokens(word['text']))
    matches = []
    for i in range(len(flattened) - len(needle) + 1):
        group = flattened[i:i + len(needle)]
        if [word['token'] for word in group] == needle:
            matches.append(group)
    require(bool(matches), f'Ancre introuvable : « {anchor["text"]} » ({anchor.get("id")}).')
    occurrence = anchor.get('occurrence')
    require(occurrence is not None or len(matches) == 1,
            f'Ancre ambiguë : « {anchor["text"]} » apparaît {len(matches)} fois. Précisez occurrence.')
    occurrence = occurrence if occurrence is not None else 1
    require(isinstance(occurrence, int) and not isinstance(occurrence, bool) and 1 <= occurrence <= len(matches),
            f'Occurrence invalide pour « {anchor["text"]} » : {occurrence}.')
    match = matches[occurrence - 1]
    resolved = match[0]['start'] if edge == 'start' else match[-1]['end']
    return {**deepcopy(anchor), 'edge': edge, 'occurrence': occurrence, 'matchCount': len(matches),
            'resolvedAt': resolved, 'wordStart': match[0]['start'], 'wordEnd': match[-1]['end'],
            'references': [{'beatId': word['beatId'], 'wordIndex': word['wordIndex']} for word in match]}


def compile_timeline(script, media, alignments):
    require(script.get('schemaVersion') == 1, 'Version de script inconnue.')
    require(script.get('scene') == 'bridge', f'Scène inconnue : {script.get("scene")}')
    require(script.get('handle') and script['handle'] != '@ton_compte', 'Remplacez le compte temporaire.')
    for key in ('fps', 'width', 'height'):
        number(script.get(key), key, strict=True)
        require(float(script[key]).is_integer(), f'{key} doit être entier.')
    unique_ids(script.get('beats', []), 'Beats')
    require(bool(script.get('beats')), 'Aucun beat narratif.')
    require(set(media) == {beat['id'] for beat in script['beats']}, 'Les fichiers audio ne correspondent pas aux beats.')
    require(set(alignments) == set(media), 'Les alignements ne correspondent pas aux fichiers audio.')
    beats = []
    current = 0.0
    for source in script['beats']:
        id = source['id']
        text = source.get('text')
        require(isinstance(text, str) and text.strip(), f'{id} : texte narratif vide.')
        recording = media[id]
        length = number(recording.get('audioDuration'), f'{id}: durée audio', strict=True)
        require(recording.get('audioSha256') == alignments[id].get('audioSha256'), f'{id} : alignement périmé (empreinte audio différente).')
        file = recording.get('audioFile', '')
        require(file and not file.startswith('/') and '..' not in file.split('/') and ':' not in file and '\\' not in file,
                f'{id} : chemin audio invalide.')
        local = align_source(text, alignments[id].get('words', []), length, id)
        global_words = [{**word, 'start': current + word['start'], 'end': current + word['end']} for word in local]
        beats.append({'id': id, 'text': text, 'audioFile': file, 'audioSha256': recording['audioSha256'],
                      'audioStart': current, 'audioDuration': length,
                      'speechStart': global_words[0]['start'], 'speechEnd': global_words[-1]['end'],
                      'words': global_words,
                      'alignment': {'method': alignments[id].get('method', 'unknown'), 'textMatch': True,
                                    'reviewed': alignments[id].get('reviewed', False)}})
        # Full measured media duration, including both leading and trailing silence.
        current += length + number(source.get('pauseAfter', script.get('pauseBetween', 0.45)), f'{id}: respiration')

    records = script.get('events', []) + script.get('editorials', []) + [script['conclusion']]
    unique_ids(records, 'Événements et textes')
    unique_ids(script['beats'] + records, 'Identifiants de timeline')
    unique_ids([record['anchor'] for record in records], 'Ancres')
    def compile_record(record):
        anchor = resolve_anchor(record['anchor'], beats)
        offset = record.get('offset', 0)
        require(isinstance(offset, (int, float)) and math.isfinite(offset), f'{record["id"]} : décalage non fini.')
        start = anchor['resolvedAt'] + offset
        number(start, f'{record["id"]}: début global')
        duration = number(record.get('duration'), f'{record["id"]}: durée', strict=True)
        return {**deepcopy(record), 'anchor': anchor, 'start': start, 'end': start + duration, 'duration': duration}
    for event in script.get('events', []):
        require(event.get('type') in EVENT_TYPES, f'Type d’événement inconnu : {event.get("type")}')
    require(len(script.get('events', [])) == 3 and {event['type'] for event in script['events']} == EVENT_TYPES,
            'La scène pont attend exactement un événement de fragilisation, de caméra et de rupture.')
    events = [compile_record(record) for record in script.get('events', [])]
    editorials = [compile_record(record) for record in script.get('editorials', [])]
    conclusion = compile_record(script['conclusion'])
    max_words = script.get('subtitles', {}).get('maxWords', 4)
    require(isinstance(max_words, int) and 1 <= max_words <= 8, 'maxWords doit être compris entre 1 et 8.')
    subtitles = []
    for beat in beats:
        for offset in range(0, len(beat['words']), max_words):
            group = beat['words'][offset:offset + max_words]
            subtitles.append({'id': f'{beat["id"]}-{offset}', 'beatId': beat['id'],
                              'start': group[0]['start'], 'end': min(beat['audioStart'] + beat['audioDuration'], group[-1]['end'] + 0.12),
                              'words': group, 'text': ' '.join(word['text'] for word in group)})
    mix = deepcopy(script.get('mix', {}))
    for field in ('voiceVolume', 'ambienceVolume', 'speechDuck', 'impactVolume'):
        require(0 <= number(mix.get(field), field) <= 1, f'{field} doit rester entre 0 et 1.')
    mix['impactDuration'] = number(mix.get('impactDuration', 1.8), 'Durée de l’impact', strict=True)
    impact_end = next(event['start'] for event in events if event['type'] == 'bridgeCollapse') + mix['impactDuration']
    useful_end = max([beat['audioStart'] + beat['audioDuration'] for beat in beats]
                     + [impact_end]
                     + [record['end'] for record in events + editorials + [conclusion]])
    end_padding = number(script.get('endPadding', 0.5), 'Marge finale')
    compiled = {'schemaVersion': 1, 'id': script['id'], 'scene': script['scene'], 'title': script['title'], 'handle': script['handle'],
                'fps': script['fps'], 'width': script['width'], 'height': script['height'],
                'timeUnit': 'seconds', 'wordTimeBase': 'global', 'usefulEnd': useful_end,
                'endPadding': end_padding, 'duration': useful_end + end_padding,
                'beats': beats, 'events': events, 'editorials': editorials, 'conclusion': conclusion,
                'subtitles': subtitles, 'mix': mix}
    report = {'status': 'validated', 'alignmentMethod': 'timestamped transcription + strict normalized text comparison; not forced alignment',
              'warnings': ['Les timestamps restent des estimations ; contrôler les mots déclencheurs dans le rapport et à l’écoute.'],
              'audio': [{'id': beat['id'], 'audioStart': beat['audioStart'], 'audioDuration': beat['audioDuration'],
                         'leadingSilence': beat['speechStart'] - beat['audioStart'],
                         'trailingSilence': beat['audioStart'] + beat['audioDuration'] - beat['speechEnd']} for beat in beats],
              'anchors': [{'eventId': item['id'], **item['anchor'], 'eventStart': item['start'], 'eventEnd': item['end']}
                          for item in events + editorials + [conclusion]],
              'duration': compiled['duration'], 'usefulEnd': useful_end, 'endPadding': end_padding}
    return compiled, report
