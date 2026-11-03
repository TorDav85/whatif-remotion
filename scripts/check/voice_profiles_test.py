import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/audio/xtts'))
import profiles
from generate import text_for


class VoiceProfilesTest(unittest.TestCase):
    def test_import_select_and_protect_existing_recording(self):
        (ROOT / '.cache').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='voice-test-', dir=ROOT / '.cache') as directory:
            folder = Path(directory)
            source = folder / 'source.wav'
            with wave.open(str(source), 'wb') as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(44100)
                audio.writeframes(struct.pack('<h', 3000) * 44100 * 10)
            with patch.object(profiles, 'SAMPLES', folder / 'samples'), patch.object(profiles, 'SETTINGS', folder / 'settings.json'):
                data = profiles.add_profile('test-voice', source)
                self.assertGreaterEqual(data['duration'], 6)
                self.assertLessEqual(data['duration'], 10)
                profiles.use_profile('test-voice')
                reference, name = profiles.resolve_reference()
                self.assertEqual(name, 'test-voice')
                self.assertTrue(reference.is_file())
                before = reference.read_bytes()
                with self.assertRaises(ValueError):
                    profiles.add_profile('test-voice', source)
                self.assertEqual(reference.read_bytes(), before)
                with self.assertRaises(ValueError):
                    profiles.profile_path('../escape')
                with self.assertRaises(ValueError):
                    profiles.use_profile('missing-voice')
                self.assertEqual(json.loads(profiles.SETTINGS.read_text())['profile'], 'test-voice')

    def test_silence_and_boolean_title_are_handled(self):
        self.assertEqual(text_for({'title': True}, 'Titre du scénario'), 'Titre du scénario')
        self.assertEqual(text_for({'voice': '', 'caption': 'Ne pas lire'}), '')
        self.assertEqual(text_for({'caption': 'Une {voix} claire.'}), 'Une voix claire.')


if __name__ == '__main__':
    unittest.main()
