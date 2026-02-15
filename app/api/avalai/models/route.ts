import {AvalaiApiError, getAvalaiModels} from '@/app/api/_lib/avalai';

export const runtime = 'nodejs';

// Self-check examples:
// curl http://localhost:3000/api/avalai/models
// curl -X POST http://localhost:3000/api/chat/complete -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"سلام"}]}'
export async function GET() {
  try {
    const {json} = await getAvalaiModels();
    return Response.json(json, {status: 200});
  } catch (error) {
    if (error instanceof AvalaiApiError) {
      return Response.json(
        {
          error: {
            message: error.message,
            status: error.status,
            details: error.details
          }
        },
        {status: error.status}
      );
    }

    return Response.json(
      {
        error: {
          message: 'خطای ناشناخته در دریافت لیست مدل‌های اوالای.',
          status: 500
        }
      },
      {status: 500}
    );
  }
}
