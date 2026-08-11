import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre d'exception global : uniformise toutes les erreurs (HttpException Nest,
 * erreurs Prisma, erreurs inattendues) en une réponse JSON cohérente, et les journalise.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, details } = this.resolveException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, (exception as Error)?.stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} : ${JSON.stringify(message)}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveException(exception: unknown): { status: number; message: string | string[]; details?: unknown } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { status: exception.getStatus(), message: response };
      }
      const body = response as { message?: string | string[]; error?: string };
      return {
        status: exception.getStatus(),
        message: body.message ?? exception.message,
      };
    }

    // Erreurs Prisma connues (contrainte unique, enregistrement introuvable...) sans dépendre
    // du type Prisma ici pour rester indépendant de l'ORM au niveau du filtre.
    const prismaCode = (exception as { code?: string })?.code;
    if (typeof prismaCode === 'string' && prismaCode.startsWith('P')) {
      if (prismaCode === 'P2002') {
        return { status: HttpStatus.CONFLICT, message: 'Une ressource avec ces valeurs uniques existe déjà.' };
      }
      if (prismaCode === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, message: 'Ressource introuvable.' };
      }
      return { status: HttpStatus.BAD_REQUEST, message: 'Requête invalide.' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erreur interne du serveur.' };
  }
}
