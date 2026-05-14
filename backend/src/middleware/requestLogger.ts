import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getLogContext } from '../utils/logContext';
import { config } from '../config';

const stream = {
  write: (message: string) => logger.http(message.trimEnd()),
};

const skip = () => config.env === 'test';

// Dev: single coloured line. Prod: structured JSON piped through winston.
const format = config.isDev
  ? ':method :url :status :res[content-length]b - :response-time ms'
  : (tokens: morgan.TokenIndexer, req: Request, res: Response): string => {
      const ctx = getLogContext();
      const statusCode = Number(tokens['status'](req, res) ?? 0);

      return JSON.stringify({
        type:               'http',
        method:             tokens['method'](req, res),
        path:               req.path,
        url:                tokens['url'](req, res),
        statusCode,
        durationMs:         Number(tokens['response-time'](req, res)),
        contentLengthBytes: tokens['res'](req, res, 'content-length') ?? null,
        ip:                 req.ip ?? req.socket.remoteAddress,
        userAgent:          req.headers['user-agent'] ?? null,
        requestId:          ctx?.requestId ?? req.id,
        userId:             ctx?.userId ?? null,
      });
    };

export const requestLogger = morgan(format as string, { stream, skip });
