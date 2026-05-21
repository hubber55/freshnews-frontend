import urllib.request
import re

url = 'https://freshnews.top/classifieds'
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    html = urllib.request.urlopen(req).read().decode('utf-8')
    print('HTML Length:', len(html))
    
    # Look for image URLs
    images = re.findall(r'https?://[^\s"\'><]+', html)
    print('\nFound URLs in HTML:')
    for img in set(images):
        if 'storage/v1/object' in img or 'supabase' in img:
            print('  -', img)
            
except Exception as e:
    print('Error:', e)
