import json
import re
import os

def build_standalone_html():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    json_path = os.path.join(base_dir, 'data', 'questions.json')
    css_path = os.path.join(base_dir, 'public', 'style.css')
    js_path = os.path.join(base_dir, 'public', 'app.js')
    html_path = os.path.join(base_dir, 'public', 'index.html')

    with open(json_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    with open(css_path, 'r', encoding='utf-8') as f:
        css_content = f.read()

    with open(js_path, 'r', encoding='utf-8') as f:
        js_content = f.read()

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Prepare embedded data in JS
    questions_json_str = json.dumps(questions, ensure_ascii=False)
    data_injection = f"\n// EMBEDDED 150 QUESTIONS DATA\nconst QUESTIONS_DATA = {questions_json_str};\nstaticQuestionsCache = QUESTIONS_DATA;\n"

    # Replace <link rel="stylesheet" href="style.css"> with <style>...</style>
    style_tag = f"<style>\n{css_content}\n</style>"
    html_content = re.sub(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']style\.css["\']\s*>', lambda m: style_tag, html_content)

    # Replace <script src="app.js"></script> with inline <script>...data + js...</script>
    script_tag = f"<script>\n{data_injection}\n{js_content}\n</script>"
    html_content = re.sub(r'<script\s+src=["\']app\.js["\']\s*></script>', lambda m: script_tag, html_content)

    # Save to practice/index.html
    out_html = os.path.join(base_dir, 'index.html')
    with open(out_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Also sync to practice/docs/index.html
    docs_dir = os.path.join(base_dir, 'docs')
    os.makedirs(docs_dir, exist_ok=True)
    with open(os.path.join(docs_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("Successfully built standalone index.html with 150 embedded questions!")
    print("File size:", len(html_content.encode('utf-8')), "bytes")
    print("Saved to:", out_html)

if __name__ == '__main__':
    build_standalone_html()
