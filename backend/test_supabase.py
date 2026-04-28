import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Test Supabase connection
def test_supabase_connection():
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        print(f"Testing connection to: {supabase_url}")
        print(f"Key type: {'service_role' if 'service' in supabase_key.lower() else 'anon'}")
        
        client = create_client(supabase_url, supabase_key)
        
        # Test basic connection
        response = client.table('profiles').select('count').execute()
        print("✅ Supabase connection successful!")
        print(f"Profiles count: {response.data}")
        
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

if __name__ == "__main__":
    test_supabase_connection()
