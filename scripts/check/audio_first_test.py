from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/first'))
from compiler import align_source, compile_timeline, resolve_anchor


class AudioFirstCompilerTest(unittest.TestCase):
    def setUp(self):
        self.script = json.loads((ROOT / 'src/videos/audio-first-bridge/bridge.script.json').read_text(encoding='utf-8'))
        self.media = {}
        self.alignments = {}
        for index, beat in enumerate(self.script['beats']):
            id = beat['id']
            self.media[id] = {'audioFile': f'audio-first/test/{id}.wav', 'audioDuration': 4 + index * 0.2, 'audioSha256': id}
            self.alignments[id] = {'audioSha256': id, 'method': 'test-controlled', 'reviewed': True,
                                   'words': [{'text': word, 'start': 0.2 + i * 0.3, 'end': 0.4 + i * 0.3}
                                             for i, word in enumerate(beat['text'].split())]}

    def compile(self):
        return compile_timeline(self.script, self.media, self.alignments)[0]

    def test_full_file_duration_and_breathing_place_next_file(self):
        result = self.compile()
        first, second = result['beats']
        self.assertGreater(first['audioDuration'], first['speechEnd'] - first['audioStart'])
        self.assertAlmostEqual(second['audioStart'], first['audioStart'] + first['audioDuration'] + 0.45)
        self.assertNotAlmostEqual(second['audioStart'], first['speechEnd'] + 0.45)
        self.assertEqual(first['text'], self.script['beats'][0]['text'])

    def test_longer_first_file_reanchors_second_event(self):
        old = self.compile()
        self.media['metal']['audioDuration'] += 2
        new = self.compile()
        for type in ['bridgeCollapse', 'cameraMove']:
            before = next(event for event in old['events'] if event['type'] == type)
            after = next(event for event in new['events'] if event['type'] == type)
            self.assertAlmostEqual(after['start'] - before['start'], 2)

    def test_word_and_expression_matching_handles_case_accents_and_apostrophes(self):
        result = self.compile()
        match = resolve_anchor({'id': 'test', 'text': 'LE, MÉTAL', 'edge': 'end'}, result['beats'])
        self.assertEqual(match['references'][-1]['wordIndex'], 3)
        words = [{'text': 'L’eau', 'start': 1, 'end': 1.2}, {'text': 'demain', 'start': 2, 'end': 2.2}, {'text': 'matin.', 'start': 2.3, 'end': 2.5}]
        found = resolve_anchor({'id': 'apostrophe', 'text': "l'eau demain matin", 'edge': 'end'}, [{'id': 'sample', 'words': words}])
        self.assertEqual(found['resolvedAt'], 2.5)

    def test_repeated_anchor_requires_an_occurrence(self):
        beats = self.compile()['beats']
        with self.assertRaisesRegex(ValueError, 'ambiguë'):
            resolve_anchor({'id': 'repeat', 'text': 'le'}, beats)
        found = resolve_anchor({'id': 'repeat', 'text': 'le', 'occurrence': 2}, beats)
        self.assertEqual(found['references'][0]['beatId'], 'bridge')

    def test_missing_anchor_is_an_error(self):
        self.script['events'][2]['anchor']['text'] = 'introuvable'
        with self.assertRaisesRegex(ValueError, 'Ancre introuvable'):
            self.compile()

    def test_asr_cannot_replace_source_and_stale_alignment_is_rejected(self):
        source = deepcopy(self.script)
        self.alignments['bridge']['words'][2]['text'] = 'bon'
        with self.assertRaisesRegex(ValueError, 'texte/audio différents'):
            self.compile()
        self.assertEqual(self.script, source)
        self.alignments['bridge']['audioSha256'] = 'stale'
        with self.assertRaisesRegex(ValueError, 'périmé'):
            self.compile()

    def test_camera_can_prepare_during_previous_file(self):
        self.script['events'][1]['offset'] = -2.5
        result = self.compile()
        camera = next(event for event in result['events'] if event['type'] == 'cameraMove')
        self.assertLess(camera['start'], result['beats'][1]['audioStart'])
        self.assertGreaterEqual(camera['start'], 0)

    def test_animation_and_conclusion_can_outlast_last_word(self):
        result = self.compile()
        collapse = next(event for event in result['events'] if event['type'] == 'bridgeCollapse')
        self.assertGreater(collapse['end'], result['beats'][-1]['speechEnd'])
        self.assertAlmostEqual(result['duration'], max(result['conclusion']['end'], collapse['end'], max(beat['audioStart'] + beat['audioDuration'] for beat in result['beats'])) + self.script['endPadding'])

    def test_unknown_scene_event_duplicate_ids_and_invalid_times_fail(self):
        for mutate in [
            lambda: self.script.update(scene='unknown'),
            lambda: self.script['events'][0].update(type='unknown'),
            lambda: self.script['events'][0].update(id=self.script['events'][1]['id']),
            lambda: self.script['events'][0].update(duration=0),
            lambda: self.script['events'][0].update(offset=-100),
            lambda: self.alignments['metal']['words'][0].update(end=100),
        ]:
            self.setUp()
            mutate()
            with self.assertRaises(ValueError):
                self.compile()


if __name__ == '__main__':
    unittest.main()
