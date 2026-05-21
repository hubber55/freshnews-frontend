from deduplicator import is_duplicate_title

title1 = "ചെപ്പോക്കിലെ വിജയത്തിന് പിന്നാലെ സിഎസ്‌കെ ആരാധകരെ പരിഹസിച്ച് ഇഷാൻ കിഷൻ"
title2 = "ചെപ്പോക്കിലെ വിജയത്തിന് പിന്നാലെ സിഎസ്‌കെ ആരാധകരെ പരിഹസിച്ച് ഇഷാൻ കിഷൻ"

is_dup, sim, ov = is_duplicate_title(title1, title2)
print(f"Exact match: is_dup={is_dup}, sim={sim}, ov={ov}")

title3 = "ചെപ്പോക്കിലെ വിജയത്തിന് പിന്നാലെ സിഎസ്‌കെ ആരാധകരെ പരിഹസിച്ച് ഇഷാൻ കിഷൻ - ഏഷ്യാനെറ്റ്"
title4 = "ചെപ്പോക്കിലെ വിജയത്തിന് പിന്നാലെ സിഎസ്‌കെ ആരാധകരെ പരിഹസിച്ച് ഇഷാൻ കിഷൻ"

is_dup, sim, ov = is_duplicate_title(title3, title4)
print(f"With source: is_dup={is_dup}, sim={sim}, ov={ov}")
