import { v4 as uuid } from 'uuid';
import { jwtProvider } from '@/utils/jwt';
import { membershipLevels, membershipRecords } from '../../membership.repo';

export const createTestUser = async (type: 'staff' | 'exposed' | 'developer') => {
  const userId = uuid();
  const token = await jwtProvider.sign({
    id: userId,
    __appType: type,
    __type: 'access-token',
    __identifier: 'testing',
  }, 5 * 60 * 1000);

  return { id: userId, token };
};

export const createTestLevelData = (
  rank: number,
  isDefault = false,
  code?: string,
) => ({
  name: code ? code.toLowerCase() : `Level ${rank}`,
  code: code || `LEVEL_${rank}`,
  rank,
  isDefault,
});

export const createTestLevel = async (rank: number, isDefault = false, code?: string) => {
  return membershipLevels.create({
    name: code ? code.toLowerCase() : `Level ${rank}`,
    code: code || `LEVEL_${rank}`,
    rank,
    isDefault,
  });
};

export const createTestMembershipRecordData = (
  userId = uuid(),
  membershipLevelId: string,
  startAtUtc = new Date(),
  endBeforeUtc = new Date('9999-12-31T23:59:59Z'),
) => ({
  userId,
  membershipLevelId,
  startAtUtc: startAtUtc instanceof Date ? startAtUtc.toISOString() : startAtUtc,
  endBeforeUtc: endBeforeUtc instanceof Date ? endBeforeUtc.toISOString() : endBeforeUtc,
});

export const createTestMembershipRecord = async (
  userId: string,
  membershipLevelId: string,
  startAtUtc = new Date(),
  endBeforeUtc = new Date('9999-12-31T23:59:59Z'),
) => {
  return membershipRecords.create({
    userId,
    membershipLevelId,
    startAtUtc,
    endBeforeUtc,
  });
};

export const resetTestData = async (): Promise<void> => {
  const now = new Date();

  // First, soft delete all records
  await membershipRecords.updateMany({}, { deletedAt: now });
  await membershipLevels.updateMany({}, { deletedAt: now });

  // Then, restore the default level if it exists
  const defaultLevel = await membershipLevels.findOne({ isDefault: true });
  if (defaultLevel) {
    await membershipLevels.updateById(defaultLevel.id, { deletedAt: null });
  }
};

/**
 * Validates the response data structure and optionally checks if it matches the expected object.
 * @template T Type of the expected data object
 * @param response The response object from the API call
 * @param expecting Optional object to match against the response data
 * @returns The response data
 */
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

export const expectMembershipLevelResponse = (data: any): void => {
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('name');
  expect(data).toHaveProperty('code');
  expect(data).toHaveProperty('rank');
  expect(data).toHaveProperty('isDefault');
  expect(data).toHaveProperty('createdAt');
  expect(data).toHaveProperty('updatedAt');
};

export const expectMembershipRecordResponse = (data: any): void => {
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('userId');
  expect(data).toHaveProperty('membershipLevelId');
  expect(data).toHaveProperty('startAtUtc');
  expect(data).toHaveProperty('endBeforeUtc');
  expect(data).toHaveProperty('createdAt');
  expect(data).toHaveProperty('updatedAt');
};