import { errors, logger } from '@omniflex/core';

import { jwtProvider } from "@/utils/jwt";
import { ExpressUtils } from '@omniflex/infra-express';

type ServerType = 'exposed' | 'staff' | 'developer';

const middleware = ({
  mode = false,
}: {
  mode?: boolean | ServerType;
} = {}) => {
  const optional = !mode;

  return ExpressUtils.tryAction(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!optional && !token) {
      throw errors.unauthorized();
    }

    if (!token) return;

    // -- although the 'ExpressUtils.tryAction' will auto catch and handle the error,
    // -- we still need to try-catch here to make the error be unauthorized
    try {
      const {
        __type,
        __identifier,
        ...user
      } = (await jwtProvider.verify(token)) ?? {};

      if (__type !== "access-token") {
        throw errors.unauthorized();
      }

      res.locals.user = user;
      res.locals.accessToken = token;

      if (typeof mode != "boolean") {
        if (mode != user.__appType) {
          throw errors.forbidden();
        }
      }
    } catch (error: any) {
      logger.error("Auth", { error });
      throw errors.unauthorized();
    }
  });
};

export const auth = {
  optional: middleware({ mode: false }),
  requireAny: middleware({ mode: true }),

  requireStaff: middleware({ mode: "staff" }),
  requireExposed: middleware({ mode: "exposed" }),
  requireDeveloper: middleware({ mode: "developer" }),
};
