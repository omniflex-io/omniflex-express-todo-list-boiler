import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';
import { TDeepPartial, TQueryOptions } from '@omniflex/core/types/repository';

import {
  ProductModel,
  ShoppingCartModel,
  OrderModel,
  OrderItemModel,
  TProduct,
  TShoppingCart,
  TOrder,
  TOrderItem,
} from './models';

export class ProductRepository extends SequelizeRepository<TProduct> {
  constructor() {
    super(ProductModel);
  }

  async findAll(filter: TDeepPartial<TProduct>, options?: TQueryOptions<TProduct>): Promise<TProduct[]> {
    const result = await ProductModel.findAll({
      where: filter,
      ...options,
    });
    return result.map(product => product.toJSON() as TProduct);
  }

  async findOne(filter: TDeepPartial<TProduct>, options?: TQueryOptions<TProduct>): Promise<TProduct | null> {
    const result = await ProductModel.findOne({
      where: filter,
      ...options,
    });
    return result?.toJSON() as TProduct | null;
  }
}

export class ShoppingCartRepository extends SequelizeRepository<TShoppingCart> {
  constructor() {
    super(ShoppingCartModel);
  }

  async findAll(filter: TDeepPartial<TShoppingCart>, options?: TQueryOptions<TShoppingCart>): Promise<TShoppingCart[]> {
    const result = await ShoppingCartModel.findAll({
      where: filter,
      ...options,
    });
    return result.map(cart => cart.toJSON() as TShoppingCart);
  }

  async findByStatus(status: TShoppingCart['status'], options?: TQueryOptions<TShoppingCart>): Promise<TShoppingCart[]> {
    const result = await ShoppingCartModel.findAll({
      where: { status },
      ...options,
    });
    return result.map(cart => cart.toJSON() as TShoppingCart);
  }
}

export class OrderRepository extends SequelizeRepository<TOrder> {
  constructor() {
    super(OrderModel);
  }

  async findAll(filter: TDeepPartial<TOrder>, options?: TQueryOptions<TOrder>): Promise<TOrder[]> {
    const result = await OrderModel.findAll({
      where: filter,
      ...options,
      include: [{
        model: ShoppingCartModel,
        as: 'shoppingCart',
      }, {
        model: OrderItemModel,
        as: 'items',
        include: [{
          model: ProductModel,
          as: 'product',
        }],
      }],
    });
    return result.map(order => order.toJSON() as TOrder);
  }

  async findOne(filter: TDeepPartial<TOrder>, options?: TQueryOptions<TOrder>): Promise<TOrder | null> {
    const result = await OrderModel.findOne({
      where: filter,
      ...options,
      include: [{
        model: ShoppingCartModel,
        as: 'shoppingCart',
      }, {
        model: OrderItemModel,
        as: 'items',
        include: [{
          model: ProductModel,
          as: 'product',
        }],
      }],
    });
    return result?.toJSON() as TOrder | null;
  }

  async findById(id: string, options?: TQueryOptions<TOrder>): Promise<TOrder | null> {
    const result = await OrderModel.findByPk(id, {
      ...options,
      include: [{
        model: ShoppingCartModel,
        as: 'shoppingCart',
      }, {
        model: OrderItemModel,
        as: 'items',
        include: [{
          model: ProductModel,
          as: 'product',
        }],
      }],
    });
    return result?.toJSON() as TOrder | null;
  }
}

export class OrderItemRepository extends SequelizeRepository<TOrderItem> {
  constructor() {
    super(OrderItemModel);
  }

  async findAll(filter: TDeepPartial<TOrderItem>, options?: TQueryOptions<TOrderItem>): Promise<TOrderItem[]> {
    const result = await OrderItemModel.findAll({
      where: filter,
      ...options,
      include: [{
        model: ProductModel,
        as: 'product',
      }],
    });
    return result.map(item => item.toJSON() as TOrderItem);
  }

  async findByOrderId(orderId: string, options?: TQueryOptions<TOrderItem>): Promise<TOrderItem[]> {
    const result = await OrderItemModel.findAll({
      where: { orderId },
      ...options,
      include: [{
        model: ProductModel,
        as: 'product',
      }],
    });
    return result.map(item => item.toJSON() as TOrderItem);
  }
}

export const products = new ProductRepository();
export const shoppingCarts = new ShoppingCartRepository();
export const orders = new OrderRepository();
export const orderItems = new OrderItemRepository(); 