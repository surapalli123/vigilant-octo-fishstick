from dotenv import load_dotenv
import os
load_dotenv()

from flask import Flask, request, jsonify, render_template
from app.github_integration import authenticate_github, list_user_repos, list_user_issues, list_user_prs
from app.chatbot import get_chat_response

app = Flask(__name__,
           template_folder='../templates',
           static_folder='../static')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"message": "Invalid or missing JSON in request body."}), 400
    user_message = data.get('message', '')
    token = data.get('token', '') or os.getenv('GITHUB_TOKEN', '')

    if not token:
        return jsonify({"message": "Please provide a GitHub token."}), 401

    github_instance = authenticate_github(token)

    msg = user_message.lower()

    # Handle GitHub-specific queries
    if any(kw in msg for kw in ["list my repositories", "my repos", "my repositories"]):
        repos = list_user_repos(github_instance)
        return jsonify({"message": f"Your repositories: {', '.join(repos)}"})

    elif any(kw in msg for kw in ["list my issues", "my issues", "open issues"]):
        issues = list_user_issues(github_instance)
        return jsonify({"message": f"Your open issues: {', '.join(issues)}"})

    elif any(kw in msg for kw in ["merged pr", "merged pull request", "latest pr", "recent pr"]):
        prs = list_user_prs(github_instance, state="merged")
        if prs:
            return jsonify({"message": f"Your recently merged pull requests:\n" + "\n".join(prs)})
        return jsonify({"message": "No merged pull requests found."})

    elif any(kw in msg for kw in ["list my pull requests", "my pull requests", "my prs", "open prs"]):
        prs = list_user_prs(github_instance)
        return jsonify({"message": f"Your open pull requests: {', '.join(prs)}"})

    # Fallback to AI chatbot
    bot_response = get_chat_response(user_message)
    return jsonify({"message": bot_response})

if __name__ == "__main__":
    app.run(debug=True)
