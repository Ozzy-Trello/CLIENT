# QR Code Format Changes - Backend Implementation Guide

## Overview
The QR code format has been shortened to improve print quality and reduce pixelation. This document outlines the backend changes needed to support the new format.

## Format Changes

### Old Format
```
cardId|itemId-tabLabel-fieldLabel-size-sequenceNumber-poIdentifier|mark_complete
```
**Example:** `card123|po456-polo-tpj-M-001-1|mark_complete`

### New Format
**Pattern:** `poNum+categoryCode+fieldCode+size+sequenceNumber`
**Example:** `1POTJM001`

## Data Reduction Techniques

- **Removed:** "mark_complete" action (default behavior)
- **Removed:** Card ID from QR (passed as parameter during scanning)
- **Shortened:** Category names to 2-char codes (polo → PO, jaket → JK)
- **Shortened:** Field names to 2-char codes (TPJ → TJ, TNK → TK, TPD → TD)
- **Simplified:** PO identifiers (po456 → 1)
- **Removed:** All separators (-, |) for ultra-compact format

**Result:** ~80% data reduction

## Backend Implementation

### API Changes
- **Route Updated**: Changed from `POST /additional-field/scan` to `POST /additional-field/:cardId/scan`
- **Card ID**: Now passed as URL parameter instead of request body
- **Request Body**: Only contains `{ scanned_data, action }` (card_id removed)
- **Parsing**: Complete rewrite to handle ultra-short format with 2-character codes

### New Route Structure
```
POST /api/additional-field/:cardId/scan
Body: { scanned_data: "1POTJM001", action: "mark_complete" }
```

### Parsing Logic
The backend now parses the ultra-short format using fixed positions:
```typescript
// Parse: poNum(1) + categoryCode(2) + fieldCode(2) + size(1) + sequenceNumber(3)
const poIdentifier = ultraShortData.substring(0, 1);      // "1"
const categoryCode = ultraShortData.substring(1, 3);      // "PO" 
const fieldCode = ultraShortData.substring(3, 5);         // "TJ"
const size = ultraShortData.substring(5, 6);              // "M"
const uniqueId = ultraShortData.substring(6, 9);          // "001"
```

### Code Mapping
The backend includes mapping functions to convert short codes back to full names:
```typescript
const categoryMap = {
  'PO': 'polo', 'JK': 'jaket', 'HD': 'hoodie', 'KM': 'kemeja',
  'CD': 'celana', 'TS': 'tshirt', 'SW': 'sweater', 'VT': 'vest',
  'JC': 'jacket', 'BL': 'blazer'
};

const fieldMap = {
  'TJ': 'tpj', 'TK': 'tnk', 'TD': 'tpd', 'TP': 'tpp',
  'TL': 'tpl', 'TM': 'tpm', 'TN': 'tpn', 'TR': 'tpr',
  'TS': 'tps', 'TT': 'tpt'
};
```

### Item Finding Logic
- Items are now found by PO identifier pattern instead of exact itemId matching
- Looks for items where the last part of itemId matches the PO identifier from QR code
- More flexible matching for existing size breakdown items

## Implementation Status

### ✅ Completed Changes
1. **Frontend QR Generation**: Updated to generate ultra-short format (e.g., `1POTJM001`)
2. **Frontend QR Scanning**: Modified to pass card ID as parameter, not from QR data
3. **Backend API Route**: Changed to `POST /additional-field/:cardId/scan`
4. **Backend Parsing**: Complete rewrite with 2-character code mapping
5. **Documentation**: Updated with new format specifications

### 🔄 Next Steps
- Update frontend API calls to use new endpoint structure
- Test the complete QR scanning flow
- Verify data reduction and readability improvements

## Benefits
- **~80% data reduction** → Much smaller QR codes
- **Better scan reliability** on mobile devices  
- **Cleaner sticker appearance** with bolder QR patterns
- **Conflict-free codes** with 2-character abbreviation system
- **Improved readability** for debugging and manual verification

## Migration Notes
- Frontend API calls need to be updated to use the new endpoint structure
- The new format is completely different from the old format
- Card ID is now passed as URL parameter instead of being embedded in QR code
- All parsing logic has been rewritten for the ultra-short format