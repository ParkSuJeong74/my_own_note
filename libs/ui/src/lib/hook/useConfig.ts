import { PublicConfigInterface } from '@my_own_note/core';
import { useEffect, useState } from 'react';

export const useConfig = (apiUrl: string) => {
  const [config, setConfig] = useState<PublicConfigInterface | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/config`)
      .then(res => res.json())
      .then(setConfig);
  }, [apiUrl]);

  return config;
};
