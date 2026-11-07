# Recovered article illustrations

Original files recovered on November 7, 2026 from the Internet Archive's October 22 snapshot of [Everyone is starting over](https://web.archive.org/web/20261022130453/https://www.gabrielvaldivia.com/notes/everybody-is-starting-over).

| File | Media ID | Article section | Original dimensions |
| --- | --- | --- | --- |
| `image-13.png` | 664 | Donald Glover | 2912 × 1645 |
| `image-14.png` | 665 | Shigeru Miyamoto | 2912 × 1632 |
| `image-12.png` | 663 | David Bowie | 2912 × 1648 |

Each file's SHA-1 matched the archive's CDX digest before restoration. `provenance.json` records the archive URLs and SHA-256 hashes. Keep these originals in Git as a recovery copy; the website serves them from R2.

Recovery restored these three original URLs, all 18 archived resized files, and the three missing media records with their original IDs. The article body, publication status, and newsletter delivery metadata were left unchanged. Recovered media records use the recovery time for their creation/update timestamps because the original record timestamps were unavailable.

The article still contained its upload references when recovery began, but the referenced media records and R2 objects were missing. An October 25 Claude review session mentions another session clearing unused uploads; the actual deletion command has not been verified. The new media `beforeDelete` hook rejects CMS/API deletion of files referenced by a saved note or its latest draft. Direct database and storage operations bypass that hook and must check references separately.
