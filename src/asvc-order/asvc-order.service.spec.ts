import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './asvc-order.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;

  const mockSupabase = {
    client: {
      rpc: jest.fn(),
      from: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: SupabaseService,
          useValue: mockSupabase,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  // =================================================================
  // CREATE
  // =================================================================
  describe('create()', () => {
    it('should create a sales order and return order_id', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        data: 101,
        error: null,
      });

      const result = await service.create({
        cid: 1,
        sales_agent: 2,
        discount: 0,
        items: [{ item_id: 1, quantity: 10, price: 100 }],
      } as any);

      expect(result).toEqual({ order_id: 101 });
      expect(mockSupabase.client.rpc).toHaveBeenCalledWith(
        'create_sales_order',
        expect.objectContaining({
          p_cid: 1,
          p_sales_agent: 2,
          p_discount: 0,
          p_items: expect.any(Array),
        }),
      );
    });

    it('should throw if RPC fails', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.create({} as any)).rejects.toThrow('DB error');
    });
  });

  // =================================================================
  // READ BY PAGE
  // =================================================================
  describe('get_by_page()', () => {
    it('should return paginated orders with meta', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: () => ({
          order: () => ({
            range: () => ({
              data: [{ id: 1 }],
              error: null,
              count: 1,
            }),
          }),
        }),
      });

      const result = await service.get_by_page(1, 30);

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: () => ({
          order: () => ({
            range: () => ({
              data: null,
              error: { message: 'fail' },
              count: null,
            }),
          }),
        }),
      });

      await expect(service.get_by_page()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // =================================================================
  // READ BY ID
  // =================================================================
  describe('find()', () => {
    it('should return mapped order data', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: 1,
                order_date: '2026-01-23',
                status: 'Open',
                total_price: 1000,
                discount: 0,
                approval_status: 'Required',
                users: { name: 'Agent' },
                customers: { name: 'Customer' },
                sales_order_items: [],
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.find(1);

      expect(result.id).toBe(1);
      expect(result.sales_agent).toBeDefined();
      expect(result.customer).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should throw if order not found', async () => {
      mockSupabase.client.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      });

      await expect(service.find(99)).rejects.toThrow();
    });
  });

  // =================================================================
  // UPDATE
  // =================================================================
  describe('update()', () => {
    it('should update sales order', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        error: null,
      });

      const result = await service.update(1, {
        cid: 1,
        order_date: '2026-01-23',
        discount: 0,
        items: [],
      } as any);

      expect(result).toEqual({ updated: true });
    });

    it('should throw if update RPC fails', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        error: { message: 'update failed' },
      });

      await expect(service.update(1, {} as any)).rejects.toThrow();
    });
  });

  // =================================================================
  // DELETE
  // =================================================================
  describe('delete()', () => {
    it('should delete order', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        error: null,
      });

      const result = await service.delete(1);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        error: { message: 'not found' },
      });

      await expect(service.delete(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other errors', async () => {
      mockSupabase.client.rpc.mockResolvedValue({
        error: { message: 'constraint violation' },
      });

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });
  });
});
