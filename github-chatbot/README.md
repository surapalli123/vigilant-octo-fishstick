# GitHub Chatbot 🤖

An AI-powered chatbot that integrates with the GitHub API to help users manage their repositories, issues, and pull requests through conversational queries.

## 🚀 Features
- 📁 List your GitHub repositories
- 🐛 View open issues assigned to you
- 🔀 View open pull requests across your repositories
- 🤖 General AI-powered responses using OpenAI GPT

## 🗂️ Project Structure
```
vigilant-octo-fishstick/
├── app/
│   ├── __init__.py           # App initialization
│   ├── main.py               # Flask API routes
│   ├── chatbot.py            # OpenAI GPT integration
│   └── github_integration.py # GitHub API integration
├── templates/
│   └── index.html            # Chatbot UI
├── static/
│   ├── css/styles.css        # Styling
│   └── js/script.js          # Frontend logic
├── requirements.txt          # Dependencies
├── .env.example              # Example environment variables
└── README.md                 # Documentation
```

## 🛠️ Tech Stack
- **Python** - Backend language
- **Flask** - Web framework
- **PyGithub** - GitHub API integration
- **OpenAI GPT** - AI-powered responses
- **HTML/CSS/JS** - Frontend UI

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/surapalli123/vigilant-octo-fishstick
cd vigilant-octo-fishstick
git checkout github-chatbot-feature
```

### 2. Create a Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables
Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key
```

### 5. Run the Application
```bash
python app/main.py
```

### 6. Access the Application
The Flask app runs at `http://127.0.0.1:5000`. By default, the root (`/`) route returns a plain text welcome message from the API. If you have wired up the UI template (see `templates/index.html`) in `app/main.py`, open the corresponding route you configured there in your browser.

## 💬 Example Queries
| Query | Action |
|-------|--------|
| "List my repositories" | Fetches all your GitHub repositories |
| "List my issues" | Shows all open issues assigned to you |
| "List my pull requests" | Shows all open PRs across your repos |
| "What is a pull request?" | AI-powered general response |

## 🔑 Environment Variables
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key for GPT responses |

## 📦 Dependencies
```
flask
PyGithub
openai
python-dotenv
```

## 🤝 Contributing
1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License.