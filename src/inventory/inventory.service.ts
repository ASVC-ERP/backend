import { Injectable } from '@nestjs/common';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class InventoryService {
  constructor(private readonly sheetsService: SheetsService) {}

  private spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
  private itemSheet = 'Item List';
  private itemRange = `${this.itemSheet}!A2:I`; // Adjust based on columns
  private supplierSheet = 'Supplier List';
  private supplierRange = `${this.supplierSheet}!A2:C`;
  private purchaseLogSheet = 'Supplier Purchases';
  private purchaseRange = `${this.purchaseLogSheet}!A2:I`;

  async processPurchase(dto: {
    supplierInvoiceID: string;
    purchaseDate: string;
    itemCode: string;
    quantity: number;
    unit: string;
    unitCost: number;
    discount: number;
    grossPrice: number;
    supplierCode: string;
  }) {
    const {
      supplierInvoiceID,
      purchaseDate,
      itemCode,
      quantity,
      unit,
      unitCost,
      discount,
      grossPrice,
      supplierCode,
    } = dto;

    const items = await this.sheetsService.getData(this.spreadsheetId, this.itemRange);
    const suppliers = await this.sheetsService.getData(this.spreadsheetId, this.supplierRange);

    const itemIndex = items.findIndex(row => row[0] === itemCode);
    if (itemIndex === -1) return { success: false, message: 'Item not found' };

    const supplierExists = suppliers.some(row => row[0] === supplierCode);
    if (!supplierExists) return { success: false, message: 'Supplier not found' };

    // Update stock
    const stockCell = `E${itemIndex + 2}`; // Column E is "stock"
    const currentStock = parseInt(items[itemIndex][4] || '0', 10);
    const updatedStock = currentStock + quantity;
    await this.sheetsService.updateCell(this.spreadsheetId, this.itemSheet, stockCell, updatedStock);

    // Append to purchase logs
    await this.sheetsService.appendData(this.spreadsheetId, this.purchaseRange, [[
      supplierInvoiceID,
      purchaseDate,
      itemCode,
      quantity,
      unit,
      unitCost,
      discount,
      grossPrice,
      supplierCode,
    ]]);

    return { success: true, message: 'Stock updated and purchase logged' };
  }

  async findRowsAsObjectsByColumnHeader(
  spreadsheetId: string,
  sheetName: string,
  columnHeader: string,
  value: string | number,
) {
  // 1. Get Headers from the first row
  const headerResponse = await this.sheetsService.getData(
    spreadsheetId,
    `${sheetName}!1:1`,
  );
  const headers = headerResponse?.[0];

  if (!headers || headers.length === 0) {
    throw new Error(`No headers found in sheet "${sheetName}"`);
  }
  
  // 2. Find the column index for the given header
  const columnIndex = headers.indexOf(columnHeader);
  if (columnIndex === -1) {
    throw new Error(`Column "${columnHeader}" not found in sheet "${sheetName}"`);
  }

  // 3. Get all data rows (starting from the second row)
  const dataRows = await this.sheetsService.getData(
    spreadsheetId,
    `${sheetName}!A2:Z`, // Widen range to Z to ensure all columns are fetched
  );

  if (!dataRows || dataRows.length === 0) return [];

  // 4. Filter rows and map to objects
  const filteredRows = dataRows.filter(
    // Use .trim() to remove leading/trailing whitespace from sheet data
    // and ensure the column has a value before comparing.
    (row) => row[columnIndex]?.trim() === value.toString(),
  );

  const result = filteredRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ''; // handle missing values
    });
    return obj;
  });

  return result;
}

async getSheetDataAsObjects(
  spreadsheetId: string,
  sheetName: string,
  range: string,
) {
  // 1. Get Headers from the first row of the sheet
  const headerResponse = await this.sheetsService.getData(
    spreadsheetId,
    `${sheetName}!1:1`,
  );
  const headers = headerResponse?.[0];

  if (!headers || headers.length === 0) {
    throw new Error(`No headers found in sheet "${sheetName}"`);
  }

  // 2. Get all data rows from the specified range
  const dataRows = await this.sheetsService.getData(
    spreadsheetId,
    range, // e.g., 'Item List!A2:I'
  );

  if (!dataRows || dataRows.length === 0) return [];

  // 3. Map data rows into objects using the headers
  const result = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ''; // use empty string if no value
    });
    return obj;
  });

  return result;
}

