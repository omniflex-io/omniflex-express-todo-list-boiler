import { Request, Response, NextFunction } from 'express';

const SWAGGER_STATIC_FILES = [
  'favicon-32x32.png',
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
];

export const skipSwaggerStaticLogger = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isSwaggerStaticFile = req.path.startsWith('/swagger/') &&
    SWAGGER_STATIC_FILES.some(file => req.path.endsWith(file));

  if (isSwaggerStaticFile) {
    res.locals._noLogger = true;
  }

  return next();
};