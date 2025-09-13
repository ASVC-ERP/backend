"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
let InventoryService = class InventoryService {
    sheetsService;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    itemSheet = 'Item List';
    itemRange = `${this.itemSheet}!A2:I`;
    supplierSheet = 'Supplier List';
    supplierRange = `${this.supplierSheet}!A2:C`;
    purchaseLogSheet = 'Supplier Purchases';
    purchaseRange = `${this.purchaseLogSheet}!A2:I`;
    async processPurchase(dto) {
        const { supplierInvoiceID, purchaseDate, itemCode, quantity, unit, unitCost, discount, grossPrice, supplierCode, } = dto;
        const items = await this.sheetsService.getData(this.spreadsheetId, this.itemRange);
        const suppliers = await this.sheetsService.getData(this.spreadsheetId, this.supplierRange);
        const itemIndex = items.findIndex(row => row[0] === itemCode);
        if (itemIndex === -1)
            return { success: false, message: 'Item not found' };
        const supplierExists = suppliers.some(row => row[0] === supplierCode);
        if (!supplierExists)
            return { success: false, message: 'Supplier not found' };
        const stockCell = `E${itemIndex + 2}`;
        const currentStock = parseInt(items[itemIndex][4] || '0', 10);
        const updatedStock = currentStock + quantity;
        await this.sheetsService.updateCell(this.spreadsheetId, this.itemSheet, stockCell, updatedStock);
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
    async findRowsAsObjectsByColumnHeader(spreadsheetId, sheetName, columnHeader, value) {
        const headerResponse = await this.sheetsService.getData(spreadsheetId, `${sheetName}!1:1`);
        const headers = headerResponse?.[0];
        if (!headers || headers.length === 0) {
            throw new Error(`No headers found in sheet "${sheetName}"`);
        }
        const columnIndex = headers.indexOf(columnHeader);
        if (columnIndex === -1) {
            throw new Error(`Column "${columnHeader}" not found in sheet "${sheetName}"`);
        }
        const dataRows = await this.sheetsService.getData(spreadsheetId, `${sheetName}!A2:Z`);
        if (!dataRows || dataRows.length === 0)
            return [];
        const filteredRows = dataRows.filter((row) => row[columnIndex]?.trim() === value.toString());
        const result = filteredRows.map((row) => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] ?? '';
            });
            return obj;
        });
        return result;
    }
    async getSheetDataAsObjects(spreadsheetId, sheetName, range) {
        const headerResponse = await this.sheetsService.getData(spreadsheetId, `${sheetName}!1:1`);
        const headers = headerResponse?.[0];
        if (!headers || headers.length === 0) {
            throw new Error(`No headers found in sheet "${sheetName}"`);
        }
        const dataRows = await this.sheetsService.getData(spreadsheetId, range);
        if (!dataRows || dataRows.length === 0)
            return [];
        const result = dataRows.map((row) => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i] ?? '';
            });
            return obj;
        });
        return result;
    }
    async adjustStock(spreadsheetId, itemName, PIC, stock, remarks) {
        const rows = await this.sheetsService.getData(spreadsheetId, `Inventory!A1:Z`);
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
        const rowIndex = rows.findIndex((row, i) => i > 0 && row[itemNameIndex] === itemName);
        if (rowIndex === -1) {
            throw new Error(`Item "${itemName}" not found in sheet Inventory`);
        }
        const row = rows[rowIndex];
        const itemCode = row[itemCodeIndex];
        const oldStock = parseFloat(row[stockIndex]) || 0;
        const newStock = Number(stock);
        const adjustedQuantity = newStock - oldStock;
        const stockCellAddress = `${String.fromCharCode(65 + stockIndex)}${rowIndex + 1}`;
        await this.sheetsService.updateCell(spreadsheetId, "Inventory", stockCellAddress, newStock);
        const adjustmentRow = [
            new Date().toISOString().split('T')[0],
            itemCode,
            itemName,
            oldStock.toString(),
            newStock.toString(),
            adjustedQuantity.toString(),
            PIC,
            remarks,
        ];
        await this.sheetsService.appendData(spreadsheetId, 'Physical Adjustment!A1', [adjustmentRow]);
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
    async updateItemPrice(spreadsheetId, itemName, price) {
        const rows = await this.sheetsService.getData(spreadsheetId, `Inventory!A1:Z`);
        if (!rows || rows.length === 0) {
            throw new Error(`Sheet Inventory is empty or could not be read.`);
        }
        const headers = rows[0];
        const itemNameIndex = headers.indexOf('itemName');
        const priceIndex = headers.indexOf('price4');
        if (itemNameIndex === -1 || priceIndex === -1) {
            throw new Error(`Required columns (itemName or price4) not found in sheet Inventory`);
        }
        const rowIndex = rows.findIndex((row, i) => i > 0 && row[itemNameIndex] === itemName);
        if (rowIndex === -1) {
            throw new Error(`Item "${itemName}" not found in sheet Inventory`);
        }
        const columnLetter = String.fromCharCode(65 + priceIndex);
        const cellAddress = `${columnLetter}${rowIndex + 1}`;
        await this.sheetsService.updateCell(spreadsheetId, "Inventory", cellAddress, price);
        return {
            message: `Price updated successfully for ${itemName}`,
            itemName,
            newPrice: price,
        };
    }
    async updateInventoryItem(spreadsheetId, itemName, updates) {
        const rows = await this.sheetsService.getData(spreadsheetId, 'Inventory!A1:Z');
        if (rows.length === 0) {
            throw new Error('Inventory sheet is empty');
        }
        const headers = rows[0];
        const itemNameIndex = headers.indexOf('itemName');
        if (itemNameIndex === -1) {
            throw new Error(`Column "itemName" not found in Inventory sheet`);
        }
        const rowIndex = rows.findIndex((row, i) => i > 0 && row[itemNameIndex] === itemName);
        if (rowIndex === -1) {
            throw new Error(`Item "${itemName}" not found in Inventory`);
        }
        const updatePromises = [];
        const updatedFields = [];
        for (const [field, value] of Object.entries(updates)) {
            if (value !== undefined && value !== null && value !== '') {
                const colIndex = headers.indexOf(field);
                if (colIndex !== -1) {
                    const columnLetter = String.fromCharCode(65 + colIndex);
                    const cellAddress = `${columnLetter}${rowIndex + 1}`;
                    updatePromises.push(this.sheetsService.updateCell(spreadsheetId, 'Inventory', cellAddress, value));
                    updatedFields.push(field);
                }
            }
        }
        await Promise.all(updatePromises);
        return {
            message: `Item "${itemName}" updated successfully`,
            updatedFields,
        };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map