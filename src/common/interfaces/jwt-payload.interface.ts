export interface JwtPayload {
  sub: string; // userId
  email: string;
  companyId: string;
  roleCode: string;
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}
