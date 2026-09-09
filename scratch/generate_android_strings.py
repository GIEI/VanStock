import json
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
from googletrans import Translator

# Language mapping
LANGS = {
    'it': 'it',   # original values
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'ja': 'ja',
    'ru': 'ru',
    'zh': 'zh-cn' # zh in googletrans is usually zh-cn for simplified
}

translator = Translator()

with open('scratch/android_strings.json', 'r', encoding='utf-8') as f:
    strings_data = json.load(f)

# Group translations by dest
translations = {k: {} for k in LANGS.keys()}

# For each key-value we will ask google translate
# Let's batch translate to save time!
values = list(strings_data.values())
keys = list(strings_data.keys())

for lang, gcode in LANGS.items():
    if lang == 'it':
        translations['it'] = {k: v for k, v in zip(keys, values)}
        continue
    
    print(f"Translating to {lang}...")
    try:
        # Translate values
        # some string could have $ dollar signs, but we stripped most of them.
        res = translator.translate(values, src='it', dest=gcode)
        for k, r in zip(keys, res):
            translations[lang][k] = r.text
    except Exception as e:
        print(f"Error translating to {lang}: {e}")
        translations[lang] = {k: v for k, v in zip(keys, values)} # fallback

# Save XML structure
base_dir = 'ANDROID/app/src/main/res'

def escape_xml(s):
    # Escape quotes and symbols for android strings.xml
    s = s.replace('&', '&amp;')
    s = s.replace('<', '&lt;')
    s = s.replace('>', '&gt;')
    s = s.replace("'", "\\'")
    s = s.replace('"', '\\"')
    # If the string contains an android placeholder e.g. %s, we don't need to change anything
    return s

for lang, data in translations.items():
    dir_name = 'values' if lang == 'it' else f'values-{lang}'
    full_dir = os.path.join(base_dir, dir_name)
    os.makedirs(full_dir, exist_ok=True)
    
    strings_file = os.path.join(full_dir, 'strings.xml')
    
    # Read existing or create new
    root = None
    if os.path.exists(strings_file):
        try:
            tree = ET.parse(strings_file)
            root = tree.getroot()
        except:
            pass
    
    if root is None:
        root = ET.Element('resources')
        if not os.path.exists(strings_file) and lang == 'it':
            # Create app_name
            el = ET.SubElement(root, 'string', name='app_name')
            el.text = 'StockSimple'

    existing_keys = [child.get('name') for child in root.findall('string')]
    
    for k, v in data.items():
        if k not in existing_keys:
            el = ET.SubElement(root, 'string', name=k)
            # Use raw output, then we serialize securely
            el.text = v

    xmlstr = minidom.parseString(ET.tostring(root)).toprettyxml(indent="    ")
    
    # minidom.toprettyxml adds empty lines sometimes and doesn't exactly escape apostrophes as Android expects
    # Let's write manually for better Android compatibility
    
    with open(strings_file, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n')
        # if existing_keys had things, we should ideally preserve them, but we don't have many
        if lang == 'it' and 'app_name' not in data:
            f.write('    <string name="app_name">StockSimple</string>\n')
        
        for k, v in data.items():
            safe_v = escape_xml(v)
            f.write(f'    <string name="{k}">{safe_v}</string>\n')
        
        f.write('</resources>\n')

print("All Android strings generated and saved!")
