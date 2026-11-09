#!/usr/bin/env python3
"""Check required HTML and use node --check for all inline scripts."""
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys

class AppParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.has_title = False
        self.inline = []
        self.script = False
        self.content = []

    def handle_starttag(self, tag, attrs):
        if tag == 'title':
            self.has_title = True
        if tag == 'script':
            self.script = not any(k == 'src' for k, _ in attrs)
            self.content = []

    def handle_data(self, data):
        if self.script:
            self.content.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.script:
            self.inline.append(''.join(self.content))
            self.script = False
            self.content = []

html = Path('index.html')
if not html.exists():
    sys.exit('ERROR: index.html not found at repository root')
text = html.read_text(encoding='utf-8')
if '<html' not in text.lower() or '<body' not in text.lower():
    sys.exit('ERROR: missing HTML page skeleton')
p = AppParser()
p.feed(text)
if not p.has_title or not p.inline:
    sys.exit('ERROR: title or inline app script missing')
with TemporaryDirectory() as tmp:
    for i, js in enumerate(p.inline):
        filename = Path(tmp) / f'app-{i}.js'
        filename.write_text(js, encoding='utf-8')
        subprocess.run(['node', '--check', str(filename)], check=True)
subprocess.run(['node', '--check', 'navigation-map.js'], check=True)
subprocess.run(['node', '--check', 'live-navigation.js'], check=True)
subprocess.run(['node', '--check', 'traffic-intelligence.js'], check=True)
subprocess.run(['node', '--check', 'tomtom-routing.js'], check=True)
print(f'PASS: index.html has title and {len(p.inline)} inline script(s) with valid JavaScript syntax')
