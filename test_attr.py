from bs4 import BeautifulSoup

html = open('google_news_response2.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')

for tag in soup.find_all(True):
    for attr, value in tag.attrs.items():
        if attr.startswith('data-'):
            if isinstance(value, str) and len(value) > 20:
                print(f"{tag.name} [{attr}] = {value[:50]}...")
