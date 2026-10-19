"""
Ananta Quantum Library - Local Literature & Research Downloader
Downloads open-access quantum research papers, preprints, and textbooks
directly to the D: drive (D:\\Ananta-Quantum-Library) to conserve C: drive space.
"""

import os
import urllib.request
import time

TARGET_DIR = r"D:\Ananta-Quantum-Library"
PAPERS_DIR = os.path.join(TARGET_DIR, "papers")
TEXTBOOKS_DIR = os.path.join(TARGET_DIR, "textbooks")

os.makedirs(PAPERS_DIR, exist_ok=True)
os.makedirs(TEXTBOOKS_DIR, exist_ok=True)

OPEN_ACCESS_RESOURCES = [
    {
        "title": "Shor's Factoring Algorithm (1994)",
        "filename": os.path.join(PAPERS_DIR, "shor_1994_quantum_factoring.pdf"),
        "url": "https://arxiv.org/pdf/quant-ph/9508027.pdf"
    },
    {
        "title": "Grover's Database Search Algorithm (1996)",
        "filename": os.path.join(PAPERS_DIR, "grover_1996_database_search.pdf"),
        "url": "https://arxiv.org/pdf/quant-ph/9605043.pdf"
    },
    {
        "title": "HHL Linear Systems Algorithm (2009)",
        "filename": os.path.join(PAPERS_DIR, "hhl_2009_linear_systems.pdf"),
        "url": "https://arxiv.org/pdf/0811.3171.pdf"
    },
    {
        "title": "VQE - Variational Quantum Eigensolver (2014)",
        "filename": os.path.join(PAPERS_DIR, "vqe_2014_peruzzo.pdf"),
        "url": "https://arxiv.org/pdf/1304.3061.pdf"
    },
    {
        "title": "QAOA - Quantum Approximate Optimization (2014)",
        "filename": os.path.join(PAPERS_DIR, "qaoa_2014_farhi.pdf"),
        "url": "https://arxiv.org/pdf/1411.4028.pdf"
    },
    {
        "title": "Kitaev - Fault-Tolerant Anyons & Toric Code (1997)",
        "filename": os.path.join(PAPERS_DIR, "kitaev_1997_toric_code.pdf"),
        "url": "https://arxiv.org/pdf/quant-ph/9707021.pdf"
    },
    {
        "title": "Surface Codes - Practical Quantum Computing (Fowler 2012)",
        "filename": os.path.join(PAPERS_DIR, "fowler_2012_surface_codes.pdf"),
        "url": "https://arxiv.org/pdf/1208.0928.pdf"
    },
    {
        "title": "Google Quantum AI Sycamore Supremacy (2019)",
        "filename": os.path.join(PAPERS_DIR, "google_2019_sycamore_supremacy.pdf"),
        "url": "https://arxiv.org/pdf/1910.11333.pdf"
    },
    {
        "title": "Preskill - Quantum Computing in the NISQ Era (2018)",
        "filename": os.path.join(PAPERS_DIR, "preskill_2018_nisq_era.pdf"),
        "url": "https://arxiv.org/pdf/1801.00862.pdf"
    },
    {
        "title": "Quantum Machine Learning (Biamonte et al. 2017)",
        "filename": os.path.join(PAPERS_DIR, "biamonte_2017_quantum_machine_learning.pdf"),
        "url": "https://arxiv.org/pdf/1611.09347.pdf"
    },
    {
        "title": "Introduction to Classical and Quantum Computing (Thomas Wong Textbook)",
        "filename": os.path.join(TEXTBOOKS_DIR, "thomas_wong_quantum_computing_textbook.pdf"),
        "url": "https://arxiv.org/pdf/2205.02119.pdf"
    }
]

def download_file(item):
    name = item["title"]
    path = item["filename"]
    url = item["url"]

    if os.path.exists(path) and os.path.getsize(path) > 1024:
        print(f"[ALREADY CACHED] {name}")
        return

    print(f"[DOWNLOADING] {name} from {url}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnantaQuantumLibrary/1.0'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response, open(path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        size_kb = os.path.getsize(path) / 1024
        print(f"[SUCCESS] {name} ({size_kb:.1f} KB saved to D: drive)")
    except Exception as err:
        print(f"[FAILED] Could not download {name}: {err}")

def main():
    print("=" * 60)
    print("Ananta Quantum Research Library - Local Literature Downloader")
    print(f"Target Directory: {TARGET_DIR}")
    print("=" * 60)
    
    for item in OPEN_ACCESS_RESOURCES:
        download_file(item)
        time.sleep(1)

    print("\nAll literature is cached on D:\\Ananta-Quantum-Library.")

if __name__ == "__main__":
    main()
