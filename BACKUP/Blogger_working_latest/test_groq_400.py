import os
import requests
from dotenv import load_dotenv
from summarizer import summarize_article

# Mock an article that would be fetched exactly like Mathrubhumi
article = {
    "title": "SU-57 E വ്യോമയാനം നിർമ്മാണം റഷ്യൻ സൈന്യത്തിൽ..",
    "description": "SU-57 E വ്യോമയാനം നിർമ്മാണം റഷ്യൻ സൈന്യത്തിൽ.." * 10
}

print("Running summarizer test...")
result = summarize_article(article)
print("Result:", result)
