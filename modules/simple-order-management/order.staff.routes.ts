// #swagger.file.tags = ['Order Management']
// #swagger.file.basePath = '/v1/order-management'

import { auth } from '@/middlewares/auth';
import { StaffRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { getControllerCreator, BaseEntitiesController } from '@omniflex/infra-express';
import { Request, Response, NextFunction } from 'express';

import { orders, shoppingCarts, orderItems } from './order.repo';
import { TOrder, TShoppingCart, TOrderItem } from './models';
import {
  createOrderSchema,
  updateOrderSchema,
  updateShoppingCartSchema,
} from './http.schemas';

class OrderController extends BaseEntitiesController<TOrder> {
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, orders, { idParamName: 'orderId' });
  }

  static create = getControllerCreator(OrderController);

  tryList() {
    return this.tryAction(async () => {
      const { shoppingCartId } = this.req.query;
      const filter = shoppingCartId ? { shoppingCartId: shoppingCartId as string } : {};

      const result = await this.repository.find(filter, {
        sort: { createdAt: 'desc' },
      });
      this.respondMany(result);
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('order'));
  }
}

class ShoppingCartController extends BaseEntitiesController<TShoppingCart> {
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, shoppingCarts, { idParamName: 'cartId' });
  }

  static create = getControllerCreator(ShoppingCartController);

  tryList() {
    return this.tryAction(async () => {
      const { status } = this.req.query;
      const result = status
        ? await this.repository.find({ status: status as TShoppingCart['status'] })
        : await this.repository.find({}, { sort: { createdAt: 'desc' } });
      this.respondMany(result);
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('cart'));
  }
}

const router = StaffRouter('/v1/order-management');

router
  .get('/orders',
    // #swagger.summary = 'List all orders'
    // #swagger.description = 'Returns a list of all orders with optional shopping cart filter'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['shoppingCartId'] = { description: 'Filter orders by shopping cart ID', type: 'string' }
    // #swagger.parameters['page'] = { description: 'Page number (1-based)', type: 'integer', default: 1 }
    // #swagger.parameters['pageSize'] = { description: 'Number of items per page', type: 'integer', default: 10 }
    auth.requireStaff,
    OrderController.create(controller => controller.tryList()))

  .post('/orders',
    // #swagger.summary = 'Create a new order'
    // #swagger.description = 'Creates a new order from a shopping cart'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.requestBody = { "$ref": "#/components/schemas/orderManagement/createOrder" }
    auth.requireStaff,
    tryValidateBody(createOrderSchema),
    OrderController.create(controller => controller.tryCreate()))

  .get('/orders/:orderId',
    // #swagger.summary = 'Get an order by ID'
    // #swagger.description = 'Returns a single order by its ID'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['orderId'] = { description: 'UUID of the order' }
    auth.requireStaff,
    OrderController.create(controller => controller.tryGetOne()))

  .patch('/orders/:orderId',
    // #swagger.summary = 'Update an order'
    // #swagger.description = 'Updates an existing order with the given details'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['orderId'] = { description: 'UUID of the order' }
    // #swagger.requestBody = { "$ref": "#/components/schemas/orderManagement/updateOrder" }
    auth.requireStaff,
    tryValidateBody(updateOrderSchema),
    OrderController.create(controller => controller.tryUpdate()))

  .get('/shopping-carts',
    // #swagger.summary = 'List all shopping carts'
    // #swagger.description = 'Returns a list of all shopping carts with optional status filter'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['status'] = { description: 'Filter carts by status', type: 'string', enum: ['active', 'checkout', 'abandoned'] }
    // #swagger.parameters['page'] = { description: 'Page number (1-based)', type: 'integer', default: 1 }
    // #swagger.parameters['pageSize'] = { description: 'Number of items per page', type: 'integer', default: 10 }
    auth.requireStaff,
    ShoppingCartController.create(controller => controller.tryList()))

  .get('/shopping-carts/:cartId',
    // #swagger.summary = 'Get a shopping cart by ID'
    // #swagger.description = 'Returns a single shopping cart by its ID'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['cartId'] = { description: 'UUID of the shopping cart' }
    auth.requireStaff,
    ShoppingCartController.create(controller => controller.tryGetOne()))

  .patch('/shopping-carts/:cartId',
    // #swagger.summary = 'Update a shopping cart'
    // #swagger.description = 'Updates an existing shopping cart with the given details'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['cartId'] = { description: 'UUID of the shopping cart' }
    // #swagger.requestBody = { "$ref": "#/components/schemas/orderManagement/updateShoppingCart" }
    auth.requireStaff,
    tryValidateBody(updateShoppingCartSchema),
    ShoppingCartController.create(controller => controller.tryUpdate())); 