import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

const stream = {
  write: (message: string) => logger.http(message.trim()),
};

const skip = () => config.env === 'test';

const format = config.isDev
  ? ':method :url :status :res[content-length] - :response-time ms'
  : (tokens: morgan.TokenIndexer, req: Request, res: Response): string => {
      return JSON.stringify({
        method: tokens['method'](req, res),
        url: tokens['url'](req, res),
        status: Number(tokens['status'](req, res)),
        contentLength: tokens['res'](req, res, 'content-length'),
        responseTimeMs: Number(tokens['response-time'](req, res)),
        requestId: req.id,
      });
    };

export const requestLogger = morgan(format as string, { stream, skip });
