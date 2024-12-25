import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';

import {
  ListModel,
  ItemModel,
  InvitationModel,
  DiscussionModel,
  MessageModel,
} from './models';

export const lists = new SequelizeRepository(ListModel);
export const items = new SequelizeRepository(ItemModel);
export const invitations = new SequelizeRepository(InvitationModel);
export const discussions = new SequelizeRepository(DiscussionModel);
export const messages = new SequelizeRepository(MessageModel);