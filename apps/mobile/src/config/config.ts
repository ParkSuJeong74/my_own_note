import { useConfig } from '@my_own_note/ui';

export const useMobileConfig = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined. please execute pnpm init-vault');
  }

  return useConfig(url);
};
