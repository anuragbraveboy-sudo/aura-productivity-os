import html.parser
import os

class RulesAuditParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_count = 0
        self.meta_desc_count = 0
        self.h1_count = 0
        self.interactive_elements = 0
        self.interactive_with_id = 0
        self.total_tags = 0
        self.has_viewport = False
        
    def handle_starttag(self, tag, attrs):
        self.total_tags += 1
        attrs_dict = dict(attrs)
        
        if tag == 'title':
            self.title_count += 1
        elif tag == 'meta':
            if attrs_dict.get('name') == 'description':
                self.meta_desc_count += 1
            if attrs_dict.get('name') == 'viewport':
                self.has_viewport = True
        elif tag == 'h1':
            self.h1_count += 1
            
        if tag in ['button', 'input', 'select', 'textarea']:
            self.interactive_elements += 1
            if 'id' in attrs_dict:
                self.interactive_with_id += 1

def audit_html():
    file_path = r"C:\Users\Krish Kumar\.gemini\antigravity\scratch\aura-productivity-os\app\index.html"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    parser = RulesAuditParser()
    parser.feed(content)
    
    print("=== AURA HTML RULE AUDIT RESULTS ===")
    print(f"Viewport Meta Tag Defined: {parser.has_viewport}")
    print(f"Title Tags: {parser.title_count} (Goal: 1)")
    print(f"Meta Description Tags: {parser.meta_desc_count} (Goal: 1)")
    print(f"H1 Tags: {parser.h1_count} (Goal: 1)")
    print(f"Interactive elements (button/input/select/textarea): {parser.interactive_elements}")
    print(f"Interactive elements with unique IDs: {parser.interactive_with_id} / {parser.interactive_elements}")
    
    # Check if there are warnings
    warnings = []
    if parser.title_count != 1:
        warnings.append(f"Expected exactly 1 title tag, found {parser.title_count}")
    if parser.meta_desc_count != 1:
        warnings.append(f"Expected exactly 1 meta description, found {parser.meta_desc_count}")
    if parser.h1_count != 1:
        warnings.append(f"Expected exactly 1 H1 tag for SEO hierarchy, found {parser.h1_count}")
        
    if warnings:
        print("\n⚠️ SEO/Structure Warnings:")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("\n✅ All core structural SEO audits passed!")

if __name__ == "__main__":
    audit_html()
