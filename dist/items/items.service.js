"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
let DEBUG = true;
let ItemsService = class ItemsService {
    items = [
        {
            id: 1,
            itemCode: 'ITEM001',
            itemName: 'Electric Fan',
            brand: 'CoolAir',
            origin: 'Philippines',
            stock: 20,
            originalPrice: 1500,
            netAPrice: 1450,
            netBPrice: 1400,
        },
        {
            id: 2,
            itemCode: 'ITEM002',
            itemName: 'Blender',
            brand: 'MixPro',
            origin: 'China',
            stock: 15,
            originalPrice: 1200,
            netAPrice: 1150,
            netBPrice: 1100,
        },
    ];
    create(item) {
        const newItem = {
            id: this.items.length + 1,
            ...item,
        };
        this.items.push(newItem);
        return newItem;
    }
    findAll() {
        return this.items;
    }
    findOne(id) {
        return this.items.find(items => items.id === id);
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)()
], ItemsService);
//# sourceMappingURL=items.service.js.map