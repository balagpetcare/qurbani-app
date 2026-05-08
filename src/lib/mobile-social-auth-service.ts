import { SocialAuthProvider, UserRole } from "@/generated/prisma/enums";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/prisma";
import {
  SOCIAL_ACCOUNT_CONFLICT_BN,
  SOCIAL_EMAIL_IN_USE_BN,
  SOCIAL_EMAIL_REQUIRED_BN,
  SOCIAL_GENERIC_ERROR_BN,
  SOCIAL_INVALID_TOKEN_BN,
  SOCIAL_NOT_CONFIGURED_BN,
  SOCIAL_PHONE_NOT_VERIFIED_BN,
  SOCIAL_PROVIDER_ALREADY_LINKED_BN,
  SOCIAL_PROVIDER_TYPE_CONFLICT_BN,
} from "@/lib/mobile-social-auth-messages";
import type { VerifiedSocialProfile } from "@/lib/social-oidc-verify";
import {
  isAppleOAuthConfigured,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
  verifyAppleIdToken,
  verifyFacebookUserAccessToken,
  verifyGoogleIdToken,
} from "@/lib/social-oidc-verify";

function err(
  status: number,
  code: string,
  messageBn: string,
): { ok: false; status: number; code: string; messageBn: string } {
  return { ok: false, status, code, messageBn };
}

async function verifyProfile(
  provider: SocialAuthProvider,
  idToken: string | null | undefined,
  accessToken: string | null | undefined,
): Promise<VerifiedSocialProfile | null> {
  switch (provider) {
    case SocialAuthProvider.GOOGLE:
      if (!idToken?.trim()) return null;
      return verifyGoogleIdToken(idToken.trim());
    case SocialAuthProvider.FACEBOOK:
      if (!accessToken?.trim()) return null;
      return verifyFacebookUserAccessToken(accessToken.trim());
    case SocialAuthProvider.APPLE:
      if (!idToken?.trim()) return null;
      return verifyAppleIdToken(idToken.trim());
    default:
      return null;
  }
}

function isProviderConfigured(provider: SocialAuthProvider): boolean {
  switch (provider) {
    case SocialAuthProvider.GOOGLE:
      return isGoogleOAuthConfigured();
    case SocialAuthProvider.FACEBOOK:
      return isFacebookOAuthConfigured();
    case SocialAuthProvider.APPLE:
      return isAppleOAuthConfigured();
    default:
      return false;
  }
}

export async function exchangeCustomerSocialLogin(params: {
  provider: SocialAuthProvider;
  idToken?: string | null;
  accessToken?: string | null;
}): Promise<
  { ok: true; userId: number } | { ok: false; status: number; code: string; messageBn: string }
> {
  const { provider, idToken, accessToken } = params;

  if (!isProviderConfigured(provider)) {
    return err(501, "NOT_CONFIGURED", SOCIAL_NOT_CONFIGURED_BN);
  }

  let profile: VerifiedSocialProfile | null;
  try {
    profile = await verifyProfile(provider, idToken, accessToken);
  } catch {
    return err(401, "INVALID_TOKEN", SOCIAL_INVALID_TOKEN_BN);
  }

  if (!profile) {
    return err(401, "INVALID_TOKEN", SOCIAL_INVALID_TOKEN_BN);
  }

  if (!profile.email || !profile.emailVerified) {
    return err(400, "EMAIL_REQUIRED", SOCIAL_EMAIL_REQUIRED_BN);
  }

  const email = profile.email;
  const displayName = profile.name?.trim() || "গ্রাহক";

  const existingLink = await prisma.customerSocialLink.findUnique({
    where: {
      provider_providerSubject: {
        provider,
        providerSubject: profile.subject,
      },
    },
    select: { userId: true },
  });

  if (existingLink) {
    const u = await prisma.user.findFirst({
      where: { id: existingLink.userId, role: UserRole.CUSTOMER, isActive: true },
      select: { id: true },
    });
    if (!u) {
      return err(403, "ACCOUNT_INACTIVE", SOCIAL_GENERIC_ERROR_BN);
    }
    return { ok: true, userId: u.id };
  }

  const emailUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      isActive: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  if (emailUser && emailUser.role !== UserRole.CUSTOMER) {
    return err(409, "EMAIL_IN_USE_NON_CUSTOMER", SOCIAL_EMAIL_IN_USE_BN);
  }

  if (emailUser && emailUser.role === UserRole.CUSTOMER) {
    if (!emailUser.isActive) {
      return err(403, "ACCOUNT_INACTIVE", SOCIAL_GENERIC_ERROR_BN);
    }
    if (emailUser.phone && !emailUser.phoneVerifiedAt) {
      return err(409, "PHONE_NOT_VERIFIED", SOCIAL_PHONE_NOT_VERIFIED_BN);
    }

    const sameProvider = await prisma.customerSocialLink.findUnique({
      where: {
        userId_provider: { userId: emailUser.id, provider },
      },
      select: { providerSubject: true },
    });
    if (sameProvider && sameProvider.providerSubject !== profile.subject) {
      return err(409, "PROVIDER_TYPE_CONFLICT", SOCIAL_PROVIDER_TYPE_CONFLICT_BN);
    }

    const subjectTakenElsewhere = await prisma.customerSocialLink.findFirst({
      where: {
        provider,
        providerSubject: profile.subject,
        NOT: { userId: emailUser.id },
      },
      select: { id: true },
    });
    if (subjectTakenElsewhere) {
      return err(409, "PROVIDER_ALREADY_LINKED", SOCIAL_PROVIDER_ALREADY_LINKED_BN);
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerSocialLink.upsert({
        where: {
          userId_provider: { userId: emailUser.id, provider },
        },
        create: {
          userId: emailUser.id,
          provider,
          providerSubject: profile.subject,
        },
        update: {
          providerSubject: profile.subject,
        },
      });
    });

    return { ok: true, userId: emailUser.id };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: displayName,
          email,
          role: UserRole.CUSTOMER,
        },
        select: { id: true },
      });
      await tx.customerSocialLink.create({
        data: {
          userId: user.id,
          provider,
          providerSubject: profile.subject,
        },
      });
      return user.id;
    });
    return { ok: true, userId: created };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return err(409, "ACCOUNT_CONFLICT", SOCIAL_ACCOUNT_CONFLICT_BN);
    }
    console.error("exchangeCustomerSocialLogin create", e);
    return err(500, "SERVER_ERROR", SOCIAL_GENERIC_ERROR_BN);
  }
}
