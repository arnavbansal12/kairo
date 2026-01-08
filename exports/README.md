# 📤 Exports & Tally Utilities

This folder contains export utilities and templates for integration with Tally Prime.

## Contents

| File | Description |
|------|-------------|
| `tally_export.py` | Python script for generating Tally-compatible XML |
| `Tally_Import_File_Fixed.xlsx` | Excel template for Tally imports |

## Usage

### Tally Export Script
```bash
python tally_export.py
```

### API Export
The backend also provides a `/export/tally` endpoint for direct XML download.

```bash
curl http://localhost:8000/export/tally -o tally_export.xml
```
