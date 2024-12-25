import { Request, Response, NextFunction } from 'express';
import { invitations } from './todo.repo';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const validateListAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { listId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
    return;
  }

  const invitation = await invitations.findOne({
    listId,
    inviteeId: userId,
    status: 'accepted',
  });

  if (!invitation) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'User does not have access to this list',
    });
    return;
  }

  next();
};

export const validateItemAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { listId } = req.params;
  await validateListAccess(req, res, next);
}; 