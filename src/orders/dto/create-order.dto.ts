export class CreateOrderDto {
  customerName: string;
  customerAddress: string;
  contactNo: string;
  deliveryType: 'pickup' | 'delivery';  // you can expand this later
}
