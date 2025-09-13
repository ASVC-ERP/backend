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
exports.SuppliersInvoiceController = void 0;
const common_1 = require("@nestjs/common");
const suppliers_invoice_service_1 = require("./suppliers-invoice.service");
const suppliers_invoice_dto_1 = require("./dto/suppliers-invoice.dto");
let SuppliersInvoiceController = class SuppliersInvoiceController {
    invoiceService;
    constructor(invoiceService) {
        this.invoiceService = invoiceService;
    }
    async addInvoice(dto) {
        return this.invoiceService.addInvoice(dto);
    }
    async getAllInvoices() {
        return this.invoiceService.findAll();
    }
    async getInvoicesBySupplier(supplierID) {
        return this.invoiceService.findBySupplier(supplierID);
    }
    async getInvoicesByItem(itemCode) {
        return this.invoiceService.findByItem(itemCode);
    }
};
exports.SuppliersInvoiceController = SuppliersInvoiceController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [suppliers_invoice_dto_1.CreateInvoiceDto]),
    __metadata("design:returntype", Promise)
], SuppliersInvoiceController.prototype, "addInvoice", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuppliersInvoiceController.prototype, "getAllInvoices", null);
__decorate([
    (0, common_1.Get)(':supplierID'),
    __param(0, (0, common_1.Param)('supplierID')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuppliersInvoiceController.prototype, "getInvoicesBySupplier", null);
__decorate([
    (0, common_1.Get)('items/:itemCode'),
    __param(0, (0, common_1.Param)('itemCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuppliersInvoiceController.prototype, "getInvoicesByItem", null);
exports.SuppliersInvoiceController = SuppliersInvoiceController = __decorate([
    (0, common_1.Controller)('suppliers/supplier-invoices'),
    __metadata("design:paramtypes", [suppliers_invoice_service_1.SuppliersInvoiceService])
], SuppliersInvoiceController);
//# sourceMappingURL=suppliers-invoice.controller.js.map