'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getProfile,
  isAbortError,
  logout,
  ServiceError,
  updateProfile
} from '@/lib/services/auth-service';
import type {
  AuthRoleDTO,
  AuthUserDTO,
  ProfileUpdateDTO
} from '@/lib/types/auth';

type ProfileFormProps = {
  locale: string;
};

type EditableFieldName = keyof ProfileUpdateDTO;
type ReadOnlyFieldName =
  | 'email'
  | 'studentId'
  | 'personnelId'
  | 'faculty'
  | 'major'
  | 'degreeLevel'
  | 'department'
  | 'academicRank'
  | 'jobTitle'
  | 'role';

const editableFields: EditableFieldName[] = ['firstName', 'lastName'];
const roleReadOnlyFields: Record<AuthRoleDTO, ReadOnlyFieldName[]> = {
  student: ['email', 'studentId', 'faculty', 'major', 'degreeLevel'],
  professor: ['email', 'personnelId', 'faculty', 'academicRank'],
  staff: ['email', 'personnelId', 'department', 'jobTitle'],
  admin: ['email', 'role']
};

function getInitialValues(
  profile?: Partial<ProfileUpdateDTO>
): ProfileUpdateDTO {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? ''
  };
}

function trimValues(values: ProfileUpdateDTO): ProfileUpdateDTO {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim()
  };
}

function getReadOnlyValue(
  profile: AuthUserDTO,
  field: ReadOnlyFieldName,
  t: ReturnType<typeof useTranslations>
) {
  if (field === 'role') {
    return profile.role ? t(`roles.${profile.role}`) : '';
  }

  return profile[field] ?? '';
}

export function ProfileForm({ locale }: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations('profile');
  const [values, setValues] = useState<ProfileUpdateDTO>(getInitialValues());
  const [formError, setFormError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<EditableFieldName>>(
    new Set()
  );
  const [submitted, setSubmitted] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['auth', 'profile', 'completion'],
    queryFn: ({ signal }) => getProfile({ signal })
  });

  const profile = profileQuery.data?.user;
  const role = profile?.role ?? 'admin';
  const readOnlyFields = useMemo(() => roleReadOnlyFields[role], [role]);

  useEffect(() => {
    if (profile) {
      setValues(getInitialValues(profile));
    }
  }, [profile]);

  const missingFields = useMemo(
    () => editableFields.filter((field) => !values[field]?.trim()),
    [values]
  );

  const mutation = useMutation({
    mutationFn: (input: ProfileUpdateDTO) => updateProfile(input),
    onSuccess: (result) => {
      const completed = result.user.isProfileCompleted;

      if (completed === false) {
        const message = t('stillIncomplete');
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(t('saveSuccess'));
      router.replace(`/${locale}/chat`);
    },
    onError: (error) => {
      if (isAbortError(error)) return;
      const message =
        error instanceof ServiceError ? error.message : t('saveError');
      setFormError(message);
      toast.error(message);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => router.replace(`/${locale}/auth?mode=login`)
  });

  const setFieldValue = (field: EditableFieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = trimValues(values);
    const missing = editableFields.filter((field) => !trimmed[field]);

    setSubmitted(true);
    setFormError(null);

    if (missing.length > 0) {
      const message = t('missingRequired');
      setFormError(message);
      toast.error(message);
      return;
    }

    mutation.mutate(trimmed);
  };

  if (profileQuery.isLoading) {
    return (
      <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-card">
        <CardContent className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError) {
    const message =
      profileQuery.error instanceof ServiceError
        ? profileQuery.error.message
        : t('loadError');
    const isAuthError =
      profileQuery.error instanceof ServiceError &&
      [401, 403].includes(profileQuery.error.status);

    return (
      <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-card">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          {!isAuthError ? (
            <Button type="button" onClick={() => profileQuery.refetch()}>
              {t('retry')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(`/${locale}/auth?mode=login`)}
          >
            {t('backToLogin')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl border-border/70 bg-card/95 shadow-card">
      <CardHeader className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
          <p className="font-semibold">{t('bannerTitle')}</p>
          <p className="mt-1 text-primary/80">{t('bannerDescription')}</p>
        </div>
        <div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription className="mt-2">{t('description')}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="inline-flex w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
            {t('roleLabel')}: {t(`roles.${role}`)}
          </p>
          <p>{t('editableNotice')}</p>
          <p>{t('readOnlyNotice')}</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              {t('editableSectionTitle')}
            </h2>
            {editableFields.map((field) => {
              const isMissing = missingFields.includes(field);
              const showFieldError =
                isMissing && (submitted || touchedFields.has(field));

              return (
                <div key={field} className="space-y-2">
                  <Label
                    htmlFor={field}
                    className={showFieldError ? 'text-destructive' : undefined}
                  >
                    {t(`fields.${field}`)} *
                  </Label>
                  <Input
                    id={field}
                    value={values[field]}
                    onBlur={() =>
                      setTouchedFields((current) => new Set(current).add(field))
                    }
                    onChange={(event) =>
                      setFieldValue(field, event.target.value)
                    }
                    aria-invalid={showFieldError}
                    aria-describedby={
                      showFieldError ? `${field}-error` : undefined
                    }
                    className={
                      showFieldError
                        ? 'border-destructive focus-visible:ring-destructive/40'
                        : undefined
                    }
                  />
                  {showFieldError ? (
                    <p
                      id={`${field}-error`}
                      className="text-xs text-destructive"
                    >
                      {t('fieldRequired', { field: t(`fields.${field}`) })}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {profile ? (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t('readOnlySectionTitle')}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('incompleteHelp')}
                </p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {readOnlyFields.map((field) => (
                  <div
                    key={field}
                    className="rounded-xl border border-border bg-background/70 p-3"
                  >
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t(`fields.${field}`)}
                    </dt>
                    <dd
                      className="mt-1 break-words text-sm text-foreground"
                      dir={
                        field === 'email' ||
                        field === 'studentId' ||
                        field === 'personnelId'
                          ? 'ltr'
                          : undefined
                      }
                    >
                      {getReadOnlyValue(profile, field, t) || t('notProvided')}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {formError ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending || mutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {t('logout')}
            </Button>
            <Button
              type="submit"
              className="sm:min-w-44"
              disabled={mutation.isPending || logoutMutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
