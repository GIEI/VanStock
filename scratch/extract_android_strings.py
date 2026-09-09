import os, re
import json

pattern = re.compile(r'Text\(\s*\"([^\"\$\\]+)\"')
count = 0
found_strings = {}

for root, _, files in os.walk('ANDROID/app/src/main/java'):
    for file in files:
        if file.endswith('.kt'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                for m in matches:
                    text = m.strip()
                    if len(text) > 1 and not text.startswith(('$', '{')):
                        count += 1
                        if text not in found_strings:
                            found_strings[text] = []
                        found_strings[text].append((path, m))

print(f'Found {len(found_strings)} unique simple strings.')

# Convert to snake_case for R.string.*
def to_snake_case(s):
    # remove all non-word characters except space
    s = re.sub(r'[^\w\s]', '', s)
    s = s.strip().replace(' ', '_').lower()
    return s

strings_xml = {}

for string_val, occurrences in list(found_strings.items()):
    key_name = to_snake_case(string_val)[:40].strip('_')
    # ensure unique
    original_key = key_name
    idx = 1
    while key_name in strings_xml and strings_xml[key_name] != string_val:
        key_name = f"{original_key}_{idx}"
        idx += 1
    strings_xml[key_name] = string_val

    # Replace in file!
    for path, original_match in occurrences:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We need to make sure we replace the EXACT match `Text("string")`
        # Because we used a regex without capturing the whole Text block, let's just do a string replace for `Text("val"` -> `Text(stringResource(R.string.key)`
        old_str = f'Text("{original_match}"'
        new_str = f'Text(stringResource(R.string.{key_name})'
        if old_str in content:
            content = content.replace(old_str, new_str)
            # Add imports if not present
            if 'import androidx.compose.ui.res.stringResource' not in content:
                content = content.replace('import androidx.compose.material3.*', 'import androidx.compose.material3.*\nimport androidx.compose.ui.res.stringResource\nimport com.stocksimple.app.R')
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

with open('scratch/android_strings.json', 'w', encoding='utf-8') as f:
    json.dump(strings_xml, f, ensure_ascii=False, indent=2)

print('Updated KT files and dumped to scratch/android_strings.json')
