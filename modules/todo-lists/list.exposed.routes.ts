// #swagger.file.tags = ['Todo Lists']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TList } from './models';
import { lists, invitations } from './todo.repo';
import { createListSchema } from './http.schemas';
import {
  validateListAccess,
  validateListOwner,
} from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class ListController extends BaseEntitiesController<TList> {
  constructor(req, res, next) {
    super(req, res, next, lists, { idParamName: 'listId' });
  }

  static create = getControllerCreator(ListController);

  async tryCreate() {
    return super.tryCreate(
      {
        isArchived: false,
        ownerId: this.user.id,
      },
      {
        respondOne: async (list) => {
          await invitations.create({
            listId: list.id,
            inviterId: this.user.id,
            inviteeId: this.user.id,
            status: 'accepted',
            approved: true,
          });

          this.respondOne(list);
        },
      },
    );
  }

  async tryList() {
    return this.tryAction(async () => {
      const [ownedLists, invitedLists] = await Promise.all([
        lists.find({
          isArchived: false,
          ownerId: this.user.id,
        }),
        invitations.find({
          status: 'accepted',
          inviteeId: this.user.id,
        }).then(invites =>
          invites.length > 0 ?
            lists.find({
              isArchived: false,
              id: { $in: invites.map(invite => invite.listId) },
            }) : [],
        ),
      ]);

      const uniqueListsMap = new Map();
      [...ownedLists, ...invitedLists].forEach(list => {
        if (!uniqueListsMap.has(list.id)) {
          uniqueListsMap.set(list.id, list);
        }
      });

      this.respondMany(Array.from(uniqueListsMap.values()));
    });
  }

  async tryListArchived() {
    return this.tryAction(async () => {
      const [ownedLists, invitedLists] = await Promise.all([
        lists.find({
          isArchived: true,
          ownerId: this.user.id,
        }),
        invitations.find({
          status: 'accepted',
          inviteeId: this.user.id,
        }).then(invites =>
          invites.length > 0 ?
            lists.find({
              isArchived: true,
              id: { $in: invites.map(invite => invite.listId) },
            }) : [],
        ),
      ]);

      const uniqueListsMap = new Map();
      [...ownedLists, ...invitedLists].forEach(list => {
        if (!uniqueListsMap.has(list.id)) {
          uniqueListsMap.set(list.id, list);
        }
      });

      this.respondMany(Array.from(uniqueListsMap.values()));
    });
  }

  tryArchive() {
    return super.tryUpdate({ isArchived: true });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('list'));
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .post('/',
    // #swagger.summary = 'Create a new list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.requestBody = { "$ref": "#/components/schemas/toDoLists/createList" }

    auth.requireExposed,
    tryValidateBody(createListSchema),
    ListController.create(controller => controller.tryCreate()))

  .get('/',
    // #swagger.summary = 'List all non-archived lists'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    ListController.create(controller => controller.tryList()))

  .get('/archived',
    // #swagger.summary = 'List all archived lists'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    ListController.create(controller => controller.tryListArchived()))

  .get('/:listId',
    // #swagger.summary = 'Get a list by ID'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the list' }

    auth.requireExposed,
    validateListAccess,
    ListController.create(controller => controller.tryGetOne()))

  .patch('/:listId/archive',
    // #swagger.summary = 'Archive a list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the list' }

    auth.requireExposed,
    validateListOwner,
    ListController.create(controller => controller.tryArchive()));