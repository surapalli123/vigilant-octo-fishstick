import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def get_chat_response(user_message):
    """Get a response from OpenAI GPT for general queries."""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful GitHub assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        return response.choices[0].message['content']
    except Exception as e:
        return f"Error getting response: {str(e)}"
