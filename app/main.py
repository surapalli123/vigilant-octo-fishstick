from flask import Flask, request, jsonify
from app.github_integration import authenticate_github, list_user_repos, list_user_issues, list_user_prs
from app.chatbot import get_chat_response

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to the GitHub Chatbot!"

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"message": "Invalid or missing JSON in request body."}), 400
    user_message = data.get('message', '')
    token = data.get('token', '')

    if not token:
        return jsonify({"message": "Please provide a GitHub token."})

    github_instance = authenticate_github(token)

    # Handle GitHub-specific queries
    if "list my repositories" in user_message.lower():
        repos = list_user_repos(github_instance)
        return jsonify({"message": f"Your repositories: {', '.join(repos)}"})

    elif "list my issues" in user_message.lower():
        issues = list_user_issues(github_instance)
        return jsonify({"message": f"Your open issues: {', '.join(issues)}"})

    elif "list my pull requests" in user_message.lower():
        prs = list_user_prs(github_instance)
        return jsonify({"message": f"Your open pull requests: {', '.join(prs)}"})

    # Fallback to AI chatbot
    bot_response = get_chat_response(user_message)
    return jsonify({"message": bot_response})

if __name__ == "__main__":
    app.run(debug=True)
