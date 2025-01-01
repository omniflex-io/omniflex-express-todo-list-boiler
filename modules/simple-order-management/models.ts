import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';
import * as Types from '@omniflex/infra-sequelize-v6/types';

export type TProduct = {
  id: string
  name: string
  price: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type TShoppingCart = {
  id: string
  status: 'active' | 'checkout' | 'abandoned'
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type TOrder = {
  id: string
  shoppingCartId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type TOrderItem = {
  id: string
  orderId: string
  productId: string
  quantity: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

const productSchema = {
  id: Types.id('UUID'),
  name: Types.requiredString(),
  price: Types.requiredNumber(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
}

const shoppingCartSchema = {
  id: Types.id('UUID'),
  status: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
}

const orderSchema = {
  id: Types.id('UUID'),
  shoppingCartId: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
}

const orderItemSchema = {
  id: Types.id('UUID'),
  orderId: Types.requiredString(),
  productId: Types.requiredString(),
  quantity: Types.requiredInteger(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
}

const sequelize = Containers
  .appContainerAs<{ sequelize: Sequelize; }>()
  .resolve('sequelize');

export const ProductModel = sequelize.define('Product', productSchema, {
  paranoid: true,
  indexes: [
    { fields: ['name'] },
  ],
});

export const ShoppingCartModel = sequelize.define('ShoppingCart', shoppingCartSchema, {
  paranoid: true,
  indexes: [
    { fields: ['status'] },
  ],
});

export const OrderModel = sequelize.define('Order', orderSchema, {
  paranoid: true,
  indexes: [
    { fields: ['shoppingCartId'] },
  ],
});

export const OrderItemModel = sequelize.define('OrderItem', orderItemSchema, {
  paranoid: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['productId'] },
  ],
});

OrderModel.belongsTo(ShoppingCartModel, { foreignKey: 'shoppingCartId', as: 'shoppingCart' });
ShoppingCartModel.hasOne(OrderModel, { foreignKey: 'shoppingCartId', as: 'order' });

OrderModel.hasMany(OrderItemModel, { foreignKey: 'orderId', as: 'items' });
OrderItemModel.belongsTo(OrderModel, { foreignKey: 'orderId', as: 'order' });

OrderItemModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'product' });
ProductModel.hasMany(OrderItemModel, { foreignKey: 'productId', as: 'orderItems' });

export const initializeDatabase = async () => {
  try {
    await sequelize.sync();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}; 