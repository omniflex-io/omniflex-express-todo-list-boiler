import { Response } from 'express';
import { RequiredDbEntries } from '@omniflex/infra-express';

import { lists, invitations, items, discussions } from '../todo.repo';

const getInvitationQuery = (listId: string, res: Response) => ({
  listId,
  status: 'accepted',
  inviteeId: res.locals.user.id,
});

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
  RequiredDbEntries.firstMatch(
    invitations,
    (req, res) => getInvitationQuery(req.params.listId, res),
    true,
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
  RequiredDbEntries.firstMatch(
    invitations,
    async (req, res) => {
      const item = res.locals.required.item;
      return getInvitationQuery(item.listId, res);
    },
    true
  ),
]; 