import { api } from ".";
import { ApiResponse } from "../types/type";

// CSV row structure based on the backend interface
export interface CSVRow {
  product_name: string;
  bahan_name: string;
  warna_name: string;
  warna_hex_code?: string;
  warna_code?: string;
  product_code?: string;
  product_description?: string;
}

// Request interface
export interface HierarchicalBulkUploadRequest {
  csv_data: CSVRow[];
}

// Error interface
export interface HierarchicalBulkUploadError {
  row_index: number;
  entity_type: 'product' | 'bahan' | 'warna' | 'unknown';
  entity_name: string;
  error: string;
}

// Result interface
export interface HierarchicalBulkUploadResult {
  total_rows: number;
  
  // Product statistics
  products: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Bahan statistics
  bahans: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Warna statistics
  warnas: {
    total_attempted: number;
    total_created: number;
    total_skipped: number;
  };
  
  // Error tracking
  errors: HierarchicalBulkUploadError[];
}

// API function for hierarchical bulk upload
export const hierarchicalBulkUpload = async (
  request: HierarchicalBulkUploadRequest
): Promise<ApiResponse<HierarchicalBulkUploadResult>> => {
  const { data } = await api.post("/hierarchical-bulk-upload", request);
  return data;
};

// Utility function to parse CSV content into CSVRow array
export const parseHierarchicalCSV = (csvContent: string): CSVRow[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];

  // Remove BOM if present
  const firstLine = lines[0].replace(/^\uFEFF/, '');
  lines[0] = firstLine;

  // Check if first line is header (contains expected column names)
  const isHeader = firstLine.toLowerCase().includes('produk') || 
                   firstLine.toLowerCase().includes('product') ||
                   firstLine.toLowerCase().includes('bahan') ||
                   firstLine.toLowerCase().includes('warna');

  const dataLines = isHeader ? lines.slice(1) : lines;
  const csvRows: CSVRow[] = [];

  dataLines.forEach((line, index) => {
    if (line.trim() === '') return; // Skip empty lines

    // Split by comma, handling quoted values
    const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
    
    if (columns.length >= 3) { // Minimum required: product, bahan, warna
      const csvRow: CSVRow = {
        product_name: columns[0] || '',
        bahan_name: columns[1] || '',
        warna_name: columns[2] || '',
        warna_hex_code: columns[3] || undefined,
        warna_code: columns[4] || undefined,
        product_code: columns[5] || undefined,
        product_description: columns[6] || undefined,
      };

      // Only add if required fields are present
      if (csvRow.product_name && csvRow.bahan_name && csvRow.warna_name) {
        csvRows.push(csvRow);
      }
    }
  });

  return csvRows;
};