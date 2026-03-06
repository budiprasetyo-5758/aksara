import asyncio
import traceback
from services.supabase_client import get_supabase_client
from routers.documents import process_document

async def test():
    client = get_supabase_client()
    res = client.table('documents').select('*').eq('status', 'failed').order('upload_date', desc=True).limit(1).execute()
    if not res.data:
        print('No failed documents found.')
        return
    doc = res.data[0]
    print(f"Testing document: {doc['file_name']}")
    
    file_bytes = client.storage.from_('documents').download(doc['storage_path'])
    print("File downloaded, starting process_document...")
    
    try:
        await process_document(doc['id'], file_bytes, doc['file_type'])
        print('Process complete. Check status in DB.')
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
