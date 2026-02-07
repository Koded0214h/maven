# Step 1: Obtain Authentication Token (assuming user test@example.com and password 'password'
      exists)
    2 # Replace with your actual user credentials if different.
    3 # Copy the "token" value from the response.
    4
    5 curl -X POST \
    6   http://localhost:8000/api/auth/login/ \
    7   -H 'Content-Type: application/json' \
    8   -d '{
    9     "email": "test@example.com",
   10     "password": "password"
   11   }'
   12
   13 # Expected output will be a JSON object containing a token and user details.
   14 # Example: {"token": "your_auth_token_string", "user": {"id": 1, "email": "test@example.com",
      ...}}
   15
   16 # Step 2: Send a Chat Query to the AI System using the obtained token
   17 # Replace YOUR_AUTH_TOKEN_HERE with the actual token from Step 1.
   18 # You can modify the "query" to ask any question relevant to Nigerian tax matters.
   19
   20 TOKEN="YOUR_AUTH_TOKEN_HERE"
   21
   22 curl -X POST \
   23   http://localhost:8000/api/ai/chat/ \
   24   -H "Content-Type: application/json" \
   25   -H "Authorization: Token ${TOKEN}" \
   26   -d '{
   27     "query": "What are the latest VAT regulations in Nigeria for digital services?",
   28     "context": {}
   29   }'
   30
   31 # Expected output will be a JSON response from the AI, including the 'response' text,
   32 # 'conversation_id', 'query_id', and 'legal_sources' if applicable.