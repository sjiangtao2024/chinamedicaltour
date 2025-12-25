import os

def fix_file(path, start_marker, end_marker):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print(f"Start marker not found in {path}")
        return

    # Look for end marker after the start marker
    search_start = start_idx + len(start_marker)
    end_idx = content.find(end_marker, search_start)
    
    if end_idx == -1:
        print(f"End marker not found in {path}")
        # Fallback for culture-planner if </body> is elusive or spaced differently
        return

    # Keep start marker, add newline, keep end marker
    # We remove everything between them
    new_content = content[:start_idx + len(start_marker)] + "\n\n    " + content[end_idx:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Fixed {path}")

# Fix index.html
print("Fixing index.html...")
fix_file(r'c:\dev_code\chinamedicaltour\index.html', 
         '<script src="assets/js/main.js"></script>', 
         '<!-- Optional: Tawk.to')

# Fix culture-planner.html
print("Fixing culture-planner.html...")
fix_file(r'c:\dev_code\chinamedicaltour\culture-planner.html', 
         '<script src="assets/js/planner.js"></script>', 
         '</body>')
