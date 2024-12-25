import { Response } from 'express';
import { RequiredDbEntries } from '@omniflex/infra-express';

import { lists, invitations } from '../todo.repo';

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