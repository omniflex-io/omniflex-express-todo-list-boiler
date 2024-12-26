import { RequiredDbEntries } from '@omniflex/infra-express';

import { invitations, invitationCodes, lists } from '../todo.repo';

const validateInviteeAccess = RequiredDbEntries.firstMatch(
  invitations,
  (req, res) => ({
    id: req.params.id,
    inviteeId: res.locals.user.id,
  }),
  true,
);

const validateInvitationAccess = RequiredDbEntries.firstMatch(
  invitations,
  (req, res) => ({
    id: req.params.id,
    $or: [
      { inviterId: res.locals.user.id },
      { inviteeId: res.locals.user.id },
    ],
  }),
  true,
);

const validateInvitationCode = RequiredDbEntries.firstMatch(
  invitationCodes,
  (req, res) => ({
    id: req.params.id,
    listId: req.params.listId,
    expiresAt: { $gt: new Date() },
  }),
  'invitationCode',
);

export const validateInvitationAcceptance = [
  RequiredDbEntries.byPathId(invitations, 'invitation'),
  validateInviteeAccess,
];

export const validateInvitationRejection = [
  RequiredDbEntries.byPathId(invitations, 'invitation'),
  validateInviteeAccess,
];

export const validateInvitationApproval = [
  RequiredDbEntries.byPathId(invitations, 'invitation'),
  RequiredDbEntries.firstMatch(
    lists,
    async (req, res) => {
      const invitation = res.locals.required.invitation;
      return {
        id: invitation.listId,
        ownerId: res.locals.user.id,
      };
    },
    true,
  ),
];

export const validateInvitationCodeJoin = [
  RequiredDbEntries.byPathId(lists, 'list', { fieldName: 'listId' }),
  validateInvitationCode,
];

export const validateListInvitationsAccess = [
  RequiredDbEntries.byPathId(lists, 'list', { fieldName: 'listId' }),
  RequiredDbEntries.firstMatch(
    lists,
    (req, res) => ({
      id: req.params.listId,
      ownerId: res.locals.user.id,
    }),
    true,
  ),
];

export const validateInvitationViewAccess = [
  RequiredDbEntries.byPathId(invitations, 'invitation'),
  validateInvitationAccess,
];