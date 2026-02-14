import type { UploadRepository } from '@/domain/ports/UploadRepository';
import type { Attachment } from '@/domain/types/chat';

export class MockUploadRepository implements UploadRepository {
  async upload(file: File): Promise<Attachment> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      id: `att-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploadedUrl: `demo://upload/${encodeURIComponent(file.name)}`,
    };
    // TODO(BE): Use signed URL and persist file metadata in backend.
  }
}
