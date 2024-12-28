import { v4 as uuid } from 'uuid';
import { jwtProvider } from '@/utils/jwt';
import { lists, items, discussions, messages, invitations } from '../../todo.repo';

export const createTestUser = async () => {
  const userId = uuid();
  const token = await jwtProvider.sign({
    id: userId,
    __appType: 'exposed',
    __type: 'access-token',
    __identifier: 'testing',
  }, 5 * 60 * 1000);

  return { id: userId, token };
};

export const createTestList = async (ownerId: string, name: string) => {
  const list = await lists.create({
    ownerId,
    name,
    isArchived: false,
  });

  await invitations.create({
    listId: list.id,
    inviterId: ownerId,
    inviteeId: ownerId,
    status: 'accepted',
    approved: true,
  });

  return list;
};

export const createTestItem = async (listId: string, content: string) => {
  return items.create({
    listId,
    content,
    isCompleted: false,
  });
};

export const createTestDiscussion = async (itemId: string) => {
  return discussions.create({
    itemId,
  });
};

export const createTestMessage = async (discussionId: string, authorId: string, content: string) => {
  return messages.create({
    discussionId,
    authorId,
    content,
  });
};

export const createTestInvitation = async (
  listId: string,
  inviterId: string,
  inviteeId: string,
  approved: boolean = true,
) => {
  return invitations.create({
    listId,
    inviterId,
    inviteeId,
    status: 'pending',
    approved,
  });
};

export const resetTestData = async () => {
  await messages.updateMany({}, { deletedAt: new Date() });
  await discussions.updateMany({}, { deletedAt: new Date() });
  await items.updateMany({}, { deletedAt: new Date() });
  await lists.updateMany({}, { deletedAt: new Date() });
  await invitations.updateMany({}, { deletedAt: new Date() });
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