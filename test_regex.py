import re
html = open('google_news_response2.html', 'r', encoding='utf-8').read()
urls = re.findall(r'https://[^\s\"\'<>]+', html)
non_google = [u for u in urls if 'google' not in u and 'gstatic' not in u]
print('\n'.join(list(set(non_google))[:20]))
