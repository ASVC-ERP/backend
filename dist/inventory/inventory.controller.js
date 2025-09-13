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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async addInventory(body) {
        const result = await this.inventoryService.processPurchase(body);
        if (!result.success) {
            throw new common_1.BadRequestException(result.message);
        }
        return result;
    }
    async findByHeaderObjects(itemName) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        const sheetName = 'Supplier Invoice';
        const columnHeader = 'itemName';
        return this.inventoryService.findRowsAsObjectsByColumnHeader(spreadsheetId, sheetName, columnHeader, itemName);
    }
    async getPhysicalCount(itemName) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        const sheetName = 'Physical Adjustment';
        const columnHeader = 'itemName';
        return this.inventoryService.findRowsAsObjectsByColumnHeader(spreadsheetId, sheetName, columnHeader, itemName);
    }
    async getSalesOrderHistory(itemName) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        const sheetName = 'Sales Order History';
        const columnHeader = 'itemName';
        return this.inventoryService.findRowsAsObjectsByColumnHeader(spreadsheetId, sheetName, columnHeader, itemName);
    }
    async adjustStock(itemName, PIC, stock, remarks) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        return this.inventoryService.adjustStock(spreadsheetId, itemName, PIC, Number(stock), remarks);
    }
    async updatePrice(itemName, price) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        return this.inventoryService.updateItemPrice(spreadsheetId, itemName, Number(price));
    }
    async updateInventory(body) {
        const spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
        return this.inventoryService.updateInventoryItem(spreadsheetId, body.itemName, {
            brand: body.brand,
            minStock: body.minStock,
            partNum: body.partNum,
            interNum: body.interNum,
            unit: body.unit,
            model: body.model,
            category: body.category,
        });
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "addInventory", null);
__decorate([
    (0, common_1.Get)('cost-history'),
    __param(0, (0, common_1.Query)('itemName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findByHeaderObjects", null);
__decorate([
    (0, common_1.Get)('physical-count'),
    __param(0, (0, common_1.Query)('itemName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getPhysicalCount", null);
__decorate([
    (0, common_1.Get)('sales-order-history'),
    __param(0, (0, common_1.Query)('itemName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getSalesOrderHistory", null);
__decorate([
    (0, common_1.Get)('adjust-stock'),
    __param(0, (0, common_1.Query)('itemName')),
    __param(1, (0, common_1.Query)('PIC')),
    __param(2, (0, common_1.Query)('stock')),
    __param(3, (0, common_1.Query)('remarks')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)('update-price'),
    __param(0, (0, common_1.Query)('itemName')),
    __param(1, (0, common_1.Query)('price')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updatePrice", null);
__decorate([
    (0, common_1.Patch)('update-inventory'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateInventory", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map