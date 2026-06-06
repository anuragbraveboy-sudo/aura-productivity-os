import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('app/index.html', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if any(tag in line for tag in ['<button', '<input', '<select', '<textarea']):
            if 'id=' not in line and 'type="hidden"' not in line:
                print(f'{idx}: {line.strip()}')
