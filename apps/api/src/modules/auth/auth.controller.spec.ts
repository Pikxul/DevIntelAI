import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { User, Organization, SSOConfiguration } from '../../entities';

import { ConfigService } from '@nestjs/config';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockOrgRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockSsoRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mocked-jwt-token'),
});

describe('AuthController', () => {
  let controller: AuthController;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let orgRepo: ReturnType<typeof mockOrgRepo>;
  let ssoRepo: ReturnType<typeof mockSsoRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: JwtService, useFactory: mockJwtService },
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(Organization), useFactory: mockOrgRepo },
        { provide: getRepositoryToken(SSOConfiguration), useFactory: mockSsoRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockImplementation((key) => key === 'NEXTAUTH_DEV_BYPASS' ? 'true' : 'mock-value') } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    userRepo = module.get(getRepositoryToken(User));
    orgRepo = module.get(getRepositoryToken(Organization));
    ssoRepo = module.get(getRepositoryToken(SSOConfiguration));
    jwtService = module.get(JwtService);
  });

  describe('githubCallback', () => {
    const githubBody = {
      id: 'gh-123',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://github.com/avatar.png',
      githubUsername: 'testuser',
    };

    it('creates a new user when they do not exist', async () => {
      const mockOrg = { id: 'new-org-id', name: 'Test User\'s Organization', slug: 'org-slug' };
      const mockUser = { ...githubBody, id: 'user-uuid', organizationId: 'new-org-id', role: 'admin', provider: 'github' };

      orgRepo.create.mockReturnValue(mockOrg);
      orgRepo.save.mockResolvedValue(mockOrg);
      userRepo.findOne.mockResolvedValue(null); // user doesn't exist
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      const result = await controller.githubCallback(githubBody);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          githubId: 'gh-123',
          provider: 'github',
          organizationId: 'new-org-id',
        }),
      );
      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('user@example.com');
    });

    it('returns existing user and generates JWT without duplicating', async () => {
      const existingUser = {
        id: 'existing-uuid',
        email: 'user@example.com',
        name: 'Test User',
        githubId: 'gh-123',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar.png',
        organizationId: 'existing-org',
        role: 'admin',
      };

      userRepo.findOne.mockResolvedValue(existingUser);
      userRepo.save.mockResolvedValue(existingUser);

      const result = await controller.githubCallback(githubBody);

      expect(userRepo.create).not.toHaveBeenCalled();
      expect(result.token).toBe('mocked-jwt-token');
    });

    it('signs a JWT with correct payload fields', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'user@example.com',
        name: 'Test User',
        organizationId: 'existing-org',
        role: 'admin',
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      await controller.githubCallback(githubBody);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-uuid',
          email: 'user@example.com',
          org: 'existing-org',
          role: 'admin',
        }),
      );
    });
  });

  describe('discoverSso', () => {
    it('returns ssoEnabled: false if domain is not configured', async () => {
      ssoRepo.findOne.mockResolvedValue(null);

      const result = await controller.discoverSso({ email: 'user@enterprise.com' }, { query: {} });

      expect(ssoRepo.findOne).toHaveBeenCalledWith({ where: { domain: 'enterprise.com', enabled: true } });
      expect(result.ssoEnabled).toBe(false);
    });

    it('returns sso details if domain is configured and enabled', async () => {
      const mockConfig = { domain: 'enterprise.com', provider: 'saml', entryPoint: 'https://okta.com/sso', enabled: true };
      ssoRepo.findOne.mockResolvedValue(mockConfig);

      const result = await controller.discoverSso({ email: 'user@enterprise.com' }, { query: {} });

      expect(result.ssoEnabled).toBe(true);
      expect(result.provider).toBe('saml');
      expect(result.redirectUrl).toBe('https://okta.com/sso');
    });
  });

  describe('samlCallback', () => {
    it('successfully processes SAMLResponse XML assertion and registers new user', async () => {
      const mockOrg = { id: 'enterprise-org', name: 'Enterprise Corp', slug: 'enterprise-org' };
      const mockUser = { id: 'sso-user-id', email: 'auditor@enterprise.com', name: 'Auditor Name', organizationId: 'enterprise-org', role: 'admin', provider: 'sso' };

      orgRepo.findOne.mockResolvedValue(null);
      orgRepo.create.mockReturnValue(mockOrg);
      orgRepo.save.mockResolvedValue(mockOrg);

      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      ssoRepo.findOne.mockResolvedValue({ domain: 'enterprise.com', enabled: true });

      const mockSamlAssertion = Buffer.from(
        '<saml:Assertion><saml:NameID>auditor@enterprise.com</saml:NameID><saml:Attribute Name="name"><saml:AttributeValue>Auditor Name</saml:AttributeValue></saml:Attribute><saml:Attribute Name="organizationId"><saml:AttributeValue>enterprise-org</saml:AttributeValue></saml:Attribute></saml:Assertion>'
      ).toString('base64');

      const result = await controller.samlCallback({ SAMLResponse: mockSamlAssertion });

      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('auditor@enterprise.com');
      expect(result.user.organizationId).toBe('enterprise-org');
    });
  });

  describe('oidcCallback', () => {
    it('successfully processes OIDC ID Token and returns user token', async () => {
      const mockOrg = { id: 'enterprise-org', name: 'Enterprise Corp', slug: 'enterprise-org' };
      const mockUser = { id: 'oidc-user-id', email: 'staff@enterprise.com', name: 'Staff Member', organizationId: 'enterprise-org', role: 'admin', provider: 'sso' };

      orgRepo.findOne.mockResolvedValue(mockOrg);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ email: 'staff@enterprise.com', name: 'Staff Member', org: 'enterprise-org' })).toString('base64');
      const signature = 'fake-sig';
      const mockIdToken = `${header}.${payload}.${signature}`;

      const result = await controller.oidcCallback({ id_token: mockIdToken });

      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('staff@enterprise.com');
    });
  });
});
