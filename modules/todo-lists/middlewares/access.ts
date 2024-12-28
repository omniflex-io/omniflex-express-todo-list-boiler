import { RequiredDbEntries } from '@omniflex/infra-express';

import { lists, invitations, items, discussions } from '../todo.repo';

export const byListId = RequiredDbEntries.byPathId(lists, 'list', { fieldName: 'listId' });

export const byItemId = RequiredDbEntries.firstMatch(
  items,
  req => ({
    id: req.params.itemId,
    listId: req.params.listId,
  }),
  'item',
);

export const byDiscussionId = RequiredDbEntries.byPathId(discussions, 'discussion', { fieldName: 'discussionId' });

export const validateListOwner = [
  byListId,
  RequiredDbEntries.firstMatch(
    lists,
    (_, res) => ({
      id: res.locals.required.list.id,
      ownerId: res.locals.user.id,
    }),
    true,
  ),
];

export const validateListAccess = [
  byListId,
  RequiredDbEntries.firstMatch(
    invitations,
    (_, res) => ({
      listId: res.locals.required.list.id,
      inviteeId: res.locals.user.id,
      status: 'accepted',
      approved: true,
    }),
    true,
  ),
];

export const validateItemAccess = [
  byListId,
  RequiredDbEntries.firstMatch(
    invitations,
    (_, res) => ({
      listId: res.locals.required.list.id,
      inviteeId: res.locals.user.id,
      status: 'accepted',
    }),
    true,
  ),
];

export const validateDiscussionAccess = [
  byDiscussionId,
  RequiredDbEntries.firstMatch(
    items,
    async (_, res) => {
      const discussion = res.locals.required.discussion;
      return { id: discussion.itemId };
    },
    'item',
  ),
  RequiredDbEntries.firstMatch(
    invitations,
    async (_, res) => {
      const item = res.locals.required.item;
      return {
        listId: item.listId,
        inviteeId: res.locals.user.id,
        status: 'accepted',
      };
    },
    true,
  ),
];