async adjustStock(
  spreadsheetId: string,
  itemName: string,
  PIC: string,
  stock: number,
  remarks: string,
) {
  // Step 1: Get Inventory sheet data
  const rows = await this.sheetsService.getData(
    spreadsheetId,
    `Inventory!A1:Z`, // Fetch all data including headers
  );

  if (rows.length === 0) {
    throw new Error(`Sheet Inventory is empty`);
  }

  const headers = rows[0];
  const itemNameIndex = headers.indexOf('itemName');
  const itemCodeIndex = headers.indexOf('itemCode');
  const stockIndex = headers.indexOf('stock');

  if (itemNameIndex === -1 || itemCodeIndex === -1 || stockIndex === -1) {
    throw new Error(`Required columns (itemName, itemCode, stock) not found in sheet "${this.itemSheet}"`);
  }

  // Step 2: Find row for the itemName
  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && row[itemNameIndex] === itemName,
  );

  if (rowIndex === -1) {
    throw new Error(`Item "${itemName}" not found in sheet Inventory`);
  }

  const row = rows[rowIndex];
  const itemCode = row[itemCodeIndex];
  const oldStock = parseFloat(row[stockIndex]) || 0;
  const newStock = Number(stock);
  const adjustedQuantity = newStock - oldStock;

  // Step 3: Update the Inventory row
  const stockCellAddress = `${String.fromCharCode(65 + stockIndex)}${rowIndex + 1}`;
  await this.sheetsService.updateCell(
    spreadsheetId,
    "Inventory",
    stockCellAddress,
    newStock,
  );

  // Step 4: Append record to Physical Adjustment sheet
  const adjustmentRow = [
    new Date().toISOString().split('T')[0], // Date in YYYY-MM-DD format
    itemCode, // itemCode from Inventory
    itemName, // from query param
    oldStock.toString(), // fromQuantity
    newStock.toString(), // toQuantity
    adjustedQuantity.toString(), // adjustedQuantity
    PIC, // from query param
    remarks, // from query param
  ];

  await this.sheetsService.appendData(
    spreadsheetId,
    'Physical Adjustment!A1',
    [adjustmentRow],
  );

  // Step 5: Return summary
  return {
    message: 'Stock adjusted successfully',
    itemCode,
    itemName,
    fromQuantity: oldStock,
    toQuantity: newStock,
    adjustedQuantity,
    PIC,
    remarks,
  };
}

async updateItemPrice(
  spreadsheetId: string,
  itemName: string,
  price: number,
) {
  // Step 1: Get Inventory data
  const rows = await this.sheetsService.getData(
    spreadsheetId,
    `Inventory!A1:Z`, // Use itemSheet and fetch all columns
  );

  if (!rows || rows.length === 0) {
    throw new Error(`Sheet Inventory is empty or could not be read.`);
  }

  // Step 2: Find required column indexes
  const headers = rows[0];
  const itemNameIndex = headers.indexOf('itemName');
  const priceIndex = headers.indexOf('price4');

  if (itemNameIndex === -1 || priceIndex === -1) {
    throw new Error(`Required columns (itemName or price4) not found in sheet Inventory`);
  }

  // Step 3: Find row for the itemName
  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && row[itemNameIndex] === itemName,
  );

  if (rowIndex === -1) {
    throw new Error(`Item "${itemName}" not found in sheet Inventory`);
  }

  // Step 4: Compute cell range to update
  const columnLetter = String.fromCharCode(65 + priceIndex); // A=65
  const cellAddress = `${columnLetter}${rowIndex + 1}`;

  // Step 5: Update the price
  await this.sheetsService.updateCell(
    spreadsheetId,
    "Inventory",
    cellAddress,
    price,
  );

  return {
    message: `Price updated successfully for ${itemName}`,
    itemName,
    newPrice: price,
  };
}

async updateInventoryItem(
  spreadsheetId: string,
  itemName: string,
  updates: {
    brand?: string;
    minStock?: string | number;
    partNum?: string;
    interNum?: string;
    unit?: string;
    model?: string;
    origin?: string;
  },
) {
  // Step 1: Fetch sheet data
  const rows = await this.sheetsService.getData(
    spreadsheetId,
    'Inventory!A1:Z', // Fetch all data including headers
  );

  if (rows.length === 0) {
    throw new Error('Inventory sheet is empty');
  }

  const headers = rows[0];
  const itemNameIndex = headers.indexOf('itemName');

  if (itemNameIndex === -1) {
    throw new Error(`Column "itemName" not found in Inventory sheet`);
  }

  // Step 2: Locate row with matching itemName
  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && row[itemNameIndex] === itemName,
  );
  if (rowIndex === -1) {
    throw new Error(`Item "${itemName}" not found in Inventory`);
  }

  // Step 3: Map update fields to their column indexes
  const updatePromises: Promise<void>[] = [];
  const updatedFields: string[] = [];

  for (const [field, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null && value !== '') {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1) {
        // Calculate cell address (e.g., 'B5')
        const columnLetter = String.fromCharCode(65 + colIndex); // A=65
        const cellAddress = `${columnLetter}${rowIndex + 1}`;

        // Add the update operation to a list of promises
        updatePromises.push(
          this.sheetsService.updateCell(
            spreadsheetId,
            'Inventory',
            cellAddress,
            value,
          ),
        );
        updatedFields.push(field);
      }
    }
  }

  // Step 4: Execute updates in parallel
  await Promise.all(updatePromises);

  return {
    message: `Item "${itemName}" updated successfully`,
    updatedFields,
  };
}

}
