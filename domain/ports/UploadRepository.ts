import type { Attachment } from '@/domain/types/chat';

export interface UploadRepository {
  upload(file: File): Promise<Attachment>;
  // TODO(BE): Provide upload endpoint and signed URL flow for secure uploads.
}
