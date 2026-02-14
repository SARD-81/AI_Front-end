import { setupWorker } from 'msw/browser';
import { handlers } from '@/data/mock/handlers';

export const worker = setupWorker(...handlers);
