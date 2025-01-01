// #swagger.file.tags = ['Order Management']
// #swagger.file.basePath = '/v1/order-management'

import { auth } from '@/middlewares/auth';
import { StaffRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { getControllerCreator, BaseEntitiesController } from '@omniflex/infra-express';
import { Request, Response, NextFunction } from 'express';

import { products } from './order.repo';
import { TProduct } from './models';
import { createProductSchema, updateProductSchema } from './http.schemas';

class ProductController extends BaseEntitiesController<TProduct> {
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, products, { idParamName: 'productId' });
  }

  static create = getControllerCreator(ProductController);

  tryList() {
    return this.tryAction(async () => {
      const { name } = this.req.query;
      const options = {
        sort: { name: 'asc' as const },
      };

      const filter = name ? {
        name: {
          $regex: name as string,
          $options: 'i',
        },
      } : {};

      const result = await this.repository.find(filter, options);
      this.respondMany(result);
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('product'));
  }
}

const router = StaffRouter('/v1/order-management');

router
  .get('/products',
    // #swagger.summary = 'List all products'
    // #swagger.description = 'Returns a list of all products with optional name filter'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['name'] = { description: 'Filter products by name', type: 'string' }
    // #swagger.parameters['page'] = { description: 'Page number (1-based)', type: 'integer', default: 1 }
    // #swagger.parameters['pageSize'] = { description: 'Number of items per page', type: 'integer', default: 10 }
    auth.requireStaff,
    ProductController.create(controller => controller.tryList()))

  .post('/products',
    // #swagger.summary = 'Create a new product'
    // #swagger.description = 'Creates a new product with the given details'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.requestBody = { "$ref": "#/components/schemas/orderManagement/createProduct" }
    auth.requireStaff,
    tryValidateBody(createProductSchema),
    ProductController.create(controller => controller.tryCreate()))

  .get('/products/:productId',
    // #swagger.summary = 'Get a product by ID'
    // #swagger.description = 'Returns a single product by its ID'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['productId'] = { description: 'UUID of the product' }
    auth.requireStaff,
    ProductController.create(controller => controller.tryGetOne()))

  .patch('/products/:productId',
    // #swagger.summary = 'Update a product'
    // #swagger.description = 'Updates an existing product with the given details'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['productId'] = { description: 'UUID of the product' }
    // #swagger.requestBody = { "$ref": "#/components/schemas/orderManagement/updateProduct" }
    auth.requireStaff,
    tryValidateBody(updateProductSchema),
    ProductController.create(controller => controller.tryUpdate())); 