import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';

import {
  ListModel,
  ItemModel,
  InvitationModel,
  InvitationCodeModel,
  DiscussionModel,
  MessageModel,
} from './models';

export const lists = new SequelizeRepository(ListModel);
export const items = new SequelizeRepository(ItemModel);
export const invitations = new SequelizeRepository(InvitationModel);
export const invitationCodes = new SequelizeRepository(InvitationCodeModel);
export const discussions = new SequelizeRepository(DiscussionModel);
export const messages = new SequelizeRepository(MessageModel);