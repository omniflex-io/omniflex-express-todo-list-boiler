import { v4 as uuid } from 'uuid';
import { jwtProvider } from '@/utils/jwt';
import { products, orders, shoppingCarts, orderItems } from '../../order.repo';
import { TProduct, TOrder, TShoppingCart, TOrderItem } from '../../models';

export const createTestStaff = async () => {
  const staffId = uuid();
  const token = await jwtProvider.sign({
    id: staffId,
    __appType: 'staff',
    __type: 'access-token',
    __identifier: 'testing',
  }, 5 * 60 * 1000);

  return { id: staffId, token };
};

export const createTestProduct = async (name: string, price: number): Promise<TProduct> => {
  return products.create({
    name,
    price,
  });
};

export const createTestShoppingCart = async (status: TShoppingCart['status'] = 'active'): Promise<TShoppingCart> => {
  return shoppingCarts.create({
    status,
  });
};

export const createTestOrder = async (shoppingCartId: string): Promise<TOrder> => {
  return orders.create({
    shoppingCartId,
  });
};

export const createTestOrderItem = async (orderId: string, productId: string, quantity: number): Promise<TOrderItem> => {
  return orderItems.create({
    orderId,
    productId,
    quantity,
  });
};

export const resetTestData = async () => {
  await orderItems.updateMany({}, { deletedAt: new Date() });
  await orders.updateMany({}, { deletedAt: new Date() });
  await shoppingCarts.updateMany({}, { deletedAt: new Date() });
  await products.updateMany({}, { deletedAt: new Date() });
};

export const expectResponseData = <T extends Record<string, any>>(
  response: any,
  expecting?: T,
): T & Record<string, any> => {
  expect(response.body).toHaveProperty('data');
  const data = response.body.data;

  if (expecting) {
    expect(data).toMatchObject(expecting);
  }

  return data;
};

export const expectListResponse = <T extends Record<string, any>>(
  response: any,
  length: number,
  expecting?: T[],
): (T & Record<string, any>)[] => {
  const data = expectResponseData<T[]>(response);
  expect(data).toHaveLength(length);

  if (expecting) {
    expect(data).toEqual(
      expect.arrayContaining(
        expecting.map((item) => expect.objectContaining(item)),
      ),
    );
  }

  return data;
}; 