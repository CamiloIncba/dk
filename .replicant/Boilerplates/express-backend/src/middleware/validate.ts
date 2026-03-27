import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Creates a validation middleware using a Zod schema.
 * Validates the specified part of the request (body, query, or params).
 */
export function validate(schema: ZodSchema, source: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      (req as any)[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues: ZodIssue[] = error.issues;
        res.status(400).json({
          error: {
            message: 'Validation error',
            details: issues.map((e: ZodIssue) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(error);
    }
  };
}
