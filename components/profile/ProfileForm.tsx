'use client';

import {useEffect, useMemo, useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Loader2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {getProfile, isAbortError, ServiceError, updateProfile} from '@/lib/services/auth-service';
import type {ProfileUpdateDTO} from '@/lib/types/auth';

type ProfileFormProps = {
  locale: string;
};

type FieldName = keyof ProfileUpdateDTO;

const requiredFields: FieldName[] = [
  'firstName',
  'lastName',
  'faculty',
  'major',
  'degreeLevel',
  'studentId'
];

function getInitialValues(profile?: Partial<ProfileUpdateDTO>): ProfileUpdateDTO {
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    faculty: profile?.faculty ?? '',
    major: profile?.major ?? '',
    degreeLevel: profile?.degreeLevel ?? '',
    studentId: profile?.studentId ?? ''
  };
}

function trimValues(values: ProfileUpdateDTO): ProfileUpdateDTO {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    faculty: values.faculty.trim(),
    major: values.major.trim(),
    degreeLevel: values.degreeLevel.trim(),
    studentId: values.studentId.trim()
  };
}

export function ProfileForm({locale}: ProfileFormProps) {
  const router = useRouter();
  const t = useTranslations('profile');
  const [values, setValues] = useState<ProfileUpdateDTO>(getInitialValues());
  const [formError, setFormError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['auth', 'profile', 'completion'],
    queryFn: ({signal}) => getProfile({signal})
  });

  const profile = profileQuery.data?.user;

  useEffect(() => {
    if (profile) {
      setValues(getInitialValues(profile));
    }
  }, [profile]);

  const missingFields = useMemo(
    () => requiredFields.filter((field) => !values[field]?.trim()),
    [values]
  );

  const mutation = useMutation({
    mutationFn: (input: ProfileUpdateDTO) => updateProfile(input),
    onSuccess: () => {
      toast.success(t('saveSuccess'));
      router.replace(`/${locale}/chat`);
    },
    onError: (error) => {
      if (isAbortError(error)) return;
      const message = error instanceof ServiceError ? error.message : t('saveError');
      setFormError(message);
      toast.error(message);
    }
  });

  const setFieldValue = (field: FieldName, value: string) => {
    setValues((current) => ({...current, [field]: value}));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = trimValues(values);
    const missing = requiredFields.filter((field) => !trimmed[field]);

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
      profileQuery.error instanceof ServiceError ? profileQuery.error.message : t('loadError');

    return (
      <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-card">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => profileQuery.refetch()}>
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-card">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {requiredFields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{t(`fields.${field}`)}</Label>
              <Input
                id={field}
                value={values[field]}
                onChange={(event) => setFieldValue(field, event.target.value)}
                aria-invalid={missingFields.includes(field)}
                dir={field === 'studentId' ? 'ltr' : undefined}
              />
            </div>
          ))}

          {formError ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
