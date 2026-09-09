import os, re
pattern_snack = re.compile(r"snackBar\.open\(\s*(['\"`])(.*?)\1")
results = {}
for root, _, files in os.walk('frontend/src/app'):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern_snack.findall(content)
                for m in matches:
                    if path not in results: results[path] = []
                    results[path].append(m[1])

for f, matches in results.items():
    print(f"{f}:")
    for m in matches:
        print(f"  - {m}")
