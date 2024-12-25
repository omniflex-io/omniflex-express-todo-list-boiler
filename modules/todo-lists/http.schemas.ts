import Joi from 'joi';
import j2s from 'joi-to-swagger';

import { TList, TItem, TInvitation, TMessage } from './models';
import { modulesSchemas } from '@omniflex/core';

export const createListSchema = Joi.object<TList>({
  name: Joi.string().required(),
  location: Joi.string().optional(),
});

export const createItemSchema = Joi.object<TItem>({
  content: Joi.string().required(),
});

export const updateItemSchema = Joi.object<Pick<TItem, 'content'>>({
  content: Joi.string().required(),
});

export const createInvitationSchema = Joi.object<Pick<TInvitation, 'inviteeId'>>({
  inviteeId: Joi.string().required(),
});

export const updateInvitationSchema = Joi.object<Pick<TInvitation, 'status'>>({
  status: Joi.string().valid('accepted', 'rejected').required(),
});

export const createMessageSchema = Joi.object<Pick<TMessage, 'content'>>({
  content: Joi.string().required(),
});

modulesSchemas.appModule = Object.assign(
  modulesSchemas.appModule || {},
  {
    toDoLists: {
      createList: {
        ...j2s(createListSchema).swagger,
        example: {
          name: 'Family Shopping List',
          location: 'Home',
        },
      },
      createItem: {
        ...j2s(createItemSchema).swagger,
        example: {
          content: 'Buy eggs',
        },
      },
      updateItem: {
        ...j2s(updateItemSchema).swagger,
        example: {
          content: 'Buy fresh eggs',
        },
      },
      createInvitation: {
        ...j2s(createInvitationSchema).swagger,
        example: {
          inviteeId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      updateInvitation: {
        ...j2s(updateInvitationSchema).swagger,
        example: {
          status: 'accepted',
        },
      },
      createMessage: {
        ...j2s(createMessageSchema).swagger,
        example: {
          content: 'I prefer jasmine rice',
        },
      },
    },
  },
);