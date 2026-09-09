import os

html_files = []
for root, dirs, files in os.walk('frontend/src/app'):
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

texts_to_find = [
    'Hai dimenticato il badge?',
    'Dimenticanza o smarrimento',
    'Problema lettura/badge rotto',
    'Dispositivo fuori uso',
    'Ore totali lavorate:',
    'Lavori completati',
    'Nessun lavoro completato',
    'Altri movimenti',
    'Avvia Scanner',
    'Interrompi',
    'Carico',
    'Scarico',
    'Riprova',
    'WhatsApp',
    'Stampa / PDF'
]

results = {}
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        for t in texts_to_find:
            if t in content:
                if file not in results: results[file] = []
                results[file].append(t)

for f, matches in results.items():
    print(f"{f}:")
    for m in matches:
        print(f"  - {m}")
