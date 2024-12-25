import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';
import * as Types from '@omniflex/infra-sequelize-v6/types';

export type TList = {
  id: string;
  name: string;
  ownerId: string;
  location?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TItem = {
  id: string;
  listId: string;
  content: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TInvitation = {
  id: string;
  listId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
};

export type TDiscussion = {
  id: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TMessage = {
  id: string;
  discussionId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

const listSchema = {
  id: Types.id('UUID'),
  name: Types.requiredString(),
  ownerId: Types.requiredString(),
  location: Types.optionalString(),
  isArchived: Types.requiredBoolean(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const itemSchema = {
  id: Types.id('UUID'),
  listId: Types.requiredString(),
  content: Types.requiredString(),
  isCompleted: Types.requiredBoolean(),
  completedAt: Types.optionalDate(),
  completedBy: Types.optionalString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const invitationSchema = {
  id: Types.id('UUID'),
  listId: Types.requiredString(),
  inviterId: Types.requiredString(),
  inviteeId: Types.requiredString(),
  status: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const discussionSchema = {
  id: Types.id('UUID'),
  itemId: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const messageSchema = {
  id: Types.id('UUID'),
  discussionId: Types.requiredString(),
  senderId: Types.requiredString(),
  content: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const sequelize = Containers
  .appContainerAs<{ sequelize: Sequelize; }>()
  .resolve('sequelize');

export const ListModel = sequelize.define('ToDoList', listSchema);
export const ItemModel = sequelize.define('ToDoItem', itemSchema);
export const InvitationModel = sequelize.define('ToDoInvitation', invitationSchema);
export const DiscussionModel = sequelize.define('ToDoDiscussion', discussionSchema);
export const MessageModel = sequelize.define('ToDoMessage', messageSchema);

ListModel.hasMany(ItemModel, { foreignKey: 'listId' });
ItemModel.belongsTo(ListModel, { foreignKey: 'listId' });

ListModel.hasMany(InvitationModel, { foreignKey: 'listId' });
InvitationModel.belongsTo(ListModel, { foreignKey: 'listId' });

ItemModel.hasOne(DiscussionModel, { foreignKey: 'itemId' });
DiscussionModel.belongsTo(ItemModel, { foreignKey: 'itemId' });

DiscussionModel.hasMany(MessageModel, { foreignKey: 'discussionId' });
MessageModel.belongsTo(DiscussionModel, { foreignKey: 'discussionId' });