import Joi from 'joi';
import j2s from 'joi-to-swagger';

import { TProduct, TOrder, TShoppingCart } from './models';
import { modulesSchemas } from '@omniflex/core';

export const createProductSchema = Joi.object<TProduct>({
  name: Joi.string().required(),
  price: Joi.number().positive().required(),
});

export const updateProductSchema = Joi.object<Partial<TProduct>>({
  name: Joi.string(),
  price: Joi.number().positive(),
});

export const createOrderSchema = Joi.object<TOrder>({
  shoppingCartId: Joi.string().uuid().required(),
});

export const updateOrderSchema = Joi.object<Partial<TOrder>>({
  shoppingCartId: Joi.string().uuid(),
});

export const updateShoppingCartSchema = Joi.object<Pick<TShoppingCart, 'status'>>({
  status: Joi.string().valid('active', 'checkout', 'abandoned').required(),
});

modulesSchemas.appModule = Object.assign(
  modulesSchemas.appModule || {},
  {
    orderManagement: {
      createProduct: {
        ...j2s(createProductSchema).swagger,
        example: {
          name: 'Sample Product',
          price: 99.99,
        },
      },
      updateProduct: {
        ...j2s(updateProductSchema).swagger,
        example: {
          name: 'Updated Product Name',
          price: 149.99,
        },
      },
      createOrder: {
        ...j2s(createOrderSchema).swagger,
        example: {
          shoppingCartId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      updateOrder: {
        ...j2s(updateOrderSchema).swagger,
        example: {
          shoppingCartId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      updateShoppingCart: {
        ...j2s(updateShoppingCartSchema).swagger,
        example: {
          status: 'checkout',
        },
      },
    },
  },
); 