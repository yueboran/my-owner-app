import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
import html_generation as h
from tools.open_slide.renderer import DeckSpec, render

class HtmlGenerationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.storage = patch.object(h, 'STORE', Path(self.temp.name)); self.storage.start()
        self.user = 'owner-a'
        app = FastAPI(); app.include_router(h.create_router(lambda: SimpleNamespace(id=self.user)))
        self.client = TestClient(app)
        self.catalog = patch.object(h, 'catalog', return_value={'providers': [{'id': 'test', 'models': [{'id': 'model', 'variants': []}]}]}); self.catalog.start()
        self.runner = patch.object(h, 'run_job'); self.runner.start()
        self.request = {'source_type': 'journal', 'source_id': 'entry', 'title': 'Source', 'content': 'Actual source', 'provider_id': 'test', 'model_id': 'model'}

    def tearDown(self):
        self.runner.stop(); self.catalog.stop(); self.storage.stop(); h.ACTIVE.clear(); self.temp.cleanup()

    def start(self):
        r = self.client.post('/api/html-generation/jobs', json=self.request)
        self.assertEqual(r.status_code, 202)
        return r.json()['id']

    def test_user_isolation_and_private_output(self):
        job = self.start()
        self.user = 'owner-b'
        self.assertEqual(self.client.get(f'/api/html-generation/jobs/{job}').status_code, 404)
        self.assertEqual(self.client.get(f'/api/html-generation/jobs/{job}/result').status_code, 404)
        self.assertEqual(self.client.get('/api/html-generation/jobs?source_type=journal&source_id=entry').json(), [])

    def test_cancel_and_result_state(self):
        job = self.start()
        self.assertEqual(self.client.get(f'/api/html-generation/jobs/{job}/result').status_code, 409)
        self.assertEqual(self.client.post(f'/api/html-generation/jobs/{job}/cancel').json()['status'], 'cancelled')
        self.assertEqual(self.client.post(f'/api/html-generation/jobs/{job}/cancel').json()['status'], 'cancelled')

    def test_local_browser_needs_no_account_token(self):
        import uuid
        app = FastAPI(); app.include_router(h.create_router())
        client = TestClient(app)
        self.assertEqual(client.get('/api/html-generation/catalog').status_code, 200)
        client.headers['X-HTML-Client'] = str(uuid.uuid4())
        response = client.post('/api/html-generation/jobs', json=self.request)
        self.assertEqual(response.status_code, 202)
        job = response.json()['id']
        self.assertEqual(client.get(f'/api/html-generation/jobs/{job}').status_code, 200)
        client.headers['X-HTML-Client'] = str(uuid.uuid4())
        self.assertEqual(client.get(f'/api/html-generation/jobs/{job}').status_code, 404)

    def test_validations_and_active_limit(self):
        self.assertEqual(self.client.post('/api/html-generation/jobs', json={**self.request, 'model_id': 'missing'}).status_code, 422)
        self.assertEqual(self.client.post('/api/html-generation/jobs', json={**self.request, 'content': 'x' * 80001}).status_code, 422)
        self.start(); self.start()
        self.assertEqual(self.client.post('/api/html-generation/jobs', json=self.request).status_code, 429)
        self.assertEqual(self.client.get('/api/html-generation/jobs/not-a-uuid').status_code, 404)
        with patch.object(h, 'catalog', side_effect=h.httpx.ConnectError('offline')):
            self.assertEqual(self.client.post('/api/html-generation/jobs', json=self.request).status_code, 503)

    def test_restart_marks_interrupted_jobs(self):
        job = self.start(); h.ACTIVE.discard(job)
        self.assertEqual(self.client.get(f'/api/html-generation/jobs/{job}').json()['stage'], 'interrupted')

    def test_renderer_escapes_content_and_offline_csp(self):
        deck = DeckSpec(title='Test', pages=[{'kind': 'content', 'title': '<script>alert(1)</script>', 'body': 'A & B'}] * 3)
        html = render(deck, 'paper-narrative', editable=False)
        self.assertIn('&lt;script&gt;', html)
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn("connect-src 'none'", html)
        self.assertNotIn('https://', html)
        self.assertEqual(html.count('aria-label="第 '), 3)

    def test_diagram_integrity_and_chart_source(self):
        with self.assertRaises(ValidationError):
            DeckSpec(title='Test', pages=[{'kind': 'architecture', 'title': 'Bad', 'nodes': [{'id': 'a', 'label': 'A'}], 'edges': [{'source': 'a', 'target': 'missing'}]}] * 3)
        with self.assertRaises(ValidationError):
            DeckSpec(title='Test', pages=[{'kind': 'chart', 'title': 'Bad', 'data': [{'label': 'X', 'value': 3}]}] * 3)

    def test_bidirectional_edges_use_separate_lanes(self):
        import xml.etree.ElementTree as ET
        page = {'kind': 'architecture', 'title': 'Bidirectional', 'nodes': [{'id': 'api', 'label': 'API'}, {'id': 'cache', 'label': 'Cache'}], 'edges': [{'source': 'api', 'target': 'cache', 'label': 'read'}, {'source': 'cache', 'target': 'api', 'label': 'return'}]}
        deck = DeckSpec(title='Test', pages=[page]*3)
        html = render(deck, 'cobalt-editorial', editable=False)
        svg = ET.fromstring(html[html.index('<svg'):html.index('</svg>')+6])
        edges = [g.find('path').get('d') for g in svg.findall('g') if 'data-source' in g.attrib]
        control_y = [float(path.split('Q')[1].split()[1]) for path in edges]
        self.assertLess(control_y[0], 95)
        self.assertGreater(control_y[1], 95)

    def test_signed_and_zero_chart_preserve_values(self):
        page = {'kind': 'chart', 'title': 'Changes', 'data': [{'label': 'Loss', 'value': -10}, {'label': 'Gain', 'value': 5}, {'label': 'Flat', 'value': 0}], 'note': 'Synthetic test values'}
        html = render(DeckSpec(title='Test', pages=[page]*3), 'noir-signal')
        self.assertIn('width:50.00%;left:0.00%', html)
        self.assertIn('width:25.00%;left:50.00%', html)
        self.assertIn('width:0.00%;left:50.00%', html)

    def test_editable_runtime_and_save_isolation(self):
        from tools.open_slide.editable import attach_editor, MARKER
        deck = DeckSpec(title='Test', pages=[{'kind': 'content', 'title': 'Editable'}]*3)
        html = render(deck, 'cobalt-editorial')
        self.assertIn(MARKER, html)
        self.assertIn('class SlotEditor', html)
        self.assertIn('class SlideSidebar', html)
        self.assertIn('data-edit-slot=', html)
        self.assertEqual(attach_editor(html), html)
        job = self.start(); data=h.read_job(job);data['status']='succeeded';h.write_job(data)
        (h.job_path(job)/'result.html').write_text('original','utf8')
        self.assertEqual(self.client.put(f'/api/html-generation/jobs/{job}/result',json={'html':html}).status_code,200)
        self.assertEqual((h.job_path(job)/'original.html').read_text('utf8'),'original')
        self.assertEqual((h.job_path(job)/'result.html').read_text('utf8'),html)
        self.user='other'
        self.assertEqual(self.client.put(f'/api/html-generation/jobs/{job}/result',json={'html':html}).status_code,404)

if __name__ == '__main__':
    unittest.main()
