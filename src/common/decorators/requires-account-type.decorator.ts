import { SetMetadata } from '@nestjs/common';

export const REQUIRES_ACCOUNT_TYPE_KEY = 'requiresAccountType';

/** Restreint une route aux entreprises dont Company.accountType est l'une des valeurs données. */
export const RequiresAccountType = (...accountTypes: string[]) => SetMetadata(REQUIRES_ACCOUNT_TYPE_KEY, accountTypes);
