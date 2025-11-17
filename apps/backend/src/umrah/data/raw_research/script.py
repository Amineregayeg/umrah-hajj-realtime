
# Create a summary table of key madhhab differences for Umrah/Hajj rituals
import pandas as pd

# Madhhab differences data
data = {
    "Ritual/Issue": [
        "Wudu for Tawaf",
        "Tawaf without Wudu (menstruating woman)",
        "Raml (brisk walk) in Tawaf",
        "Idtiba (right shoulder exposed)",
        "Sa'i - purity requirement",
        "Sa'i - women running between green lights",
        "Entering Ihram from Miqat",
        "Tawaf 2 Rakah prayer",
        "Tawaf - wudu breaks during",
        "Halq/Taqsir (hair cutting)"
    ],
    "Hanafi": [
        "Wajib (not pillar); Dam/Badanah if omitted",
        "Valid but Dam required; some permit with excuse",
        "Sunnah for men (first 3 circuits)",
        "Sunnah for men during Tawaf",
        "Not required (can do in any state)",
        "Not required (women walk normally)",
        "Wajib; Dam if omitted without return",
        "Wajib; can be prayed anywhere in Haram",
        "Resume from where stopped after wudu",
        "Wajib; Dam if omitted"
    ],
    "Shafi'i": [
        "Condition (pillar) for validity",
        "Invalid Tawaf; must repeat when pure",
        "Sunnah for men (first 3 circuits)",
        "Sunnah for men during Tawaf",
        "Not required",
        "Not required (women walk normally)",
        "Wajib; Dam if omitted without return",
        "Mustahabb (recommended); near Maqam Ibrahim",
        "Restart Tawaf from beginning after wudu",
        "Pillar; Umrah invalid if omitted"
    ],
    "Maliki": [
        "Condition for validity",
        "Invalid Tawaf; must repeat when pure",
        "Sunnah for men (first 3 circuits)",
        "Sunnah for men during Tawaf",
        "Not required",
        "Not required (women walk normally)",
        "Wajib; Dam if omitted without return",
        "Wajib; can be prayed anywhere in Haram",
        "Restart Tawaf from beginning after wudu",
        "Wajib; Dam if omitted"
    ],
    "Hanbali": [
        "Condition for validity",
        "Invalid Tawaf; must repeat when pure",
        "Sunnah for men (first 3 circuits)",
        "Sunnah for men during Tawaf",
        "Not required",
        "Not required (women walk normally)",
        "Wajib; Dam if omitted without return",
        "Mustahabb (recommended)",
        "Restart Tawaf from beginning after wudu",
        "Wajib; Dam if omitted"
    ],
    "Ibn Taymiyah View": [
        "Not required; preferred but not condition",
        "Valid with excuse; no penalty if necessary",
        "Sunnah",
        "Sunnah",
        "Not required",
        "Not applicable",
        "Same as majority",
        "Mustahabb",
        "Can continue if excuse exists",
        "Same as majority"
    ]
}

df = pd.DataFrame(data)

# Save to CSV
df.to_csv('madhhab_differences_umrah_hajj.csv', index=False)

print("Madhhab differences table created successfully!")
print("\nPreview:")
print(df.head(10))
