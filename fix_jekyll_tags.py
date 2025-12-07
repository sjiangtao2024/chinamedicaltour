#!/usr/bin/env python3
"""
Improved conversion script that properly cleans includes first
"""
import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def remove_liquid_tags(content):
    """Remove all Jekyll liquid tags and replace with static paths"""
    # Remove relative_url filter
    content = re.sub(r"\{\{ '([^']+)' \| relative_url \}\}", r'\1', content)
    content = re.sub(r'\{\{ "([^"]+)" \| relative_url \}\}', r'\1', content)
    # Remove other common variables
    content = content.replace('{{ page.lang | default: " en" }}', 'en')
    return content

# First, clean the includes
print("Cleaning includes...")
header = read_file('_includes/header.html')
header = remove_liquid_tags(header)
write_file('_includes/header.html', header)

footer = read_file('_includes/footer.html')
footer = remove_liquid_tags(footer)
write_file('_includes/footer.html', footer)

modals = read_file('_includes/modals.html')  
modals = remove_liquid_tags(modals)

# Read cleaned layout
layout = read_file('_layouts/default.html')
layout = remove_liquid_tags(layout)

# Function to process a page
def process_page(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Skip front matter and extract metadata
    in_frontmatter = False
    content_lines = []
    front_matter = {}
    
    for line in lines:
        if line.strip() == '---':
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                in_frontmatter = False
                continue
        
        if in_frontmatter:
            if ':' in line:
                key, value = line.split(':', 1)
                front_matter[key.strip()] = value.strip().strip('"')
        else:
            content_lines.append(line)
    
    content = ''.join(content_lines)
    
    # Remove any remaining liquid tags from content
    content = remove_liquid_tags(content)
    
    # Build final HTML
    page_layout = layout.replace('{{ page.title }}', front_matter.get('title', 'China Medical Tour'))
    page_layout = page_layout.replace('{{ page.description }}', front_matter.get('description', ''))
    
    # Replace includes
    page_html = page_layout.replace('{% include header.html %}', header)
    page_html = page_html.replace('{% include footer.html %}', footer)
    page_html = page_html.replace('{% include modals.html %}', modals)
    page_html = page_html.replace('{{ content }}', content)
    
    write_file(filename, page_html)
    print(f"✅ Converted {filename}")

# Process all pages
for page in ['index.html', 'packages.html', 'stories.html']:
    try:
        process_page(page)
    except Exception as e:
        print(f"❌ Error processing {page}: {e}")

print("\n✅ All files converted to standalone HTML!")
