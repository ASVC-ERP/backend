"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuppliersInvoiceModule = void 0;
const common_1 = require("@nestjs/common");
const suppliers_invoice_service_1 = require("./suppliers-invoice.service");
const suppliers_invoice_controller_1 = require("./suppliers-invoice.controller");
const sheets_module_1 = require("../../sheets/sheets.module");
const items_module_1 = require("../../items/items.module");
let SuppliersInvoiceModule = class SuppliersInvoiceModule {
};
exports.SuppliersInvoiceModule = SuppliersInvoiceModule;
exports.SuppliersInvoiceModule = SuppliersInvoiceModule = __decorate([
    (0, common_1.Module)({
        imports: [sheets_module_1.SheetsModule, items_module_1.ItemsModule],
        providers: [suppliers_invoice_service_1.SuppliersInvoiceService],
        controllers: [suppliers_invoice_controller_1.SuppliersInvoiceController]
    })
], SuppliersInvoiceModule);
//# sourceMappingURL=suppliers-invoice.module.js.map