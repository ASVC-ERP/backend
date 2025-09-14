import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: SuppliersService;

  // ✅ mock service implementation
  const mockSuppliersService = {
    getSuppliers: jest.fn().mockResolvedValue([
      { id: '1', name: 'Test Supplier', address: 'Test Address' },
    ]),
    addSupplier: jest.fn().mockResolvedValue({ message: 'Supplier added successfully' }),
    updateSupplier: jest.fn().mockResolvedValue({ message: 'Supplier updated successfully.' }),
    deleteSupplier: jest.fn().mockResolvedValue({ message: 'Supplier deleted successfully.' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get<SuppliersService>(SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return suppliers from service', async () => {
    expect(await controller.getSuppliers()).toEqual([
      { id: '1', name: 'Test Supplier', address: 'Test Address' },
    ]);
    expect(service.getSuppliers).toHaveBeenCalled();
  });

  it('should add a supplier', async () => {
    const body = { id: '2', name: 'New Supplier', address: 'New Address' };
    expect(await controller.addSupplier(body)).toEqual({
      message: 'Supplier added successfully',
    });
    expect(service.addSupplier).toHaveBeenCalledWith('2', 'New Supplier', 'New Address');
  });

  it('should update a supplier', async () => {
    const body = { name: 'Updated Name' };
    expect(await controller.updateSupplier('1', body)).toEqual({
      message: 'Supplier updated successfully.',
    });
    expect(service.updateSupplier).toHaveBeenCalledWith('1', body);
  });

  it('should delete a supplier', async () => {
    expect(await controller.deleteSupplier('1')).toEqual({
      message: 'Supplier deleted successfully.',
    });
    expect(service.deleteSupplier).toHaveBeenCalledWith('1');
  });
});
