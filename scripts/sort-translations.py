#!/usr/bin/python3
import os
import json
import re
import subprocess

TRANSLATIONS = ["en"]

for transISO in TRANSLATIONS:
  lang_file = f'{os.path.dirname(__file__)}/../src/languages/{transISO}.json'
  # read translations
  with open(f'{os.path.dirname(__file__)}/../src/languages/{transISO}.json', 'r') as f:
    translations=json.loads(f.read())

  # write translations (sorted by key)
  with open(lang_file, 'w') as f:
    json.dump(translations, f, indent = 2, sort_keys=True, ensure_ascii=False)