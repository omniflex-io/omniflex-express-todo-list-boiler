/**
 * @bug BUG-001
 * @title Registration Fails Due to Invalid Operator Format
 * @status Fixed
 * @reportedDate 2025-01-26
 * @fixedDate 2025-01-26
 * @relatedTests REPO-E0010
 *
 * @description
 * User registration fails with error "Invalid operator format: operators must be an object"
 * when attempting to create a new user account.
 *
 * @reproduction
 * 1. Send POST request to /v1/users
 * 2. Include valid registration data (email, password, firstName, lastName)
 * 3. System throws error about invalid operator format
 *
 * @rootCause
 * The repository's transformOperators method is incorrectly handling direct values
 * when they are passed as filter conditions. The method expects an object with operators
 * but fails when receiving a direct value.
 *
 * @fix
 * Modified transformOperators to properly handle both direct values and operator objects.
 * Now it converts direct values to {[Op.eq]: value} instead of throwing an error.
 */

import { Model, DataTypes, Sequelize } from 'sequelize';
import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';

describe('BUG-001: Registration Operator Validation', () => {
  let repository: SequelizeRepository<any, string>;
  let TestModel: any;
  let sequelize: Sequelize;

  beforeAll(() => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    TestModel = class extends Model {};
    TestModel.init({
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      email: DataTypes.STRING,
    }, {
      sequelize,
      modelName: 'test',
    });

    await sequelize.sync({ force: true });
    repository = new SequelizeRepository(TestModel);
  });

  it('[REPO-E0010] should handle direct values in filter conditions', () => {
    const filter = {
      email: 'test@example.com', // Direct value without operators
    };

    // Should not throw error
    expect(() => {
      repository['transformFilter'](filter);
    }).not.toThrow('Invalid operator format: operators must be an object');
  });

  it('[REPO-E0020] should still handle operator objects correctly', () => {
    const filter = {
      email: {
        $eq: 'test@example.com',
      },
    };

    // Should not throw error and transform correctly
    expect(() => {
      repository['transformFilter'](filter);
    }).not.toThrow();
  });

  it('[REPO-E0030] should handle mixed direct values and operators', () => {
    const filter = {
      email: 'test@example.com',
      createdAt: {
        $gt: new Date(),
      },
    };

    // Should handle both types correctly
    expect(() => {
      repository['transformFilter'](filter);
    }).not.toThrow();
  });
});