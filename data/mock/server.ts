import { setupServer } from 'msw/node';
import { handlers } from '@/data/mock/handlers';

export const server = setupServer(...handlers);
