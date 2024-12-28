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

const validateInvitationAccess = (getListId: (res: any) => string) =>
  RequiredDbEntries.firstMatch(
    invitations,
    (_, res) => ({
      listId: getListId(res),
      inviteeId: res.locals.user.id,
      status: 'accepted',
      approved: true,
    }),
    true,
  );

export const validateDiscussionMemberAccess = [
  byDiscussionId,
  RequiredDbEntries.firstMatch(
    items,
    async (_, res) => {
      const discussion = res.locals.required.discussion;
      return { id: discussion.itemId };
    },
    'item',
  ),
  validateInvitationAccess(res => res.locals.required.item.listId),
];

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
  validateInvitationAccess(res => res.locals.required.list.id),
];

export const validateListNotArchived = RequiredDbEntries.firstMatch(
  lists,
  (_, res) => ({
    id: res.locals.required.list.id,
    isArchived: false,
  }),
  true,
);

export const validateItemAccess = [
  byListId,
  validateInvitationAccess(res => res.locals.required.list.id),
];