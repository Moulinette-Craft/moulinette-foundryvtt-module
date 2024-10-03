#!/usr/bin/python3
import os
import json
import re
import sys
import subprocess

MODULE_ID="MOU"
TRANSLATIONS = ["en"]

COMMAND = "find 'src' -type f \( -name \"*.hbs\" -o -name \"*.ts\" \) -exec grep \"" + MODULE_ID + "\.\" {} \;"

for transISO in TRANSLATIONS:

  # read translations
  with open("%s/../src/languages/%s.json" % (os.path.dirname(__file__), transISO), 'r') as f:
    translations=json.loads(f.read())

  output = subprocess.getoutput(COMMAND)
  matches = re.findall(f"({MODULE_ID}\.[\w.-]+)", output, flags=0)

  # check that all translations are present
  for key in matches:
    if not key in translations:
      print("Translation '%s' not found: %s" % (transISO, key))

  # check that all translations are used
  for key in translations:
    if not key in matches and key != "ZMOU":
      print("Translation '%s' not used: %s" % (transISO, key))
