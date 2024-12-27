import { Response } from 'express';
import { errors } from '@omniflex/core';
import { ExpressUtils, RequiredDbEntries } from '@omniflex/infra-express';

import { lists, invitations, items, discussions } from '../todo.repo';

const getInvitationQuery = (listId: string, res: Response) => ({
  listId,
  status: 'accepted',
  inviteeId: res.locals.user.id,
});

export const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

export const byItemId = RequiredDbEntries.firstMatch(
  items,
  req => ({
    id: req.params.itemId,
    listId: req.params.listId,
  }),
  'item',
);

export const byDiscussionId = RequiredDbEntries.byPathId(discussions, 'discussion');

export const validateListOwner = RequiredDbEntries.firstMatch(
  lists,
  (req, res) => ({
    id: req.params.id || req.params.listId,
    ownerId: res.locals.user.id,
  }),
  true,
);

export const validateListAccess = [
  RequiredDbEntries.byPathId(lists, 'list'),
  RequiredDbEntries.firstMatch(
    invitations,
    (req, res) => getInvitationQuery(req.params.id, res),
    true,
  ),
];

export const validateItemAccess = [
  RequiredDbEntries.byPathId(lists, 'list', { fieldName: 'listId' }),
  ExpressUtils.tryAction(
    async (req, res) => {
      const listId = req.params.listId;
      const userId = res.locals.user.id;

      const [isOwner, isInvited] = await Promise.all([
        lists.exists({
          id: listId,
          ownerId: userId,
        }),
        invitations.exists({
          listId,
          inviteeId: userId,
          status: 'accepted',
        }),
      ]);

      if (!isOwner && !isInvited) {
        throw errors.notFound();
      }
    }
  ),
];

export const validateDiscussionAccess = [
  RequiredDbEntries.byPathId(discussions, 'discussion'),
  RequiredDbEntries.firstMatch(
    items,
    async (req, res) => {
      const discussion = res.locals.required.discussion;
      return { id: discussion.itemId };
    },
    'item'
  ),
  ExpressUtils.tryAction(
    async (req, res) => {
      const item = res.locals.required.item;
      const userId = res.locals.user.id;

      const [isOwner, isInvited] = await Promise.all([
        lists.exists({
          id: item.listId,
          ownerId: userId,
        }),
        invitations.exists({
          listId: item.listId,
          inviteeId: userId,
          status: 'accepted',
        }),
      ]);

      if (!isOwner && !isInvited) {
        throw errors.notFound();
      }
    }
  ),
];